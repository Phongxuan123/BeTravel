import mongoose from "mongoose";

// Bộ đếm global theo ngày UTC. _id duy nhất chống cấp vượt quota đồng thời.
const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model("AiQuota", schema);
