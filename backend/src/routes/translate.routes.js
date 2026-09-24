import express from "express";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { translateRateLimit } from "../middleware/rateLimit.middleware.js";
import { translate } from "../controllers/translate.controller.js";
import { translateRequestSchema } from "../validators/translate.validator.js";

// Dich khan cap can dang nhap -- tinh phi provider giong chat, khong mo cho
// khach vang lai (giong chatRateLimit, tranh spam an danh ton tien AI).
const router = express.Router();

router.use(authenticateToken);
router.post("/", translateRateLimit, validateBody(translateRequestSchema), translate);

export default router;
