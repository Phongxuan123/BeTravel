import { ok } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import * as translateService from "../services/translate.service.js";

export const translate = async (req, res, next) => {
  try {
    const result = await translateService.translateText(req.body, req.user.userId);
    return ok(res, result);
  } catch (error) {
    next(toAppError(error));
  }
};
