import { ok, created } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import * as tripService from "../services/trip.service.js";

export const list = async (req, res, next) => {
  try {
    const trips = await tripService.listTrips(req.user.userId);
    return ok(res, trips);
  } catch (error) {
    next(toAppError(error));
  }
};

export const create = async (req, res, next) => {
  try {
    const trip = await tripService.createTrip(req.user.userId, req.body);
    return created(res, trip);
  } catch (error) {
    next(toAppError(error));
  }
};

export const setCurrent = async (req, res, next) => {
  try {
    const trip = await tripService.setCurrentTrip(req.user.userId, req.params.id);
    return ok(res, trip);
  } catch (error) {
    next(toAppError(error));
  }
};

export const remove = async (req, res, next) => {
  try {
    await tripService.deleteTrip(req.user.userId, req.params.id);
    return ok(res, { deleted: true });
  } catch (error) {
    next(toAppError(error));
  }
};
