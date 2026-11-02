import LegalArticle from "../../models/LegalArticle.js";
import { ContentStatus } from "../../core/constants.js";

/*
 * Muc luc bai cam nang (published + isCurrent) cua mot quoc gia, dua vao buoc phan loai de mo hinh
 * chon thang bai lien quan. Kho nho (vai chuc bai) nen gui ca muc luc re hon va on dinh hon embedding.
 * Cache ngan trong RAM: bai moi xuat ban/go xuong toi da sau INDEX_TTL_MS moi vao muc luc; lop xac
 * minh cua retrieval van chan bai da go, nen cache cu khong lam lo noi dung khong hop le.
 */
const INDEX_TTL_MS = 5 * 60 * 1000;
const MAX_SUMMARY_CHARS = 140;

const cacheByCountry = new Map();

const toIndexLine = (article) => {
  const summary = (article.summaryVi ?? "").replace(/\s+/g, " ").slice(0, MAX_SUMMARY_CHARS);
  return `${article.slug} | ${article.title}${summary ? ` | ${summary}` : ""}`;
};

/** @returns {Promise<{slugs:Set<string>, text:string}>} */
export async function getArticleIndex(countryCode) {
  const cached = cacheByCountry.get(countryCode);
  if (cached && cached.expiresAt > Date.now()) return cached.index;

  const articles = await LegalArticle.find({
    countryCode,
    status: ContentStatus.PUBLISHED,
    isCurrent: true,
  })
    .select("slug title summaryVi")
    .sort({ slug: 1 })
    .lean();
  const index = {
    slugs: new Set(articles.map((article) => article.slug)),
    text: articles.map(toIndexLine).join("\n"),
  };
  cacheByCountry.set(countryCode, { index, expiresAt: Date.now() + INDEX_TTL_MS });
  return index;
}

export const __clearArticleIndexForTest = () => cacheByCountry.clear();
