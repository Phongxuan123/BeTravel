import { ok } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import { AppError, ErrorCode } from "../core/errors.js";
import * as contentService from "../services/publicContent.service.js";

export const listCountries = async (req, res, next) => {
  try {
    const countries = await contentService.listCountries();
    return ok(res, countries);
  } catch (error) {
    next(toAppError(error));
  }
};

export const getCountry = async (req, res, next) => {
  try {
    const country = await contentService.getCountry(req.params.code);
    if (!country) throw new AppError(ErrorCode.NOT_FOUND, "Không tìm thấy quốc gia");
    return ok(res, country);
  } catch (error) {
    next(toAppError(error));
  }
};

export const listTopics = async (req, res, next) => {
  try {
    const topics = await contentService.listTopics(req.query.country);
    return ok(res, topics);
  } catch (error) {
    next(toAppError(error));
  }
};

export const listArticles = async (req, res, next) => {
  try {
    const { items, meta } = await contentService.listArticles(req.query);
    return ok(res, items, meta);
  } catch (error) {
    next(toAppError(error));
  }
};

export const getArticle = async (req, res, next) => {
  try {
    const result = await contentService.getArticle(req.params.country, req.params.slug);
    if (!result) throw new AppError(ErrorCode.NOT_FOUND, "Không tìm thấy bài luật");
    return ok(res, { ...result.article.toObject(), relatedArticles: result.relatedArticles });
  } catch (error) {
    next(toAppError(error));
  }
};

export const searchArticles = async (req, res, next) => {
  try {
    const { items, meta } = await contentService.searchArticles(req.query);
    return ok(res, items, meta);
  } catch (error) {
    next(toAppError(error));
  }
};
