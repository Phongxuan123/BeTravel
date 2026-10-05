import crypto from "node:crypto";
import IncidentType from "../models/IncidentType.js";
import UserIncidentProgress from "../models/UserIncidentProgress.js";
import { parsePagination, buildPageMeta } from "../core/pagination.js";
import { AppError, ErrorCode } from "../core/errors.js";

// Ep lai order theo dung vi tri trong mang -- admin keo tha/them/xoa buoc chi
// can gui dung THU TU mong muon, khong phai tu tay dien so order.
const withNormalizedStepOrder = (steps = []) => {
  const normalized = steps.map((step, index) => ({
    ...step,
    stepId: step.stepId ?? crypto.randomUUID(),
    order: index,
  }));
  if (new Set(normalized.map((step) => step.stepId)).size !== normalized.length)
    throw new AppError(ErrorCode.VALIDATION_ERROR, "ID bước xử lý không được trùng");
  return normalized;
};

// ── Admin CRUD (dung voi core/adminCrudController.js) ───────────────────
export const listIncidentsAdmin = async (query) => {
  const pagination = parsePagination(query);
  const filter = {};
  if (query.countryCode) filter.countryCode = query.countryCode;
  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    IncidentType.find(filter)
      .sort({ title: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    IncidentType.countDocuments(filter),
  ]);

  return { items: items.map(stableSteps), meta: buildPageMeta(pagination, total) };
};

const stableSteps = (incident) =>
  incident
    ? {
        ...incident,
        steps: incident.steps.map((step) => ({
          ...step,
          stepId: step.stepId ?? `legacy-${incident._id}-${step.order}`,
        })),
      }
    : null;
export const getIncidentById = async (id) => stableSteps(await IncidentType.findById(id).lean());

export const createIncident = async (data, actorId) =>
  IncidentType.create({
    ...data,
    steps: withNormalizedStepOrder(data.steps),
    createdBy: actorId,
    updatedBy: actorId,
  });

export const updateIncident = async (id, data, actorId) =>
  IncidentType.db.transaction(async (session) => {
    const current = stableSteps(await IncidentType.findById(id).session(session).lean());
    if (!current) throw new AppError(ErrorCode.NOT_FOUND, "Không tìm thấy hướng dẫn xử lý sự cố");
    if (!data.updatedAt || new Date(data.updatedAt).getTime() !== current.updatedAt.getTime()) {
      throw new AppError(
        ErrorCode.CONFLICT,
        "Hướng dẫn đã được sửa hoặc thiếu phiên bản. Tải lại trước khi lưu.",
      );
    }
    const { updatedAt, ...fields } = data;
    const payload = { ...fields, updatedBy: actorId };
    if (data.steps) {
      payload.steps = withNormalizedStepOrder(data.steps);
      const ids = payload.steps.map((step) => step.stepId);
      if (new Set(ids).size !== ids.length)
        throw new AppError(ErrorCode.VALIDATION_ERROR, "ID bước xử lý không được trùng");
      // Translate numeric legacy progress BEFORE the old order is changed.
      const progress = await UserIncidentProgress.find({ incidentId: id }).session(session);
      for (const item of progress) {
        item.completedSteps = cleanCompletedSteps(current, item.completedSteps);
        await item.save({ session });
      }
    }
    const updated = await IncidentType.findOneAndUpdate(
      { _id: id, updatedAt: new Date(updatedAt) },
      payload,
      { returnDocument: "after", runValidators: true, session },
    ).lean();
    if (!updated)
      throw new AppError(ErrorCode.CONFLICT, "Hướng dẫn đã được sửa. Tải lại trước khi lưu.");
    return stableSteps(updated);
  });

export const deleteIncident = async (id) => IncidentType.findByIdAndDelete(id);

// ── Cong khai (B7 muc 2) ─────────────────────────────────────────────────
// Gop workflow toan cuc (countryCode:null, ap dung moi noi) voi workflow
// rieng cho quoc gia dang chon. Quoc gia chua co workflow rieng van thay duoc
// nhom toan cuc -- khong bao gio tra mang rong tuyet doi neu da co du lieu global.
export const listIncidentsForCountry = async (countryCode) => {
  const code = countryCode?.trim().toUpperCase();
  const filter = code
    ? { status: "published", $or: [{ countryCode: code }, { countryCode: null }] }
    : { status: "published", countryCode: null };

  return (
    await IncidentType.find(filter)
      .select("-createdBy -updatedBy")
      .sort({ urgent: -1, title: 1 })
      .lean()
  ).map(stableSteps);
};

export const getIncidentBySlug = async (slug) =>
  stableSteps(
    await IncidentType.findOne({ slug: slug.trim().toLowerCase(), status: "published" })
      .select("-createdBy -updatedBy")
      .lean(),
  );

// ── Tien do rieng tung user (B7 muc 5) ───────────────────────────────────
export const getProgress = async (userId, incidentId) => {
  const incident = await getPublishedIncident(incidentId);
  const progress = await UserIncidentProgress.findOne({ userId, incidentId }).lean();
  return cleanCompletedSteps(incident, progress?.completedSteps ?? []);
};

// Chi chap nhan step.order THAT SU ton tai trong workflow hien hanh -- workflow
// co the da duoc admin sua (bot buoc) sau lan nguoi dung tick truoc do.
export const setProgress = async (userId, incidentId, completedSteps) => {
  const incident = await getPublishedIncident(incidentId);
  const cleaned = cleanCompletedSteps(incident, completedSteps);

  const updated = await UserIncidentProgress.findOneAndUpdate(
    { userId, incidentId },
    { $set: { completedSteps: cleaned } },
    { upsert: true, returnDocument: "after" },
  );
  return updated.completedSteps;
};

// Không cho dò các bước của bản nháp qua endpoint tiến độ riêng tư.
async function getPublishedIncident(incidentId) {
  const incident = await IncidentType.findOne({ _id: incidentId, status: "published" })
    .select("steps")
    .lean();
  if (!incident) throw new AppError(ErrorCode.NOT_FOUND, "Không tìm thấy hướng dẫn xử lý sự cố");
  return stableSteps(incident);
}

function cleanCompletedSteps(incident, completedSteps) {
  const validIds = new Set(incident.steps.map((step) => step.stepId));
  const ids = completedSteps.map((value) =>
    typeof value === "number" ? incident.steps.find((step) => step.order === value)?.stepId : value,
  );
  return [...new Set(ids)].filter((id) => validIds.has(id));
}
