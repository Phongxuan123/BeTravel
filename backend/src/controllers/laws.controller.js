import { ok } from "../core/envelope.js";
import * as australia from "../services/australiaLegislation.service.js";
import { attachNamesVi } from "../services/australiaLawTitleTranslation.service.js";
import { getTitleSummary } from "../services/australiaLawSummary.service.js";
import { getTitleContentVi } from "../services/australiaLawTranslation.service.js";

/*
 * Controller mỏng: query/params đã được Zod chuẩn hóa ở route. Lỗi từ service
 * đã là AppError (NOT_FOUND / UPSTREAM_ERROR) nên chuyển thẳng cho errorHandler.
 */

export const listAustralia = async (req, res, next) => {
  try {
    const { items, meta } = await australia.listTitles(req.query);
    return ok(res, await attachNamesVi(items), meta);
  } catch (error) {
    next(error);
  }
};

export const topicsAustralia = (req, res) => ok(res, australia.listTopics());

export const getAustralia = async (req, res, next) => {
  try {
    const [detail] = await attachNamesVi([await australia.getTitleDetail(req.params.id)]);
    return ok(res, detail);
  } catch (error) {
    next(error);
  }
};

export const versionsAustralia = async (req, res, next) => {
  try {
    const { items, meta } = await australia.listVersions(req.params.id, req.query);
    return ok(res, items, meta);
  } catch (error) {
    next(error);
  }
};

export const contentAustralia = async (req, res, next) => {
  try {
    return ok(res, await australia.getTitleContent(req.params.id, req.query));
  } catch (error) {
    next(error);
  }
};

export const summaryAustralia = async (req, res, next) => {
  try {
    return ok(res, await getTitleSummary(req.params.id));
  } catch (error) {
    next(error);
  }
};

export const contentViAustralia = async (req, res, next) => {
  try {
    return ok(res, await getTitleContentVi(req.params.id, req.query));
  } catch (error) {
    next(error);
  }
};
