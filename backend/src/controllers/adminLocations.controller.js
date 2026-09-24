import { createAdminCrudController } from "../core/adminCrudController.js";
import * as locationService from "../services/supportLocation.service.js";
import { recordAuditLog } from "../services/auditLog.service.js";
import { toAppError } from "../core/domainErrors.js";
import { ok } from "../core/envelope.js";

export const locationsController = createAdminCrudController({
  entityType: "SupportLocation",
  notFoundMessage: "Không tìm thấy địa điểm hỗ trợ",
  service: {
    list: locationService.listLocations,
    getById: locationService.getLocationById,
    create: locationService.createLocation,
    update: locationService.updateLocation,
    remove: locationService.deleteLocation,
  },
});

// Ghi MOT dong audit cho ca thao tac hang loat (khong phai tung dong) --
// tranh lam ngap audit log khi import/verify hang tram dong cung luc.
export const bulkImport = async (req, res, next) => {
  try {
    const result = await locationService.bulkImportLocations(req.body.rows, req.user.userId);
    await recordAuditLog({
      actorId: req.user.userId,
      action: "BULK_IMPORT",
      entityType: "SupportLocation",
      entityId: "bulk",
      after: { createdCount: result.createdCount, skippedCount: result.skipped.length },
      ip: req.ip,
    });
    ok(res, result);
  } catch (error) {
    next(toAppError(error));
  }
};

export const bulkVerify = async (req, res, next) => {
  try {
    const result = await locationService.bulkVerifyLocations(req.body.ids, req.user.userId);
    await recordAuditLog({
      actorId: req.user.userId,
      action: "BULK_VERIFY",
      entityType: "SupportLocation",
      entityId: "bulk",
      after: { verifiedCount: result.verifiedCount, ids: req.body.ids },
      ip: req.ip,
    });
    ok(res, result);
  } catch (error) {
    next(toAppError(error));
  }
};
