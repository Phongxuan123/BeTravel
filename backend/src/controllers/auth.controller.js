import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";

import {
    registerUser,
    loginUser,
    loginWithGoogle,
    linkGoogleAccount,
    updateUserProfile
} from "../services/auth.service.js";

import {
    refreshAccessToken
} from "../services/refreshToken.service.js";

import {
    verifyGoogleCredential
} from "../services/googleAuth.service.js";

import {
    requestPasswordReset,
    verifyPasswordResetOtp,
    resendPasswordResetOtp,
    resetPassword as resetPasswordService
} from "../services/passwordReset.service.js";

import {
    registerSchema,
    loginSchema
} from "../validators/auth.validator.js";

import {
    setRefreshTokenCookie,
    clearRefreshTokenCookie
} from "../utils/cookie.js";

import {
    hashToken
} from "../utils/token.js";

const respondGoogleError = (
    error,
    res,
    next
) => {
    const map = {
        GOOGLE_CREDENTIAL_MISSING: [
            400,
            "Google credential không được để trống"
        ],
        GOOGLE_CLIENT_ID_MISSING: [
            500,
            "Google Client ID chưa được cấu hình"
        ],
        GOOGLE_CREDENTIAL_INVALID: [
            401,
            "Google credential không hợp lệ"
        ],
        GOOGLE_CREDENTIAL_EXPIRED: [
            401,
            "Google credential đã hết hạn"
        ],
        GOOGLE_EMAIL_NOT_VERIFIED: [
            401,
            "Email Google chưa được xác thực"
        ],
        GOOGLE_ID_INVALID: [
            400,
            "Google ID không hợp lệ"
        ],
        GOOGLE_EMAIL_INVALID: [
            400,
            "Email Google không hợp lệ"
        ],
        GOOGLE_EMAIL_ALREADY_REGISTERED: [
            409,
            "Email này đã có tài khoản mật khẩu. Hãy đăng nhập tài khoản đó rồi liên kết Google."
        ],
        GOOGLE_EMAIL_MISMATCH: [
            409,
            "Email Google phải trùng với email tài khoản hiện tại"
        ],
        GOOGLE_ACCOUNT_IN_USE: [
            409,
            "Tài khoản Google này đã được liên kết với người dùng khác"
        ],
        ACCOUNT_NOT_ACTIVE: [
            403,
            "Tài khoản đã bị vô hiệu hóa"
        ],
        USER_NOT_FOUND: [
            404,
            "Tài khoản không tồn tại"
        ]
    };

    const entry = map[error.message];

    if (!entry) {
        next(error);
        return true;
    }

    const [status, message] = entry;

    res.status(status).json({
        success: false,
        message
    });

    return true;
};

export const register = async (
    req,
    res,
    next
) => {
    try {
        const result =
            registerSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message:
                    "Dữ liệu đăng ký không hợp lệ",
                errors:
                    result.error.flatten()
            });
        }

        const user = await registerUser({
            fullName:
                result.data.fullName,
            username:
                result.data.username,
            email:
                result.data.email,
            phone:
                result.data.phone || "",
            password:
                result.data.password
        });

        return res.status(201).json({
            success: true,
            message:
                "Đăng ký thành công. Bạn có thể đăng nhập ngay.",
            data: { user }
        });
    } catch (error) {
        if (error.message === "EMAIL_EXISTS") {
            return res.status(409).json({
                success: false,
                message: "Email đã được sử dụng"
            });
        }

        if (
            error.message ===
            "USERNAME_EXISTS"
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "Username đã được sử dụng"
            });
        }

        if (error.message === "PHONE_EXISTS") {
            return res.status(409).json({
                success: false,
                message: "Số điện thoại đã được sử dụng"
            });
        }

        if (error?.code === 11000) {
            const field = Object.keys(
                error.keyPattern || {}
            )[0];

            return res.status(409).json({
                success: false,
                message:
                    field === "email"
                        ? "Email đã được sử dụng"
                        : field === "phone"
                            ? "Số điện thoại đã được sử dụng"
                            : "Username đã được sử dụng"
            });
        }

        next(error);
    }
};

export const login = async (
    req,
    res,
    next
) => {
    try {
        const result =
            loginSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message:
                    "Thông tin đăng nhập không hợp lệ",
                errors:
                    result.error.flatten()
            });
        }

        const authResult = await loginUser(
            result.data
        );

        const refreshMaxAge =
            Math.max(
                0,
                authResult.expiresAt.getTime() -
                    Date.now()
            );

        setRefreshTokenCookie(
            res,
            authResult.refreshToken,
            refreshMaxAge
        );

        delete authResult.refreshToken;
        delete authResult.expiresAt;

        return res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            data: authResult
        });
    } catch (error) {
        if (
            error.message ===
            "INVALID_CREDENTIALS"
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Tài khoản hoặc mật khẩu không chính xác"
            });
        }

        if (
            error.message ===
            "PASSWORD_LOGIN_UNAVAILABLE"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Tài khoản này chưa có mật khẩu. Hãy đăng nhập bằng Google hoặc dùng Quên mật khẩu để tạo mật khẩu."
            });
        }

        if (
            error.message ===
            "ACCOUNT_NOT_ACTIVE"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Tài khoản đã bị vô hiệu hóa"
            });
        }

        next(error);
    }
};

