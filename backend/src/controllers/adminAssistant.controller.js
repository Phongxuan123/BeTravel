import { ok } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import { recordAuditLog } from "../services/auditLog.service.js";
import * as assistantAdminService from "../services/assistantAdmin.service.js";
import * as assistantSettingsService from "../services/assistantSettings.service.js";

// Admin tro ly AI (contracts/README.md muc 27). Controller mong: goi service, boc envelope.
const SETTINGS_ENTITY = "AssistantSettings";
const SETTINGS_ENTITY_ID = "assistant";

export const getSettings = async (req, res, next) => {
  try {
    ok(res, await assistantSettingsService.getAssistantSettings());
  } catch (error) {
    next(toAppError(error));
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const { before, after } = await assistantSettingsService.setAssistantEnabled(
      req.body.enabled,
      req.user.userId,
    );
    await recordAuditLog({
      actorId: req.user.userId,
      action: "UPDATE",
      entityType: SETTINGS_ENTITY,
      entityId: SETTINGS_ENTITY_ID,
      before,
      after,
      ip: req.ip,
    });
    ok(res, after);
  } catch (error) {
    next(toAppError(error));
  }
};

export const listMessages = async (req, res, next) => {
  try {
    const { items, meta } = await assistantAdminService.listQaLog(req.query);
    ok(res, items, meta);
  } catch (error) {
    next(toAppError(error));
  }
};

export const metrics = async (req, res, next) => {
  try {
    ok(res, await assistantAdminService.getAssistantMetrics({ days: req.query.days }));
  } catch (error) {
    next(toAppError(error));
  }
};
