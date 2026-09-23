import * as chatService from "../services/chat.service.js";
import { toAppError } from "../core/domainErrors.js";
import { ok, created } from "../core/envelope.js";

export const createSession = async (req, res, next) => {
  try {
    const session = await chatService.createSession(req.user.userId, req.body.countryCode);
    created(res, session);
  } catch (error) {
    next(toAppError(error));
  }
};

export const listSessions = async (req, res, next) => {
  try {
    const sessions = await chatService.listSessions(req.user.userId);
    ok(res, sessions);
  } catch (error) {
    next(toAppError(error));
  }
};

export const listMessages = async (req, res, next) => {
  try {
    const messages = await chatService.listMessages(req.user.userId, req.params.id);
    ok(res, messages);
  } catch (error) {
    next(toAppError(error));
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { session, message } = await chatService.sendMessage({
      userId: req.user.userId,
      sessionId: req.params.id,
      question: req.body.question,
      focusArticleId: req.body.focusArticleId,
    });
    created(res, { sessionId: session._id, message });
  } catch (error) {
    next(toAppError(error));
  }
};

export const removeSession = async (req, res, next) => {
  try {
    await chatService.deleteSession(req.user.userId, req.params.id);
    ok(res, { deleted: true });
  } catch (error) {
    next(toAppError(error));
  }
};

export const setFeedback = async (req, res, next) => {
  try {
    const message = await chatService.setMessageFeedback(
      req.user.userId,
      req.params.id,
      req.params.messageId,
      req.body.feedback,
    );
    ok(res, message);
  } catch (error) {
    next(toAppError(error));
  }
};
