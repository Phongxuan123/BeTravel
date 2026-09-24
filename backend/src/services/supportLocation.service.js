import { locationCreateSchema } from "../validators/admin.validator.js";
import SupportLocation from "../models/SupportLocation.js";
import { parsePagination, buildPageMeta } from "../core/pagination.js";

export const listLocations = async (query) => {
  const pagination = parsePagination(query);
  const filter = {};
  if (query.countryCode) filter.countryCode = query.countryCode;
  if (query.type) filter.type = query.type;

  const [items, total] = await Promise.all([
    SupportLocation.find(filter).sort({ name: 1 }).skip(pagination.skip).limit(pagination.limit),
    SupportLocation.countDocuments(filter),
  ]);

  return { items, meta: buildPageMeta(pagination, total) };
};

export const getLocationById = async (id) => SupportLocation.findById(id);

export const createLocation = async (data, actorId) => {
  const payload = { ...data, createdBy: actorId, updatedBy: actorId };

  // Danh dau thoi diem kiem chung khi admin tao dia diem da verified=true ngay tu dau.
  if (payload.verified) payload.verifiedAt = new Date();

  return SupportLocation.create(payload);
};

export const updateLocation = async (id, data, actorId) => {
  const existing = await SupportLocation.findById(id);
  if (!existing) return null;
  // PATCH cũng phải giữ ít nhất một kênh liên lạc sau khi ghép với dữ liệu cũ.
  locationCreateSchema.parse({ ...existing.toObject(), ...data });
  const payload = { ...data, updatedBy: actorId };

  if (data.verified === true) payload.verifiedAt = new Date();
  if (data.verified === false) payload.verifiedAt = null;

  return SupportLocation.findByIdAndUpdate(id, payload, { returnDocument: "after" });
};

export const deleteLocation = async (id) => SupportLocation.findByIdAndDelete(id);

/*
 * Bulk import CSV (B6 muc 12) -- moi dong duoc xu ly DOC LAP, mot dong sai
 * (thieu toa do, thieu ca phone/website...) chi bi BO QUA kem ly do, khong
 * lam hong ca file import (Rule 7: xu ly loi ro rang, khong silent fail va
 * cung khong "tat ca hoac khong gi" cho thao tac hang loat tu file nguoi dung
 * tu go tay, nhieu kha nang co vai dong loi).
 */
export const bulkImportLocations = async (rows, actorId) => {
  const createdIds = [];
  const skipped = [];

  for (const [index, row] of rows.entries()) {
    const parsed = locationCreateSchema.safeParse(row);
    if (!parsed.success) {
      skipped.push({
        index,
        name: typeof row?.name === "string" ? row.name : "",
        reason: parsed.error.issues.some((issue) => issue.path[0] === "location")
          ? "Thieu toa do hop le"
          : parsed.error.issues.map((issue) => issue.message).join("; "),
      });
      continue;
    }

    try {
      const payload = { ...parsed.data, createdBy: actorId, updatedBy: actorId };
      if (payload.verified) payload.verifiedAt = new Date();
      const doc = await SupportLocation.create(payload);
      createdIds.push(doc._id);
    } catch (error) {
      skipped.push({ index, name: row.name ?? "", reason: error.message });
    }
  }

  return { createdCount: createdIds.length, createdIds, skipped };
};

export const bulkVerifyLocations = async (ids, actorId) => {
  const result = await SupportLocation.updateMany(
    { _id: { $in: ids } },
    { $set: { verified: true, verifiedAt: new Date(), updatedBy: actorId } },
  );
  return { verifiedCount: result.modifiedCount };
};
