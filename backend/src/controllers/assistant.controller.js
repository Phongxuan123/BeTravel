import { ok } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import * as assistantService from "../services/assistant.service.js";

// Controller mong: moi nhanh chi goi service va boc envelope.
const handle = (run) => async (req, res, next) => {
  try {
    return ok(res, await run(req));
  } catch (error) {
    next(toAppError(error));
  }
};

export const sendMessage = handle((req) => assistantService.sendMessage(req.user.userId, req.body));

export const regenerateMessage = handle((req) =>
  assistantService.regenerateMessage(req.user.userId, req.params.id, req.body),
);

export const listConversations = handle((req) =>
  assistantService.listConversations(req.user.userId),
);

export const getConversation = handle((req) =>
  assistantService.getConversation(req.user.userId, req.params.id),
);

export const deleteConversation = handle(async (req) => {
  await assistantService.deleteConversation(req.user.userId, req.params.id);
  return { deleted: true };
});

export const deleteAllConversations = handle(async (req) => {
  await assistantService.deleteAllConversations(req.user.userId);
  return { deleted: true };
});
