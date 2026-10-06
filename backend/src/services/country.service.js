import Country from "../models/Country.js";
import LegalArticle from "../models/LegalArticle.js";
import LegalTopic from "../models/LegalTopic.js";
import { AppError, ErrorCode } from "../core/errors.js";
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

export const updateCountry = async (id, data, actorId) => {
  const current = await Country.findById(id);
  if (!current) return null;
  if (data.code && data.code !== current.code) {
    const refs = await Promise.all([
      LegalArticle.exists({ countryCode: current.code }),
      LegalTopic.exists({ countryCode: current.code }),
    ]);
    if (refs.some(Boolean))
      throw new AppError(ErrorCode.CONFLICT, "Không đổi mã quốc gia đang có nội dung tham chiếu");
  }
  return Country.findByIdAndUpdate(
    id,
    { ...data, updatedBy: actorId },
    { returnDocument: "after", runValidators: true },
  );
};

// Giong deleteTopic: quoc gia con bai luat/chu de thi khong xoa (INV-04.10).
export const deleteCountry = async (id) => {
  const country = await Country.findById(id);
  if (!country) return null;

  const [hasArticles, hasTopics] = await Promise.all([
    LegalArticle.exists({ countryCode: country.code }),
    LegalTopic.exists({ countryCode: country.code }),
  ]);
  if (hasArticles || hasTopics) {
    throw new AppError(ErrorCode.CONFLICT, "Quốc gia đang có bài luật hoặc chủ đề, không thể xóa");
  }

  return Country.findByIdAndDelete(id);
};
