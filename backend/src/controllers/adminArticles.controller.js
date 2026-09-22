import { ok, created } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import { AppError, ErrorCode } from "../core/errors.js";
import { recordAuditLog } from "../services/auditLog.service.js";
import * as articleService from "../services/legalArticle.service.js";

const NOT_FOUND_MESSAGE = "Không tìm thấy bài luật";

export const list = async (req, res, next) => {
  try {
    const { items, meta } = await articleService.listArticles(req.query);
    return ok(res, items, meta);
  } catch (error) {
    next(toAppError(error));
  }
};

export const get = async (req, res, next) => {
  try {
    const article = await articleService.getArticleById(req.params.id);
    if (!article) throw new AppError(ErrorCode.NOT_FOUND, NOT_FOUND_MESSAGE);
    return ok(res, article);
  } catch (error) {
    next(toAppError(error));
  }
};

export const create = async (req, res, next) => {
  try {
    const article = await articleService.createArticle(req.body, req.user.userId);

    await recordAuditLog({
      actorId: req.user.userId,
      action: "CREATE",
      entityType: "LegalArticle",
      entityId: article._id,
      after: article.toObject(),
      ip: req.ip,
    });

    return created(res, article);
  } catch (error) {
    next(toAppError(error));
  }
};

export const update = async (req, res, next) => {
  try {
    const before = await articleService.getArticleById(req.params.id);
    if (!before) throw new AppError(ErrorCode.NOT_FOUND, NOT_FOUND_MESSAGE);

    const after = await articleService.updateArticle(req.params.id, req.body, req.user.userId);

    await recordAuditLog({
      actorId: req.user.userId,
      action: "UPDATE",
      entityType: "LegalArticle",
      entityId: after._id,
      before: before.toObject(),
      after: after.toObject(),
      ip: req.ip,
    });

    return ok(res, after);
  } catch (error) {
    next(toAppError(error));
  }
};

export const changeStatus = async (req, res, next) => {
  try {
    const before = await articleService.getArticleById(req.params.id);
    if (!before) throw new AppError(ErrorCode.NOT_FOUND, NOT_FOUND_MESSAGE);

    const after = await articleService.changeArticleStatus(
      req.params.id,
      req.body,
      req.user.userId,
    );

    await recordAuditLog({
      actorId: req.user.userId,
      action: "STATUS_CHANGE",
      entityType: "LegalArticle",
      entityId: after._id,
      before: { status: before.status, isCurrent: before.isCurrent },
      after: { status: after.status, isCurrent: after.isCurrent, note: req.body.note ?? "" },
      ip: req.ip,
    });

    return ok(res, after);
  } catch (error) {
    next(toAppError(error));
  }
};

export const newVersion = async (req, res, next) => {
  try {
    const source = await articleService.getArticleById(req.params.id);
    if (!source) throw new AppError(ErrorCode.NOT_FOUND, NOT_FOUND_MESSAGE);

    const clone = await articleService.createNewVersion(req.params.id, req.user.userId);

    await recordAuditLog({
      actorId: req.user.userId,
      action: "CREATE",
      entityType: "LegalArticle",
      entityId: clone._id,
      after: { ...clone.toObject(), clonedFrom: source._id.toString() },
      ip: req.ip,
    });

    return created(res, clone);
  } catch (error) {
    next(toAppError(error));
  }
};
