import express from "express";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import * as tripsController from "../controllers/trips.controller.js";
import { tripCreateSchema } from "../validators/publicContent.validator.js";

/*
 * Chuyen di la cua rieng tung user da dang nhap -- khong phan biet
 * role (user hay admin deu tao/xem duoc chuyen di CUA CHINH MINH), nen chi
 * can authenticateToken, khong can requireRole.
 */
const router = express.Router();

router.use(authenticateToken);

router.get("/", tripsController.list);
router.post("/", validateBody(tripCreateSchema), tripsController.create);
router.put("/:id/current", tripsController.setCurrent);
router.delete("/:id", tripsController.remove);

export default router;
