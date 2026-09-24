import mongoose from "mongoose";

import { JobStatus } from "../core/constants.js";

/*
 * Hang doi job bang chinh MongoDB -- khong can Redis (CLAUDE.md B.11). Worker
 * chay setInterval, lock bang findOneAndUpdate({status:'pending'}) de nhieu
 * instance backend (neu co) khong gianh cung mot job.
 */
const jobSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // xem core/constants.js JobName
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },

    status: {
      type: String,
      enum: Object.values(JobStatus),
      default: JobStatus.PENDING,
      index: true,
    },

    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },

    lastError: { type: String, default: "" },
    lockToken: { type: String, default: null },
    lockedAt: { type: Date, default: null },
    runAt: { type: Date, default: Date.now }, // cho phep lui lich retry
  },
  { timestamps: true },
);

jobSchema.index({ status: 1, runAt: 1 });

export default mongoose.model("Job", jobSchema);
