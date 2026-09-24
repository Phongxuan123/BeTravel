import { ok } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import * as locationService from "../services/publicSupportLocation.service.js";

/*
 * ★ KHONG tin req.query.lat/lng/radiusKm/limit da la number sau validateQuery
 * -- middleware nay khong thuc su coerce duoc vao req.query (xem
 * docs/PROGRESS.md quyet dinh 39, bug tu B2). Tu Number() lai o day, giong
 * adminAnalytics.controller.js. Schema van huu ich de TU CHOI gia tri sai
 * dinh dang truoc khi toi day.
 */
export const nearby = async (req, res, next) => {
  try {
    const locations = await locationService.findNearby({
      lat: Number(req.query.lat),
      lng: Number(req.query.lng),
      country: req.query.country,
      type: req.query.type,
      radiusKm: req.query.radiusKm !== undefined ? Number(req.query.radiusKm) : undefined,
      limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
    });
    return ok(res, locations);
  } catch (error) {
    next(toAppError(error));
  }
};

export const list = async (req, res, next) => {
  try {
    const locations = await locationService.listByCountry({ country: req.query.country, type: req.query.type });
    return ok(res, locations);
  } catch (error) {
    next(toAppError(error));
  }
};
