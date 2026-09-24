import IncidentType from "../models/IncidentType.js";
import UserIncidentProgress from "../models/UserIncidentProgress.js";
import { parsePagination, buildPageMeta } from "../core/pagination.js";
import { AppError, ErrorCode } from "../core/errors.js";

// Ep lai order theo dung vi tri trong mang -- admin keo tha/them/xoa buoc chi
// can gui dung THU TU mong muon, khong phai tu tay dien so order.
const withNormalizedStepOrder = (steps = []) => steps.map((step, index) => ({ ...step, order: index }));

// ── Admin CRUD (dung voi core/adminCrudController.js) ───────────────────
export const listIncidentsAdmin = async (query) => {
  const pagination = parsePagination(query);
  const filter = {};
  if (query.countryCode) filter.countryCode = query.countryCode;
  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    IncidentType.find(filter).sort({ title: 1 }).skip(pagination.skip).limit(pagination.limit),
    IncidentType.countDocuments(filter),
  ]);

  return { items, meta: buildPageMeta(pagination, total) };
};

export const getIncidentById = async (id) => IncidentType.findById(id);

export const createIncident = async (data, actorId) =>
  IncidentType.create({
    ...data,
    steps: withNormalizedStepOrder(data.steps),
    createdBy: actorId,
    updatedBy: actorId,
  });

export const updateIncident = async (id, data, actorId) => {
  const payload = { ...data, updatedBy: actorId };
  if (data.steps) payload.steps = withNormalizedStepOrder(data.steps);
  return IncidentType.findByIdAndUpdate(id, payload, { returnDocument: "after" });
};

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

  return IncidentType.find(filter).sort({ urgent: -1, title: 1 });
};

export const getIncidentBySlug = async (slug) =>
  IncidentType.findOne({ slug: slug.trim().toLowerCase(), status: "published" });

// ── Tien do rieng tung user (B7 muc 5) ───────────────────────────────────
export const getProgress = async (userId, incidentId) => {
  const progress = await UserIncidentProgress.findOne({ userId, incidentId }).lean();
  return progress?.completedSteps ?? [];
};

// Chi chap nhan step.order THAT SU ton tai trong workflow hien hanh -- workflow
// co the da duoc admin sua (bot buoc) sau lan nguoi dung tick truoc do.
export const setProgress = async (userId, incidentId, completedSteps) => {
  const incident = await IncidentType.findById(incidentId).select("steps");
  if (!incident) throw new AppError(ErrorCode.NOT_FOUND, "Không tìm thấy hướng dẫn xử lý sự cố");

  const validOrders = new Set(incident.steps.map((step) => step.order));
  const cleaned = [...new Set(completedSteps)].filter((order) => validOrders.has(order));

  const updated = await UserIncidentProgress.findOneAndUpdate(
    { userId, incidentId },
    { $set: { completedSteps: cleaned } },
    { upsert: true, returnDocument: "after" },
  );
  return updated.completedSteps;
};
