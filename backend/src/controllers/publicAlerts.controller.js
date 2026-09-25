import { ok } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import * as geoAlertService from "../services/geoAlert.service.js";

export const applicable = async (req, res, next) => {
  try {
    const alerts = await geoAlertService.findApplicable(req.query);
    return ok(res, alerts);
  } catch (error) {
    next(toAppError(error));
  }
};
