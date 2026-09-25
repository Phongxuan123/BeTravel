import Favorite from "../models/Favorite.js";
import LegalArticle from "../models/LegalArticle.js";
import SupportLocation from "../models/SupportLocation.js";
import IncidentType from "../models/IncidentType.js";
import { AppError, ErrorCode } from "../core/errors.js";

const TARGET_MODEL = { article: LegalArticle, location: SupportLocation, incident: IncidentType };

/*
 * Bai da bi thay the (isCurrent:false) VAN duoc tra ve kem co isOutdated +
 * currentArticleId tro toi ban hien hanh cung dong lich su (countryCode,slug)
 * -- khong bao gio am tham xoa favorite cua nguoi dung chi vi noi dung da co
 * ban moi hon (PROMPT B8 muc 12).
 */
async function attachCurrentVersions(articles) {
  const outdated = articles.filter((a) => !a.isCurrent);
  if (outdated.length === 0) return new Map();

  const currents = await LegalArticle.find({
    isCurrent: true,
    $or: outdated.map((a) => ({ countryCode: a.countryCode, slug: a.slug })),
  })
    .select("countryCode slug")
    .lean();

  return new Map(currents.map((c) => [`${c.countryCode}:${c.slug}`, c]));
}

export const listFavorites = async (userId) => {
  const favorites = await Favorite.find({ userId }).sort({ createdAt: -1 }).lean();
  if (favorites.length === 0) return [];

  const idsByType = { article: [], location: [], incident: [] };
  favorites.forEach((f) => idsByType[f.targetType].push(f.targetId));

  const [articles, locations, incidents] = await Promise.all([
    idsByType.article.length ? LegalArticle.find({ _id: { $in: idsByType.article } }).lean() : [],
    idsByType.location.length ? SupportLocation.find({ _id: { $in: idsByType.location } }).lean() : [],
    idsByType.incident.length ? IncidentType.find({ _id: { $in: idsByType.incident } }).lean() : [],
  ]);

  const currentByLineage = await attachCurrentVersions(articles);
  const articleById = new Map(articles.map((a) => [String(a._id), a]));
  const locationById = new Map(locations.map((l) => [String(l._id), l]));
  const incidentById = new Map(incidents.map((i) => [String(i._id), i]));

  return favorites
    .map((f) => {
      const key = String(f.targetId);
      const base = { _id: String(f._id), targetType: f.targetType, targetId: key, createdAt: f.createdAt };

      if (f.targetType === "article") {
        const article = articleById.get(key);
        if (!article) return null;
        const current = !article.isCurrent ? currentByLineage.get(`${article.countryCode}:${article.slug}`) : null;
        return { ...base, article, isOutdated: !article.isCurrent, currentArticleId: current ? String(current._id) : null };
      }
      if (f.targetType === "location") {
        const location = locationById.get(key);
        return location ? { ...base, location } : null;
      }
      const incident = incidentById.get(key);
      return incident ? { ...base, incident } : null;
    })
    .filter(Boolean);
};

export const createFavorite = async (userId, { targetType, targetId }) => {
  const Model = TARGET_MODEL[targetType];
  const exists = await Model.exists({ _id: targetId });
  if (!exists) throw new AppError(ErrorCode.NOT_FOUND, "Không tìm thấy nội dung để lưu");

  try {
    return await Favorite.create({ userId, targetType, targetId });
  } catch (error) {
    // Da luu tu truoc (unique index) -- coi nhu thanh cong, khong bao loi trung.
    if (error.code === 11000) return Favorite.findOne({ userId, targetType, targetId });
    throw error;
  }
};

export const removeFavorite = async (userId, targetType, targetId) => {
  await Favorite.deleteOne({ userId, targetType, targetId });
};