export const googleLogin = async (
    req,
    res,
    next
) => {
    try {
        const googleUser =
            await verifyGoogleCredential(
                req.body?.credential
            );

        const authResult =
            await loginWithGoogle({
                googleId:
                    googleUser.googleId,
                email: googleUser.email,
                fullName:
                    googleUser.fullName
            });

        const refreshMaxAge =
            Math.max(
                0,
                authResult.expiresAt.getTime() -
                    Date.now()
            );

        setRefreshTokenCookie(
            res,
            authResult.refreshToken,
            refreshMaxAge
        );

        delete authResult.refreshToken;
        delete authResult.expiresAt;

        return res.status(200).json({
            success: true,
            message:
                "Đăng nhập Google thành công",
            data: authResult
        });
    } catch (error) {
        return respondGoogleError(
            error,
            res,
            next
        );
    }
};

export const linkGoogle = async (
    req,
    res,
    next
) => {
    try {
        const googleUser =
            await verifyGoogleCredential(
                req.body?.credential
            );

        const user =
            await linkGoogleAccount({
                userId: req.user.userId,
                googleId:
                    googleUser.googleId,
                email: googleUser.email,
                fullName:
                    googleUser.fullName
            });

        return res.status(200).json({
            success: true,
            message:
                "Liên kết Google thành công",
            data: { user }
        });
    } catch (error) {
        return respondGoogleError(
            error,
            res,
            next
        );
    }
};

