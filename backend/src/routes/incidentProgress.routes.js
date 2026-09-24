import express from "express";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import * as progressController from "../controllers/incidentProgress.controller.js";
import { incidentProgressUpdateSchema } from "../validators/publicContent.validator.js";

// Tien do rieng cua tung user dang nhap -- giong trips.routes.js, khong phan
// biet role. Guest (chua dang nhap) xem duoc workflow qua /api/incidents
// nhung khong goi toi day (man hinh tu chan, hien banner moi dang nhap).
const router = express.Router();

router.use(authenticateToken);

router.get("/:incidentId", progressController.get);
router.put("/:incidentId", validateBody(incidentProgressUpdateSchema), progressController.put);

export default router;
