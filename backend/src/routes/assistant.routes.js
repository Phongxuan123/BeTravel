import express from "express";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { assistantRateLimit } from "../middleware/rateLimit.middleware.js";
import * as assistantController from "../controllers/assistant.controller.js";
import {
  idParamSchema,
  regenerateSchema,
  sendMessageSchema,
} from "../validators/assistant.validator.js";

// Tro ly AI ban 2: bat buoc dang nhap (G5). Hai endpoint goi mo hinh co them rate limit burst;
// han muc ngay luu DB nam o aiUsage.service.js.
const router = express.Router();

router.use(authenticateToken);

router.post(
  "/messages",
  assistantRateLimit,
  validateBody(sendMessageSchema),
  assistantController.sendMessage,
);
router.post(
  "/messages/:id/regenerate",
  assistantRateLimit,
  validateParams(idParamSchema),
  validateBody(regenerateSchema),
  assistantController.regenerateMessage,
);
router.get("/conversations", assistantController.listConversations);
router.get(
  "/conversations/:id",
  validateParams(idParamSchema),
  assistantController.getConversation,
);
router.delete(
  "/conversations/:id",
  validateParams(idParamSchema),
  assistantController.deleteConversation,
);
router.delete("/conversations", assistantController.deleteAllConversations);

export default router;
