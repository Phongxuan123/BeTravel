import express from "express";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { feedbackRateLimit } from "../middleware/rateLimit.middleware.js";
import * as feedbackController from "../controllers/feedback.controller.js";
import { feedbackCreateSchema } from "../validators/feedback.validator.js";

const router = express.Router();

router.use(authenticateToken);
router.post("/", feedbackRateLimit, validateBody(feedbackCreateSchema), feedbackController.create);

export default router;
