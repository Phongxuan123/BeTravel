import Job from "../models/Job.js";
import { JobStatus } from "../core/constants.js";

// Them mot job vao hang doi. payload la du lieu handler can (vi du articleId).
export const enqueueJob = async (name, payload = {}) => Job.create({ name, payload });

/*
 * Worker skeleton: chay dinh ky, LOCK dung findOneAndUpdate (atomic) de nhieu
 * tien trinh backend (neu scale ngang) khong cung xu ly mot job. Handler that
 * (goi embedding, xoa chunk...) lam o B4 -- gio chi log ra de chung minh
 * luong hoat dong dung.
 */
const LOCK_STALE_MS = 60_000;
const DEFAULT_POLL_INTERVAL_MS = 3000;

// Dang ky handler theo ten job -- B4 se them 'reindex_article'/'purge_chunks' that.
const handlers = new Map();

export const registerJobHandler = (name, handler) => {
  handlers.set(name, handler);
};

const claimNextJob = async () => {
  const staleBefore = new Date(Date.now() - LOCK_STALE_MS);

  return Job.findOneAndUpdate(
    {
      status: JobStatus.PENDING,
      runAt: { $lte: new Date() },
      $or: [{ lockedAt: null }, { lockedAt: { $lt: staleBefore } }],
    },
    { $set: { status: JobStatus.RUNNING, lockedAt: new Date() } },
    { sort: { runAt: 1 }, returnDocument: "after" },
  );
};

const runJob = async (job) => {
  const handler = handlers.get(job.name);

  if (!handler) {
    // Chua co handler that (B4) -- danh dau done de khong ket qua doi vo han,
    // nhung ghi ro trong log de khong bi lang quen.
    console.log(`[job] '${job.name}' chua co handler, bo qua (se lam o B4).`, job.payload);
    job.status = JobStatus.DONE;
    await job.save();
    return;
  }

  try {
    await handler(job.payload);
    job.status = JobStatus.DONE;
    await job.save();
  } catch (error) {
    job.attempts += 1;
    job.lastError = String(error?.message ?? error);

    const hasAttemptsLeft = job.attempts < job.maxAttempts;
    job.status = hasAttemptsLeft ? JobStatus.PENDING : JobStatus.FAILED;
    job.lockedAt = null;

    await job.save();
  }
};

let pollTimer = null;

export const startJobWorker = (intervalMs = DEFAULT_POLL_INTERVAL_MS) => {
  if (pollTimer) return;

  pollTimer = setInterval(async () => {
    try {
      const job = await claimNextJob();
      if (job) await runJob(job);
    } catch (error) {
      console.error("[job] loi vong lap worker:", error);
    }
  }, intervalMs);
};

export const stopJobWorker = () => {
  clearInterval(pollTimer);
  pollTimer = null;
};
