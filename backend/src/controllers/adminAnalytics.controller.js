import { getAnalyticsOverview } from "../services/analytics.service.js";
import { toAppError } from "../core/domainErrors.js";
import { ok } from "../core/envelope.js";

export const overview = async (req, res, next) => {
  try {
    // ★ validateQuery khong the "sua tai cho" req.query o Express nay --
    // req.query la getter tra ve MOT DOI TUONG MOI moi lan doc (da xac minh
    // thuc nghiem: req.query === req.query la false), nen Object.assign trong
    // validate.middleware.js ghi vao mot ban sao roi mat ngay, khong bao gio
    // toi duoc gia tri controller doc sau do. Tu coerce lai o day thay vi tin
    // req.query.days da la number (bug co truoc B5, xem docs/PROGRESS.md).
    const days = req.query.days !== undefined ? Number(req.query.days) : undefined;
    const summary = await getAnalyticsOverview({ days });
    ok(res, summary);
  } catch (error) {
    next(toAppError(error));
  }
};
