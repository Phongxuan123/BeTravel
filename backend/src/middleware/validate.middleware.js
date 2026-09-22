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
    // Express 5: req.query chi co getter, khong gan lai duoc ca doi tuong
    // (req.query = ... nem TypeError). MUTATE tung field thay vi thay the
    // tham chieu -- ket qua tuong duong (controller/service van doc req.query
    // binh thuong, gia tri da qua coerce/default cua Zod).
    Object.keys(req.query).forEach((key) => delete req.query[key]);
    Object.assign(req.query, parsed);
    next();
  } catch (error) {
    next(error);
  }
};
