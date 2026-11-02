import { riskZoneCreateSchema } from "../validators/admin.validator.js";
import { AppError, ErrorCode } from "../core/errors.js";
import RiskZone from "../models/RiskZone.js";
import { parsePagination, buildPageMeta } from "../core/pagination.js";

// ── Admin CRUD (dung voi core/adminCrudController.js) ───────────────────
export const listRiskZonesAdmin = async (query) => {
  const pagination = parsePagination(query);
  const filter = {};
  if (query.countryCode) filter.countryCode = query.countryCode;
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;

  const [items, total] = await Promise.all([
    RiskZone.find(filter).sort({ updatedAt: -1 }).skip(pagination.skip).limit(pagination.limit),
    RiskZone.countDocuments(filter),
  ]);
  return { items, meta: buildPageMeta(pagination, total) };
};

export const getRiskZoneById = async (id) => RiskZone.findById(id);

export const createRiskZone = async (data, actorId) =>
  RiskZone.create({ ...data, createdBy: actorId, updatedBy: actorId });

export const updateRiskZone = async (id, data, actorId) => {
  const existing = await RiskZone.findById(id);
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, "Không tìm thấy vùng nguy cơ");
  // PATCH co the chuyen sang 'published': kiem lai ca ban ghi sau khi ghep de khong publish vung thieu nguon.
  riskZoneCreateSchema.parse({ ...existing.toObject(), ...data });
  Object.assign(existing, data, { updatedBy: actorId });
  await existing.save();
  return existing;
};

export const deleteRiskZone = async (id) => RiskZone.findByIdAndDelete(id);

// ── Cong khai ──────────────────────────────────────────────────────────────
// So vung moi quoc gia chi vai chuc -> tra het mot lan, client tu loc theo loai.
// LUON loc status:'published'; reviewNote va truong audit khong lot ra ngoai.
export const listPublishedRiskZones = async ({ country, category }) => {
  const filter = { countryCode: country.toUpperCase(), status: "published" };
  if (category) filter.category = category;
  return RiskZone.find(filter).select("-reviewNote -createdBy -updatedBy -__v").lean();
};
