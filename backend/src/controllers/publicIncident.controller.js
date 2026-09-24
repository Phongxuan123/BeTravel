import { ok } from "../core/envelope.js";
import { AppError, ErrorCode } from "../core/errors.js";
import { toAppError } from "../core/domainErrors.js";
import * as incidentService from "../services/incident.service.js";

export const list = async (req, res, next) => {
  try {
    const incidents = await incidentService.listIncidentsForCountry(req.query.country);
    return ok(res, incidents);
  } catch (error) {
    next(toAppError(error));
  }
};

export const get = async (req, res, next) => {
  try {
    const incident = await incidentService.getIncidentBySlug(req.params.slug);
    if (!incident) throw new AppError(ErrorCode.NOT_FOUND, "Không tìm thấy hướng dẫn xử lý sự cố");
    return ok(res, incident);
  } catch (error) {
    next(toAppError(error));
  }
};
