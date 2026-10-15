import { ok } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import * as locationService from "../services/publicSupportLocation.service.js";
import { searchExternalPlaces } from "../services/externalPlaces.service.js";

// Query đã được Zod chuẩn hóa trước khi vào controller.
export const nearby = async (req, res, next) => {
  try {
    const locations = await locationService.findNearby(req.query);
    return ok(res, locations);
  } catch (error) {
    next(toAppError(error));
  }
};

export const list = async (req, res, next) => {
  try {
    const locations = await locationService.listByCountry({
      country: req.query.country,
      type: req.query.type,
    });
    return ok(res, locations);
  } catch (error) {
    next(toAppError(error));
  }
};

// Dia diem bo sung tu Google Maps (SerpApi): CHUA xac minh, tach rieng khoi /nearby va /.
export const external = async (req, res, next) => {
  try {
    const places = await searchExternalPlaces(req.query);
    return ok(res, places);
  } catch (error) {
    next(toAppError(error));
  }
};
