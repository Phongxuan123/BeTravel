import User from "../models/User.js";
import { fail } from "../core/envelope.js";
import { ErrorCode } from "../core/errors.js";
import { verifyAccessToken } from "../utils/token.js";

const extractBearerToken = (authorization) => {
  if (typeof authorization !== "string") {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  return scheme === "Bearer" && token ? token : null;
};

export const authenticateToken = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return fail(res, ErrorCode.UNAUTHORIZED, "Bạn chưa đăng nhập");
    }

    const payload = verifyAccessToken(token);

    if (!payload?.sub) {
      return fail(res, ErrorCode.UNAUTHORIZED, "Token không hợp lệ");
    }

    // Role/trạng thái trong JWT có thể cũ sau khi admin khóa hoặc hạ quyền.
    const user = await User.findById(payload.sub).select("role isActive").lean();
    if (!user) return fail(res, ErrorCode.UNAUTHORIZED, "Tài khoản không còn tồn tại");
    if (!user.isActive) return fail(res, ErrorCode.FORBIDDEN, "Tài khoản đã bị vô hiệu hóa");
    req.user = { userId: payload.sub, role: user.role };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return fail(res, ErrorCode.UNAUTHORIZED, "Phiên đăng nhập đã hết hạn");
    }

    if (error.name === "JsonWebTokenError") {
      return fail(res, ErrorCode.UNAUTHORIZED, "Token không hợp lệ");
    }

    next(error);
  }
};

/*
 * RBAC phải kiểm ở BACKEND. Ẩn nút phía client không phải là bảo vệ --
 * bất kỳ ai cũng gọi thẳng được endpoint bằng curl.
 */
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, ErrorCode.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này");
    }

    next();
  };
