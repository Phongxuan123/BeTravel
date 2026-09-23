import * as ragAdminService from "../services/ragAdmin.service.js";
import { toAppError } from "../core/domainErrors.js";
import { ok } from "../core/envelope.js";

export const reindexCountry = async (req, res, next) => {
  try {
    const result = await ragAdminService.reindexCountry(req.body.countryCode);
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
