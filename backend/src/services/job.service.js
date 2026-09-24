import crypto from "node:crypto";
import Job from "../models/Job.js";
import { JobStatus } from "../core/constants.js";

export const enqueueJob = async (name, payload = {}) => Job.create({ name, payload });
const LOCK_STALE_MS = 60_000;
const DEFAULT_POLL_INTERVAL_MS = 3000;
const handlers = new Map();
export const registerJobHandler = (name, handler) => handlers.set(name, handler);

async function claimNextJob() {
  const expired = {
    status: JobStatus.RUNNING,
    lockedAt: { $lt: new Date(Date.now() - LOCK_STALE_MS) },
  };
  // Job bị gián đoạn nhiều lần cũng phải dừng ở maxAttempts, không retry vô hạn.
  await Job.updateMany(
    { ...expired, $expr: { $gte: ["$attempts", "$maxAttempts"] } },
    {
      $set: {
        status: JobStatus.FAILED,
        lockedAt: null,
        lockToken: null,
        lastError: "Worker bị gián đoạn quá số lần cho phép",
      },
    },
  );
  return Job.findOneAndUpdate(
    {
      $or: [{ status: JobStatus.PENDING, runAt: { $lte: new Date() } }, expired],
      $expr: { $lt: ["$attempts", "$maxAttempts"] },
    },
    {
      $set: { status: JobStatus.RUNNING, lockedAt: new Date(), lockToken: crypto.randomUUID() },
      $inc: { attempts: 1 },
    },
    { sort: { runAt: 1 }, returnDocument: "after" },
  );
}

// Lease có heartbeat và mã sở hữu: worker cũ không được ghi kết quả đè
// worker mới sau khi lease hết hạn. Handler RAG vẫn phải idempotent.
export async function runNextJob() {
  const job = await claimNextJob();
  if (!job) return false;
  const ownership = { _id: job._id, status: JobStatus.RUNNING, lockToken: job.lockToken };
  const heartbeat = setInterval(() => {
    Job.updateOne(ownership, { $set: { lockedAt: new Date() } }).catch((error) =>
      console.error("[job] Không gia hạn lease:", error.message),
    );
  }, LOCK_STALE_MS / 3);
  try {
    const handler = handlers.get(job.name);
    if (!handler) throw new Error(`Chưa đăng ký handler: ${job.name}`);
    await handler(job.payload);
    await Job.updateOne(ownership, {
      $set: { status: JobStatus.DONE, lockedAt: null, lockToken: null, lastError: "" },
    });
  } catch (error) {
    const status = job.attempts < job.maxAttempts ? JobStatus.PENDING : JobStatus.FAILED;
    await Job.updateOne(ownership, {
      $set: {
        status,
        lockedAt: null,
        lockToken: null,
        lastError: String(error?.message ?? error),
        runAt: new Date(Date.now() + DEFAULT_POLL_INTERVAL_MS * job.attempts),
      },
    });
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}

let pollTimer = null;
let polling = false;
export const startJobWorker = (intervalMs = DEFAULT_POLL_INTERVAL_MS) => {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    if (polling) return;
    polling = true;
    try {
      await runNextJob();
    } catch (error) {
      console.error("[job] Lỗi vòng worker:", error);
    } finally {
      polling = false;
    }
  }, intervalMs);
};
export const stopJobWorker = () => {
  clearInterval(pollTimer);
  pollTimer = null;
};
