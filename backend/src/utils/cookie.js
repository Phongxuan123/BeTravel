const getRefreshCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite:
        process.env.NODE_ENV === "production"
            ? "none"
            : "lax",
    path: "/api/auth"
});

export const setRefreshTokenCookie = (
    res,
    token,
    maxAge
) => {
    res.cookie(
        "refreshToken",
        token,
        {
            ...getRefreshCookieOptions(),
            maxAge
        }
    );
};

export const clearRefreshTokenCookie = (res) => {
    res.clearCookie(
        "refreshToken",
        getRefreshCookieOptions()
    );
};
