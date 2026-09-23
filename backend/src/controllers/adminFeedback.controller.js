import * as feedbackService from "../services/feedback.service.js";
import { recordAuditLog } from "../services/auditLog.service.js";
import { toAppError } from "../core/domainErrors.js";
import { ok } from "../core/envelope.js";

export const list = async (req, res, next) => {
  try {
    const { items, meta } = await feedbackService.listFeedback(req.query);
    ok(res, items, meta);
  } catch (error) {
    next(toAppError(error));
  }
};

export const get = async (req, res, next) => {
  try {
    const detail = await feedbackService.getFeedbackDetail(req.params.id);
    ok(res, detail);
  } catch (error) {
    next(toAppError(error));
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const before = await feedbackService.getFeedbackDetail(req.params.id);
    const after = await feedbackService.updateFeedbackStatus(req.params.id, {
      reviewerId: req.user.userId,
      ...req.body,
    });

    await recordAuditLog({
      actorId: req.user.userId,
      action: "STATUS_CHANGE",
      entityType: "Feedback",
      entityId: after._id,
      before: { status: before.feedback.status },
      after: { status: after.status, reviewerNote: after.reviewerNote },
      ip: req.ip,
    });

    ok(res, after);
  } catch (error) {
    next(toAppError(error));
  }
};
