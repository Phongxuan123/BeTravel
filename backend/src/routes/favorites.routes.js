import express from "express";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import * as favoritesController from "../controllers/favorites.controller.js";
import { favoriteCreateSchema } from "../validators/publicContent.validator.js";

// Rieng cua tung user dang nhap -- giong trips.routes.js/incidentProgress.routes.js.
const router = express.Router();

router.use(authenticateToken);

router.get("/", favoritesController.list);
router.post("/", validateBody(favoriteCreateSchema), favoritesController.create);
router.delete("/:targetType/:targetId", favoritesController.remove);

export default router;
