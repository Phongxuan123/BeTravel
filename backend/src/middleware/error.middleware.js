export const notFoundHandler = (
    req,
    res
) => {
    return res.status(404).json({
        success: false,
        message: "API endpoint không tồn tại"
    });
};

export const errorHandler = (
    error,
    req,
    res,
    next
) => {
    console.error(error);

    if (res.headersSent) {
        return next(error);
    }

    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });
};
