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
    const hasContact = Boolean(row.phone?.trim()) || Boolean(row.website?.trim());
    const hasCoordinates = Array.isArray(row.location?.coordinates) && row.location.coordinates.length === 2;

    if (!row.name?.trim() || !row.address?.trim() || !hasCoordinates || !hasContact) {
      skipped.push({
        index,
        name: row.name ?? "",
        reason: !hasCoordinates
          ? "Thieu toa do hop le"
          : !hasContact
            ? "Thieu ca so dien thoai va website"
            : "Thieu ten hoac dia chi",
      });
      continue;
    }

    try {
      const payload = { ...row, createdBy: actorId, updatedBy: actorId };
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
