import express from "express";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { chatRateLimit } from "../middleware/rateLimit.middleware.js";
import * as chatController from "../controllers/chat.controller.js";
import { chatSessionCreateSchema, chatMessageCreateSchema, chatFeedbackSchema } from "../validators/chat.validator.js";

/*
 * Chat la cua rieng tung user da dang nhap -- khong phan biet role, giong
 * trips.routes.js. Rate limit RAM o day chi la lop 1; lop 2 (quota that su
 * bao ve chi phi) nam trong chat.service.js#sendMessage.
 */
const router = express.Router();

router.use(authenticateToken);

router.get("/sessions", chatController.listSessions);
router.post("/sessions", validateBody(chatSessionCreateSchema), chatController.createSession);
router.delete("/sessions/:id", chatController.removeSession);

router.get("/sessions/:id/messages", chatController.listMessages);
router.post(
  "/sessions/:id/messages",
  chatRateLimit,
  validateBody(chatMessageCreateSchema),
  chatController.sendMessage,
);

router.post(
  "/sessions/:id/messages/:messageId/feedback",
  validateBody(chatFeedbackSchema),
  chatController.setFeedback,
);

export default router;
