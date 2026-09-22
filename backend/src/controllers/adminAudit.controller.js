import { ok } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import { listAuditLogs } from "../services/audit.service.js";

export const list = async (req, res, next) => {
  try {
    const { items, meta } = await listAuditLogs(req.query);
    return ok(res, items, meta);
  } catch (error) {
    next(toAppError(error));
  }
};
