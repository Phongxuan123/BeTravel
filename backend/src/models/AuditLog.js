import mongoose from "mongoose";

/*
 * Nhat ky moi thao tac ghi (POST/PATCH/DELETE) tren /api/admin/* -- ghi boi
 * middleware dung chung (xem middleware/audit.middleware.js), khong phai tung
 * controller tu ghi, de khong bao gio bi bo sot.
 * TTL 180 ngay: du de dieu tra su co, khong phinh to database mai mai.
 */
const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorUsername: { type: String, default: "" },

    action: { type: String, required: true }, // vi du 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE'
    entityType: { type: String, required: true }, // vi du 'LegalArticle', 'Country'
    entityId: { type: String, required: true },

    diff: {
      before: { type: mongoose.Schema.Types.Mixed, default: null },
      after: { type: mongoose.Schema.Types.Mixed, default: null },
    },

    ip: { type: String, default: "" },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ actorId: 1 });
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("AuditLog", auditLogSchema);
