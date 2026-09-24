/*
 * Middleware Zod dung chung: validate body/query, gan lai gia tri da parse
 * (co transform/default cua Zod) vao req, roi next(). Loi ZodError duoc
 * error.middleware.js bat va tra VALIDATION_ERROR dung dinh dang -- controller
 * khong can try/catch rieng cho loi validate.
 */
export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateQuery = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.query);
    // Express 5 tạo object mới mỗi lần đọc getter; giữ bản đã validate trên
    // chính request để controller nhận đúng kiểu, default và field đã lọc.
    Object.defineProperty(req, "query", { value: parsed, configurable: true });
    next();
  } catch (error) {
    next(error);
  }
};
