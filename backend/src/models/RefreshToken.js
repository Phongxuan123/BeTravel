import mongoose from "mongoose";

/*
 * Refresh token được lưu dưới dạng HASH, không bao giờ lưu bản thô.
 * `family` nhóm mọi token sinh ra từ một lần đăng nhập: phát hiện tái sử dụng
 * thì thu hồi cả family, tức là đá nguyên phiên đó ra khỏi hệ thống.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    family: {
      type: String,
      required: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    // Đã bị thay bằng token mới (xoay vòng) hoặc bị thu hồi khi đăng xuất.
    revokedAt: {
      type: Date,
      default: null,
    },

    revokedReason: {
      type: String,
      enum: ["rotated", "logout", "reuse_detected", null],
      default: null,
    },

    // Hash của token thay thế -- dùng cho cửa sổ ân hạn khi hai request refresh đua nhau.
    replacedByHash: {
      type: String,
      default: null,
    },

    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("RefreshToken", refreshTokenSchema);
