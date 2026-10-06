import * as ragAdminService from "../services/ragAdmin.service.js";
import { toAppError } from "../core/domainErrors.js";
import { recordAuditLog } from "../services/auditLog.service.js";
import { ok } from "../core/envelope.js";

export const reindexCountry = async (req, res, next) => {
  try {
    const result = await ragAdminService.reindexCountry(req.body.countryCode);
    await recordAuditLog({
      actorId: req.user.userId,
      action: "REINDEX",
      entityType: "Country",
      entityId: req.body.countryCode,
      after: result,
      ip: req.ip,
    });
    ok(res, result);
  } catch (error) {
    next(toAppError(error));
  }
};

export const status = async (req, res, next) => {
  try {
    const list = await ragAdminService.getStatus(req.query.countryCode);
    ok(res, list);
  } catch (error) {
    next(toAppError(error));
  }
};
