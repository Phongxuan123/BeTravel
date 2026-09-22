import { ok } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import { getDashboardSummary } from "../services/dashboard.service.js";

export const get = async (req, res, next) => {
  try {
    const summary = await getDashboardSummary();
    return ok(res, summary);
  } catch (error) {
    next(toAppError(error));
  }
};
