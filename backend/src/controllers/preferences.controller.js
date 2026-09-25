import { ok } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import { updateUserPreferences } from "../services/auth.service.js";

export const update = async (req, res, next) => {
  try {
    const preferences = await updateUserPreferences({ userId: req.user.userId, patch: req.body });
    return ok(res, preferences);
  } catch (error) {
    next(toAppError(error));
  }
};
