import { ok, created } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import * as favoriteService from "../services/favorite.service.js";

export const list = async (req, res, next) => {
  try {
    const favorites = await favoriteService.listFavorites(req.user.userId);
    return ok(res, favorites);
  } catch (error) {
    next(toAppError(error));
  }
};

export const create = async (req, res, next) => {
  try {
    const favorite = await favoriteService.createFavorite(req.user.userId, req.body);
    return created(res, favorite);
  } catch (error) {
    next(toAppError(error));
  }
};

export const remove = async (req, res, next) => {
  try {
    await favoriteService.removeFavorite(req.user.userId, req.params.targetType, req.params.targetId);
    return ok(res, { deleted: true });
  } catch (error) {
    next(toAppError(error));
  }
};