export const refresh = async (
    req,
    res,
    next
) => {
    try {
        const result =
            await refreshAccessToken(
                req.cookies.refreshToken
            );

        return res.status(200).json({
            success: true,
            message:
                "Access token đã được làm mới",
            data: {
                accessToken:
                    result.accessToken,
                user: result.user
            }
        });
    } catch (error) {
        const known = new Map([
            [
                "REFRESH_TOKEN_MISSING",
                "Không tìm thấy refresh token"
            ],
            [
                "REFRESH_TOKEN_INVALID",
                "Refresh token không hợp lệ"
            ],
            [
                "REFRESH_TOKEN_EXPIRED",
                "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            ],
            [
                "USER_NOT_FOUND",
                "Tài khoản không tồn tại"
            ]
        ]);

        if (known.has(error.message)) {
            clearRefreshTokenCookie(res);
            return res.status(401).json({
                success: false,
                message:
                    known.get(error.message)
            });
        }

        if (
            error.message ===
            "ACCOUNT_NOT_ACTIVE"
        ) {
            clearRefreshTokenCookie(res);
            return res.status(403).json({
                success: false,
                message:
                    "Tài khoản đã bị vô hiệu hóa"
            });
        }

        next(error);
    }
};

export const logout = async (
    req,
    res,
    next
) => {
    try {
        const rawRefreshToken =
            req.cookies.refreshToken;

        if (rawRefreshToken) {
            await RefreshToken.deleteOne({
                tokenHash:
                    hashToken(rawRefreshToken)
            });
        }

        clearRefreshTokenCookie(res);

        return res.status(200).json({
            success: true,
            message: "Đăng xuất thành công"
        });
    } catch (error) {
        next(error);
    }
};

export const getProfile = async (
    req,
    res,
    next
) => {
    try {
        const user = await User.findById(
            req.user.userId
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "Tài khoản không tồn tại"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id.toString(),
                    username:
                        user.username,
                    fullName:
                        user.fullName,
                    email: user.email,
                    phone: user.phone || "",
                    role: user.role,
                    isActive:
                        user.isActive,
                    googleLinked:
                        Boolean(user.googleId),
                    createdAt:
                        user.createdAt,
                    updatedAt:
                        user.updatedAt
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (
    req,
    res,
    next
) => {
    try {
        const {
            fullName,
            phone
        } = req.body || {};

        const user =
            await updateUserProfile({
                userId:
                    req.user.userId,
                fullName,
                phone
            });

        return res.status(200).json({
            success: true,
            message:
                "Cập nhật thông tin thành công",
            data: { user }
        });
    } catch (error) {
        const map = {
            PROFILE_FIELDS_REQUIRED: [
                400,
                "Không có thông tin hồ sơ cần cập nhật"
            ],
            FULL_NAME_INVALID: [
                400,
                "Họ và tên phải có từ 2 đến 150 ký tự"
            ],
            PHONE_INVALID: [
                400,
                "Số điện thoại không hợp lệ. Vui lòng dùng dạng 0xxxxxxxxx hoặc +84xxxxxxxxx"
            ],
            PHONE_EXISTS: [
                409,
                "Số điện thoại đã được sử dụng"
            ],
            USER_NOT_FOUND: [
                404,
                "Tài khoản không tồn tại"
            ],
            ACCOUNT_NOT_ACTIVE: [
                403,
                "Tài khoản đã bị vô hiệu hóa"
            ]
        };

        const entry = map[error.message];

        if (entry) {
            return res
                .status(entry[0])
                .json({
                    success: false,
                    message: entry[1]
                });
        }

        next(error);
    }
};

export const forgotPassword = async (
    req,
    res,
    next
) => {
    try {
        await requestPasswordReset(
            req.body?.email
        );

        return res.status(200).json({
            success: true,
            message:
                "Nếu email tồn tại, BeTravel đã gửi mã OTP khôi phục mật khẩu."
        });
    } catch (error) {
        if (
            error.message ===
            "EMAIL_INVALID"
        ) {
            return res.status(400).json({
                success: false,
                message: "Email không hợp lệ"
            });
        }

        if (
            error.message ===
            "PASSWORD_RESET_EMAIL_FAILED"
        ) {
            return res.status(500).json({
                success: false,
                message:
                    "Không thể gửi email khôi phục mật khẩu"
            });
        }

        next(error);
    }
};

export const verifyResetOtp = async (
    req,
    res,
    next
) => {
    try {
        const data =
            await verifyPasswordResetOtp({
                email: req.body?.email,
                otp: req.body?.otp
            });

        return res.status(200).json({
            success: true,
            message: "OTP hợp lệ",
            data
        });
    } catch (error) {
        const map = {
            EMAIL_INVALID: "Email không hợp lệ",
            OTP_INVALID: "OTP không hợp lệ",
            RESET_REQUEST_NOT_FOUND:
                "Không tìm thấy yêu cầu khôi phục mật khẩu",
            RESET_OTP_ALREADY_VERIFIED:
                "OTP đã được xác thực",
            RESET_OTP_EXPIRED:
                "OTP đã hết hạn",
            RESET_OTP_MAX_ATTEMPTS:
                "Bạn đã nhập sai OTP quá nhiều lần",
            RESET_OTP_INVALID:
                "OTP không chính xác"
        };

        if (map[error.message]) {
            return res.status(400).json({
                success: false,
                message: map[error.message]
            });
        }

        next(error);
    }
};

export const resendResetOtp = async (
    req,
    res,
    next
) => {
    try {
        await resendPasswordResetOtp(
            req.body?.email
        );

        return res.status(200).json({
            success: true,
            message:
                "Nếu email tồn tại, OTP mới đã được gửi."
        });
    } catch (error) {
        if (
            error.message ===
            "EMAIL_INVALID"
        ) {
            return res.status(400).json({
                success: false,
                message: "Email không hợp lệ"
            });
        }

        if (
            error.message ===
            "PASSWORD_RESET_EMAIL_FAILED"
        ) {
            return res.status(500).json({
                success: false,
                message:
                    "Không thể gửi email khôi phục mật khẩu"
            });
        }

        next(error);
    }
};

export const resetPassword = async (
    req,
    res,
    next
) => {
    try {
        await resetPasswordService({
            resetToken:
                req.body?.resetToken,
            password:
                req.body?.password
        });

        return res.status(200).json({
            success: true,
            message:
                "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."
        });
    } catch (error) {
        const map = {
            RESET_TOKEN_INVALID:
                "Reset token không hợp lệ",
            RESET_TOKEN_EXPIRED:
                "Reset token đã hết hạn",
            PASSWORD_INVALID:
                "Mật khẩu không hợp lệ",
            PASSWORD_TOO_SHORT:
                "Mật khẩu phải có ít nhất 8 ký tự",
            PASSWORD_TOO_LONG:
                "Mật khẩu quá dài",
            PASSWORD_NO_UPPERCASE:
                "Mật khẩu cần ít nhất 1 chữ hoa",
            PASSWORD_NO_LOWERCASE:
                "Mật khẩu cần ít nhất 1 chữ thường",
            PASSWORD_NO_NUMBER:
                "Mật khẩu cần ít nhất 1 chữ số",
            PASSWORD_SAME_AS_OLD:
                "Mật khẩu mới không được trùng mật khẩu cũ",
            USER_NOT_FOUND:
                "Tài khoản không tồn tại"
        };

        if (map[error.message]) {
            return res.status(400).json({
                success: false,
                message: map[error.message]
            });
        }

        next(error);
    }
};
