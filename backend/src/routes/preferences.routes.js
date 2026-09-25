import express from "express";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { update } from "../controllers/preferences.controller.js";
import { preferencesUpdateSchema } from "../validators/auth.validator.js";

// Rieng cua tung user dang nhap -- doc qua GET /api/auth/me (da tra kem
// preferences), khong can them route GET rieng (Rule 9 KISS).
const router = express.Router();

router.use(authenticateToken);
router.put("/", validateBody(preferencesUpdateSchema), update);

export default router;
