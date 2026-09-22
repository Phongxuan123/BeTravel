import { ok, created } from "./envelope.js";
import { toAppError } from "./domainErrors.js";
import { AppError, ErrorCode } from "./errors.js";
import { recordAuditLog } from "../services/auditLog.service.js";

/*
 * List/Get/Create/Update/Delete cho Country, LegalTopic, SupportLocation deu
 * cung mot khuon: goi service tuong ung + ghi audit log giong het nhau. Gom
 * thanh factory de khong lap code 3 lan (Rule 3) -- LegalArticle KHONG dung
 * factory nay vi co logic rieng (may trang thai, optimistic concurrency,
 * versioning) khac han CRUD don gian.
 */
export const createAdminCrudController = ({ entityType, notFoundMessage, service }) => {
  const list = async (req, res, next) => {
    try {
      const { items, meta } = await service.list(req.query);
      return ok(res, items, meta);
    } catch (error) {
      next(toAppError(error));
    }
  };

  const get = async (req, res, next) => {
    try {
      const entity = await service.getById(req.params.id);
      if (!entity) throw new AppError(ErrorCode.NOT_FOUND, notFoundMessage);
      return ok(res, entity);
    } catch (error) {
      next(toAppError(error));
    }
  };

  const create = async (req, res, next) => {
    try {
      const entity = await service.create(req.body, req.user.userId);

      await recordAuditLog({
        actorId: req.user.userId,
        action: "CREATE",
        entityType,
        entityId: entity._id,
        after: entity.toObject(),
        ip: req.ip,
      });

      return created(res, entity);
    } catch (error) {
      next(toAppError(error));
    }
  };

  const update = async (req, res, next) => {
    try {
      const before = await service.getById(req.params.id);
      if (!before) throw new AppError(ErrorCode.NOT_FOUND, notFoundMessage);

      const after = await service.update(req.params.id, req.body, req.user.userId);

      await recordAuditLog({
        actorId: req.user.userId,
        action: "UPDATE",
        entityType,
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

  const remove = async (req, res, next) => {
    try {
      const before = await service.getById(req.params.id);
      if (!before) throw new AppError(ErrorCode.NOT_FOUND, notFoundMessage);

      await service.remove(req.params.id);

      await recordAuditLog({
        actorId: req.user.userId,
        action: "DELETE",
        entityType,
        entityId: before._id,
        before: before.toObject(),
        ip: req.ip,
      });

      return ok(res, { deleted: true });
    } catch (error) {
      next(toAppError(error));
    }
  };

  return { list, get, create, update, remove };
};
