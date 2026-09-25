import mongoose from "mongoose";

/*
 * Tien do tick checklist cua TUNG user cho TUNG incident -- tach bang rieng
 * (khong nhung vao User) vi so luong ban ghi tang theo user x incident, va
 * khong lien quan gi den xac thuc/ho so co ban cua User.
 */
const userIncidentProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    incidentId: { type: mongoose.Schema.Types.ObjectId, ref: "IncidentType", required: true },
    // Danh sach step.order da tick -- doi chieu voi IncidentType.steps khi doc.
    completedSteps: { type: [Number], default: [] },
  },
  { timestamps: true },
);

userIncidentProgressSchema.index({ userId: 1, incidentId: 1 }, { unique: true });

export default mongoose.model("UserIncidentProgress", userIncidentProgressSchema);
