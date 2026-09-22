import Country from "../models/Country.js";
import { parsePagination, buildPageMeta } from "../core/pagination.js";

export const listCountries = async (query) => {
  const pagination = parsePagination(query);
  const filter = query.status ? { status: query.status } : {};

  const [items, total] = await Promise.all([
    Country.find(filter).sort({ code: 1 }).skip(pagination.skip).limit(pagination.limit),
    Country.countDocuments(filter),
  ]);

  return { items, meta: buildPageMeta(pagination, total) };
};

export const getCountryById = async (id) => Country.findById(id);

export const createCountry = async (data, actorId) =>
  Country.create({ ...data, createdBy: actorId, updatedBy: actorId });

export const updateCountry = async (id, data, actorId) =>
  Country.findByIdAndUpdate(id, { ...data, updatedBy: actorId }, { returnDocument: "after" });

export const deleteCountry = async (id) => Country.findByIdAndDelete(id);
