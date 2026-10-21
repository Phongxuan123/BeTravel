import * as faqService from "../services/faq.service.js";
import { toAppError } from "../core/domainErrors.js";
import { recordAuditLog } from "../services/auditLog.service.js";
import { ok, created } from "../core/envelope.js";

// G6: câu hỏi lặp lại --> admin duyệt nguyên văn câu trả lời AI thành FAQ (contracts/README.md mục 10b).

export const candidates = async (req, res, next) => {
  try {
    ok(res, await faqService.listFaqCandidates({ countryCode: req.query.countryCode }));
  } catch (error) {
    next(toAppError(error));
  }
};

export const list = async (req, res, next) => {
  try {
    ok(res, await faqService.listFaqs({ status: req.query.status }));
  } catch (error) {
    next(toAppError(error));
  }
};

export const decide = async (req, res, next) => {
  try {
    const faq = await faqService.decideFaq({ ...req.body, adminId: req.user.userId });
    await recordAuditLog({
      actorId: req.user.userId,
      action: req.body.decision === "approve" ? "CREATE" : "STATUS_CHANGE",
      entityType: "ApprovedFaq",
      entityId: String(faq._id),
      after: { status: faq.status, sourceMessageId: req.body.sourceMessageId },
      ip: req.ip,
    });
    created(res, faq);
  } catch (error) {
    next(toAppError(error));
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const faq = await faqService.setFaqStatus({
      faqId: req.params.id,
      status: req.body.status,
      adminId: req.user.userId,
    });
    await recordAuditLog({
      actorId: req.user.userId,
      action: "STATUS_CHANGE",
      entityType: "ApprovedFaq",
      entityId: req.params.id,
      after: { status: faq.status },
      ip: req.ip,
    });
    ok(res, faq);
  } catch (error) {
    next(toAppError(error));
  }
};
