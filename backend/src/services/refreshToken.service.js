import crypto from "crypto";

import { env } from "../core/env.js";
import { AppError, ErrorCode } from "../core/errors.js";
import RefreshToken from "../models/RefreshToken.js";
import User from "../models/User.js";
import { generateAccessToken, generateRefreshToken, hashToken } from "../utils/token.js";
import { serializeUser } from "../core/serializers.js";

/*
 * BẬT XOAY VÒNG REFRESH TOKEN.
 *
 * Comment trước đây nói không xoay vòng để tránh race của React StrictMode
 * (double-render gọi /refresh hai lần). Client của Be.Travel là React Native --
 * không có StrictMode double-render như React DOM, nên lý do đó không còn đúng.
 * Bỏ xoay vòng đồng nghĩa một refresh token bị lộ dùng được suốt 30 ngày.
 *
 * Race THẬT (hai request song song cùng dùng một token) được xử lý bằng CỬA SỔ
 * ÂN HẠN thay vì bằng cách hy sinh xoay vòng: token vừa bị thay, nếu còn trong
 * REFRESH_ROTATION_GRACE_SECONDS giây, vẫn được chấp nhận và trả về token đang
 * hiệu lực. Ngoài cửa sổ đó thì coi là TÁI SỬ DỤNG -- dấu hiệu token bị đánh cắp
 * -- và thu hồi toàn bộ family.
 */
const GRACE_MS = env.REFRESH_ROTATION_GRACE_SECONDS * 1000;

const createTokenFamily = () => crypto.randomUUID();

const buildSession = (user, rawRefreshToken, expiresAt) => ({
  accessToken: generateAccessToken(user),
  refreshToken: rawRefreshToken,
  expiresAt,
  expiresIn: env.JWT_ACCESS_EXPIRES,
  user: serializeUser(user),
});

/*
 * Cấp một refresh token mới. Không truyền `family` --> đây là phiên đăng nhập
 * mới nên sinh family mới.
 */
export const issueRefreshToken = async ({ user, ttlDays, family, context = {} }) => {
  const rawRefreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(rawRefreshToken),
    family: family ?? createTokenFamily(),
    expiresAt,
    userAgent: context.userAgent ?? "",
    ip: context.ip ?? "",
  });

  return { rawRefreshToken, expiresAt };
};

const revokeFamily = async (family, reason) => {
  await RefreshToken.updateMany(
    { family, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
};

// Token đã bị thu hồi: hoặc là race lành tính trong ân hạn, hoặc là token bị đánh cắp.
const resolveRevokedToken = async (storedToken) => {
  const isWithinGracePeriod = Date.now() - storedToken.revokedAt.getTime() < GRACE_MS;

  if (isWithinGracePeriod && storedToken.replacedByHash) {
    const currentToken = await RefreshToken.findOne({
      tokenHash: storedToken.replacedByHash,
      revokedAt: null,
    });

    if (currentToken) {
      return currentToken;
    }
  }

  await revokeFamily(storedToken.family, "reuse_detected");

  throw new AppError(ErrorCode.UNAUTHORIZED, "Phiên đã bị thu hồi vì lý do bảo mật");
};

export const refreshAccessToken = async (rawRefreshToken, context = {}) => {
  if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
    throw new AppError(ErrorCode.UNAUTHORIZED, "Không tìm thấy refresh token");
  }

  const storedToken = await RefreshToken.findOne({ tokenHash: hashToken(rawRefreshToken) });

  if (!storedToken) {
    throw new AppError(ErrorCode.UNAUTHORIZED, "Refresh token không hợp lệ");
  }

  /*
   * Trong cửa sổ ân hạn ta trả lại token đang hiệu lực NHƯNG không có bản thô
   * của nó (chỉ lưu hash). Client giữ nguyên refresh token nó đang có; access
   * token mới là đủ để đi tiếp.
   */
  let isGraceReplay = false;
  let activeToken = storedToken;

  if (storedToken.revokedAt) {
    activeToken = await resolveRevokedToken(storedToken);
    isGraceReplay = true;
  }

  if (activeToken.expiresAt.getTime() <= Date.now()) {
    await RefreshToken.deleteOne({ _id: activeToken._id });
    throw new AppError(
      ErrorCode.UNAUTHORIZED,
      "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    );
  }

  const user = await User.findById(activeToken.userId);

  if (!user) {
    await revokeFamily(activeToken.family, "reuse_detected");
    throw new AppError(ErrorCode.UNAUTHORIZED, "Tài khoản không tồn tại");
  }

  if (!user.isActive) {
    await revokeFamily(activeToken.family, "logout");
    throw new AppError(ErrorCode.FORBIDDEN, "Tài khoản đã bị vô hiệu hóa");
  }

  if (isGraceReplay) {
    return { ...buildSession(user, null, activeToken.expiresAt), rotated: false };
  }

  // Xoay vòng: token mới cùng family, token cũ đánh dấu đã bị thay.
  const remainingMs = activeToken.expiresAt.getTime() - Date.now();
  const { rawRefreshToken: nextRawToken, expiresAt } = await issueRefreshToken({
    user,
    ttlDays: remainingMs / (24 * 60 * 60 * 1000),
    family: activeToken.family,
    context,
  });

  // Chỉ một request được quyền thay token cha. Request thua cuộc xóa token
  // con vừa tạo để không để lại hai refresh token hợp lệ trong cùng nhánh.
  const claimed = await RefreshToken.findOneAndUpdate(
    { _id: activeToken._id, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: "rotated",
        replacedByHash: hashToken(nextRawToken),
      },
    },
  );
  if (!claimed) {
    await RefreshToken.deleteOne({ tokenHash: hashToken(nextRawToken) });
    const latest = await RefreshToken.findById(activeToken._id);
    if (!latest) throw new AppError(ErrorCode.UNAUTHORIZED, "Phiên không còn hợp lệ");
    const current = await resolveRevokedToken(latest);
    return { ...buildSession(user, null, current.expiresAt), rotated: false };
  }

  return { ...buildSession(user, nextRawToken, expiresAt), rotated: true };
};

/*
 * Đăng xuất thu hồi CẢ FAMILY chứ không chỉ một token: nếu đang có token vừa
 * xoay vòng trong cửa sổ ân hạn, xóa mỗi token hiện tại sẽ để lọt token kia.
 */
export const revokeRefreshToken = async (rawRefreshToken) => {
  if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
    return false;
  }

  const storedToken = await RefreshToken.findOne({ tokenHash: hashToken(rawRefreshToken) });

  if (!storedToken) {
    return false;
  }

  await revokeFamily(storedToken.family, "logout");

  return true;
};
