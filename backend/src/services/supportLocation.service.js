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
