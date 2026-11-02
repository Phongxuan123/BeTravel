import { ok } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import * as riskZoneService from "../services/riskZone.service.js";

export const list = async (req, res, next) => {
  try {
    return ok(res, await riskZoneService.listPublishedRiskZones(req.query));
  } catch (error) {
    next(toAppError(error));
  }
};
