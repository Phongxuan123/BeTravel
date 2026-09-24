import QuickPhrase from "../models/QuickPhrase.js";
import { parsePagination, buildPageMeta } from "../core/pagination.js";

// ── Admin CRUD (dung voi core/adminCrudController.js) ───────────────────
export const listQuickPhrasesAdmin = async (query) => {
  const pagination = parsePagination(query);
  const filter = {};
  if (query.countryCode) filter.countryCode = query.countryCode;

  const [items, total] = await Promise.all([
    QuickPhrase.find(filter).sort({ countryCode: 1, order: 1 }).skip(pagination.skip).limit(pagination.limit),
    QuickPhrase.countDocuments(filter),
  ]);

  return { items, meta: buildPageMeta(pagination, total) };
};

export const getQuickPhraseById = async (id) => QuickPhrase.findById(id);

export const createQuickPhrase = async (data, actorId) =>
  QuickPhrase.create({ ...data, createdBy: actorId, updatedBy: actorId });

export const updateQuickPhrase = async (id, data, actorId) =>
  QuickPhrase.findByIdAndUpdate(id, { ...data, updatedBy: actorId }, { returnDocument: "after" });

export const deleteQuickPhrase = async (id) => QuickPhrase.findByIdAndDelete(id);

// ── Cong khai (/api/quick-phrases) ───────────────────────────────────────
export const listQuickPhrasesForCountry = async (countryCode) =>
  QuickPhrase.find({ countryCode: countryCode.trim().toUpperCase() }).sort({ order: 1 });
