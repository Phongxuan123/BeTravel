import express from "express";

import {
    register,
    login,
    googleLogin,
    linkGoogle,
    refresh,
    logout,
    getProfile,
    updateProfile,
    forgotPassword,
    verifyResetOtp,
    resendResetOtp,
    resetPassword
} from "../controllers/auth.controller.js";

import {
    authenticateToken
} from "../middleware/auth.middleware.js";

import {
    loginRateLimit,
    registerRateLimit,
    resetRateLimit
} from "../middleware/rateLimit.middleware.js";

const router = express.Router();

/*
 * Registration ends immediately.
 * There is NO registration OTP route in BeTravel.
 */
router.post(
    "/register",
    registerRateLimit,
    register
);

router.post(
    "/login",
    loginRateLimit,
    login
);

router.post(
    "/google",
    loginRateLimit,
    googleLogin
);

/*
 * Safe linking for an existing password account.
 * User must already be authenticated, and Google email must match.
 */
router.post(
    "/google/link",
    authenticateToken,
    linkGoogle
);

router.post(
    "/refresh",
    refresh
);

router.post(
    "/logout",
    logout
);

router.get(
    "/me",
    authenticateToken,
    getProfile
);

router.patch(
    "/me",
    authenticateToken,
    updateProfile
);

/* Existing forgot-password flow kept from FYCE, rebranded. */
router.post(
    "/forgot-password",
    resetRateLimit,
    forgotPassword
);

router.post(
    "/verify-reset-otp",
    resetRateLimit,
    verifyResetOtp
);

router.post(
    "/resend-reset-otp",
    resetRateLimit,
    resendResetOtp
);

router.post(
    "/reset-password",
    resetRateLimit,
    resetPassword
);

export default router;
