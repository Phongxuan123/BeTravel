import { ok } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";
import * as incidentService from "../services/incident.service.js";

// Rieng cua tung user dang nhap (giong trips.controller.js) -- khong phan
// biet role, guest (chua dang nhap) khong goi toi day (route yeu cau auth).
export const get = async (req, res, next) => {
  try {
    const completedSteps = await incidentService.getProgress(req.user.userId, req.params.incidentId);
    return ok(res, { completedSteps });
  } catch (error) {
    next(toAppError(error));
  }
};

export const put = async (req, res, next) => {
  try {
    const completedSteps = await incidentService.setProgress(
      req.user.userId,
      req.params.incidentId,
      req.body.completedSteps,
    );
    return ok(res, { completedSteps });
  } catch (error) {
    next(toAppError(error));
  }
};
