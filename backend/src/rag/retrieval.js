import { env } from "../core/env.js";
import { ContentStatus, FallbackReason } from "../core/constants.js";
import { normalizeVi } from "../utils/textNormalize.js";
import { getEmbeddingProvider } from "./embedding/index.js";
import { getSearchDriver } from "./search/index.js";
import LegalChunk from "../models/LegalChunk.js";
import LegalArticle from "../models/LegalArticle.js";
import { rrf } from "./rrf.js";

const FOCUS_ARTICLE_WEIGHT = 0.5;
const VECTOR_WEIGHT = 0.7;
const KEYWORD_WEIGHT = 0.3;

async function fetchFocusArticleChunks(focusArticleId) {
  if (!focusArticleId) return [];

  const chunks = await LegalChunk.find({ articleId: focusArticleId, status: ContentStatus.PUBLISHED })
    .sort({ order: 1 })
    .lean();

  return chunks.map((c) => ({
    _id: String(c._id),
    articleId: String(c.articleId),
    articleSlug: c.articleSlug,
    articleVersion: c.articleVersion,
    heading: c.heading,
    text: c.text,
    textNorm: c.textNorm,
    kind: c.kind,
    countryCode: c.countryCode,
    topicSlug: c.topicSlug,
  }));
}

/*
 * LOP PHONG THU THU HAI -- KHONG BAO GIO tin field `status` copy tren chunk
 * (job purge_chunks co the that bai giua chung, de lai chunk "mo côi" cua bai
 * da bi go/superseded nhung van con trong index/cache). Xac minh lai bang mot
 * truy van THAT ve legal_articles, chi giu chunk thuoc bai dang THAT SU
 * published + isCurrent, va lay luon sources/title de dung citation
 * (CLAUDE.md muc 4.2, buoc 2).
 */
async function verifyAgainstArticles(chunks) {
  const articleIds = [...new Set(chunks.map((c) => c.articleId))];
  if (articleIds.length === 0) return { verifiedChunks: [], articleById: new Map() };

  const articles = await LegalArticle.find({
    _id: { $in: articleIds },
    status: ContentStatus.PUBLISHED,
    isCurrent: true,
  })
    .select("title sources effectiveFrom updatedAt")
    .lean();

  const articleById = new Map(articles.map((a) => [String(a._id), a]));
  const verifiedChunks = chunks.filter((c) => articleById.has(c.articleId));

  return { verifiedChunks, articleById };
}

function toCitation(chunk, article, marker) {
  const primarySource = article.sources?.[0];
  return {
    marker,
    articleId: chunk.articleId,
    articleSlug: chunk.articleSlug,
    title: article.title,
    heading: chunk.heading,
    text: chunk.text,
    kind: chunk.kind,
    authority: primarySource?.authority ?? "",
    effectiveFrom: article.effectiveFrom ?? null,
    updatedAt: article.updatedAt,
  };
}

/**
 * Pipeline RAG day du: embed cau hoi -> vector+keyword search song song ->
 * NGUONG chan TRUOC khi goi LLM (tiet kiem tien, dung nghiep vu) -> RRF hop
 * nhat -> lop phong thu thu hai ($lookup that) -> gan marker S1..Sn.
 *
 * @returns {{passed:boolean, reason:string|null, topScore:number,
 *   chunks:Array, retrievedMap:Map<string,object>}}
 */
export async function retrieve({ question, countryCode, topicSlug, focusArticleId }) {
  const embeddingProvider = getEmbeddingProvider();
  const [queryVector] = await embeddingProvider.embedBatch([question]);
  const words = normalizeVi(question).split(/\s+/).filter(Boolean);

  const driver = getSearchDriver();
  const [vectorHits, keywordHits] = await Promise.all([
    driver.vectorSearch({ countryCode, topicSlug, queryVector, k: env.RAG_TOP_K }),
    driver.keywordSearch({ countryCode, topicSlug, words, k: env.RAG_TOP_K }),
  ]);

  // ★ Nguong ap len score GOC cua vector search, KHONG ap len fusedScore
  // (fusedScore chi co y nghia tuong doi giua cac chunk, khong tuyet doi).
  const topScore = vectorHits[0]?.score ?? 0;
  const countAboveSoft = vectorHits.filter((h) => h.score >= env.RAG_MIN_SOFT_SCORE).length;
  const passed = topScore >= env.RAG_MIN_TOP_SCORE && countAboveSoft >= env.RAG_MIN_CHUNKS;

  if (!passed) {
    return { passed: false, reason: FallbackReason.INSUFFICIENT_EVIDENCE, topScore, chunks: [], retrievedMap: new Map() };
  }

  const focusChunks = await fetchFocusArticleChunks(focusArticleId);
  const fusedLists = [
    { items: vectorHits, weight: VECTOR_WEIGHT },
    { items: keywordHits, weight: KEYWORD_WEIGHT },
    ...(focusChunks.length ? [{ items: focusChunks, weight: FOCUS_ARTICLE_WEIGHT }] : []),
  ];
  const fused = rrf(fusedLists).slice(0, env.RAG_TOP_K);

  const { verifiedChunks, articleById } = await verifyAgainstArticles(fused);

  if (verifiedChunks.length === 0) {
    return { passed: false, reason: FallbackReason.INSUFFICIENT_EVIDENCE, topScore, chunks: [], retrievedMap: new Map() };
  }

  const retrievedMap = new Map();
  const chunks = verifiedChunks.map((chunk, index) => {
    const marker = `S${index + 1}`;
    const citation = toCitation(chunk, articleById.get(chunk.articleId), marker);
    retrievedMap.set(marker, citation);
    return citation;
  });

  return { passed: true, reason: null, topScore, chunks, retrievedMap };
}
