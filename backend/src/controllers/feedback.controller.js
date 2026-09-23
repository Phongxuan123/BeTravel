import * as feedbackService from "../services/feedback.service.js";
import { toAppError } from "../core/domainErrors.js";
import { created } from "../core/envelope.js";

export const create = async (req, res, next) => {
  try {
    const feedback = await feedbackService.createFeedback({ userId: req.user.userId, ...req.body });
    created(res, feedback);
  } catch (error) {
    next(toAppError(error));
  }
};
