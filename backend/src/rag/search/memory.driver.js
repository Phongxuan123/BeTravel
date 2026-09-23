import LegalChunk from "../../models/LegalChunk.js";
import { ContentStatus } from "../../core/constants.js";

/*
 * MemorySearchDriver -- phuong an du phong khi Atlas Search truc trac hoac
 * chua tao index (docs/00_..., B.5). Nap TOAN BO chunk vao RAM, cosine
 * similarity cho vector + so khop tu (textNorm) cho tu khoa. Cache TTL 60s,
 * invalidate ngay sau khi re-index de khong doc du lieu cu.
 *
 * Loc status:'published' o day la LOP 1 (giong filter cua $vectorSearch tren
 * Atlas that) -- van la ban sao co the cu. retrieval.js lam LOP 2 ($lookup
 * that ve legal_articles) doc lap voi driver nao dang chay.
 */
const TTL_MS = 60_000;
let cache = null;

async function loadPublishedChunks() {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache.chunks;

  const chunks = await LegalChunk.find({ status: ContentStatus.PUBLISHED }).select("+embedding").lean();
  cache = { loadedAt: Date.now(), chunks };
  return chunks;
}

export function invalidateMemorySearchCache() {
  cache = null;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Cung shape voi atlas.driver.js -- controller/retrieval.js khong biet dang chay driver nao.
function projectHit(chunk) {
  return {
    _id: String(chunk._id),
    articleId: String(chunk.articleId),
    articleSlug: chunk.articleSlug,
    articleVersion: chunk.articleVersion,
    heading: chunk.heading,
    text: chunk.text,
    textNorm: chunk.textNorm,
    kind: chunk.kind,
    countryCode: chunk.countryCode,
    topicSlug: chunk.topicSlug,
  };
}

const matchesFilter = (chunk, { countryCode, topicSlug }) =>
  chunk.countryCode === countryCode && (!topicSlug || chunk.topicSlug === topicSlug);

export function createMemorySearchDriver() {
  return {
    driver: "memory",

    async vectorSearch({ countryCode, topicSlug, queryVector, k }) {
      const chunks = await loadPublishedChunks();
      return chunks
        .filter((c) => matchesFilter(c, { countryCode, topicSlug }) && Array.isArray(c.embedding) && c.embedding.length)
        .map((c) => ({ ...projectHit(c), score: cosineSimilarity(queryVector, c.embedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
    },

    async keywordSearch({ countryCode, topicSlug, words, k }) {
      if (words.length === 0) return [];

      const chunks = await loadPublishedChunks();
      return chunks
        .filter((c) => matchesFilter(c, { countryCode, topicSlug }))
        .map((c) => {
          const matched = words.filter((w) => c.textNorm.includes(w)).length;
          return { chunk: c, matched };
        })
        .filter((x) => x.matched > 0)
        .sort((a, b) => b.matched - a.matched)
        .slice(0, k)
        .map(({ chunk, matched }) => ({ ...projectHit(chunk), score: matched / words.length }));
    },
  };
}
