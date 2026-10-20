import LegalChunk from "../../models/LegalChunk.js";
import { ContentStatus } from "../../core/constants.js";
import { env } from "../../core/env.js";
import { foldDStroke } from "../../utils/textNormalize.js";
import { tokenize, inverseDocumentFrequency } from "../lexical.js";

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

  // Chế độ lexical không dùng vector nên khỏi nạp 768 số mỗi chunk vào RAM.
  const query = LegalChunk.find({ status: ContentStatus.PUBLISHED });
  const chunks = await (env.RETRIEVAL_MODE === "lexical" ? query : query.select("+embedding")).lean();
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
    articleId: chunk.articleId ? String(chunk.articleId) : null,
    articleSlug: chunk.articleSlug,
    articleVersion: chunk.articleVersion,
    sourceType: chunk.sourceType,
    titleId: chunk.titleId,
    registerId: chunk.registerId,
    lawName: chunk.lawName,
    sectionRef: chunk.sectionRef,
    partHeading: chunk.partHeading,
    officialUrl: chunk.officialUrl,
    effectiveFrom: chunk.effectiveFrom,
    heading: chunk.heading,
    text: chunk.text,
    textNorm: chunk.textNorm,
    kind: chunk.kind,
    embeddingModel: chunk.embeddingModel,
    countryCode: chunk.countryCode,
    topicSlug: chunk.topicSlug,
  };
}

const matchesFilter = (chunk, { countryCode, topicSlug }) =>
  chunk.countryCode === countryCode && (!topicSlug || chunk.topicSlug === topicSlug);

// Tập từ đã chuẩn hoá của chunk, tính một lần và giữ cùng vòng đời với cache.
const tokenSetOf = (chunk) => {
  // Tên luật/phần được tính như một phần nội dung: câu hỏi nêu tên luật phải ưu tiên luật đó.
  if (!chunk.tokenSet) {
    chunk.tokenSet = new Set(tokenize(`${chunk.lawName ?? ""} ${chunk.partHeading ?? ""} ${chunk.textNorm}`));
  }
  return chunk.tokenSet;
};

export function createMemorySearchDriver() {
  return {
    driver: "memory",

    async vectorSearch({ countryCode, topicSlug, queryVector, k }) {
      const chunks = await loadPublishedChunks();
      return chunks
        .filter(
          (c) =>
            matchesFilter(c, { countryCode, topicSlug }) &&
            Array.isArray(c.embedding) &&
            c.embedding.length,
        )
        .map((c) => ({ ...projectHit(c), score: cosineSimilarity(queryVector, c.embedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
    },

    /*
     * Tìm theo từ khoá có trọng số IDF (RETRIEVAL_MODE=lexical). `terms` là các từ đã chuẩn hoá;
     * score = tổng IDF từ khoá chunk chứa / tổng IDF mọi từ khoá, nằm trong [0, 1].
     * IDF tính trên các chunk CÙNG quốc gia để kho luật tiếng Anh không bị lệch bởi kho tiếng Việt.
     */
    async lexicalSearch({ countryCode, topicSlug, terms, k }) {
      if (terms.length === 0) return [];

      const chunks = (await loadPublishedChunks()).filter((c) => c.countryCode === countryCode);
      const idfByTerm = terms.map((term) => {
        const frequency = chunks.filter((c) => tokenSetOf(c).has(term)).length;
        return inverseDocumentFrequency(chunks.length, frequency);
      });
      const totalIdf = idfByTerm.reduce((sum, idf) => sum + idf, 0);

      return chunks
        .filter((c) => !topicSlug || c.topicSlug === topicSlug)
        .map((c) => {
          const tokens = tokenSetOf(c);
          const matchedIdf = terms.reduce(
            (sum, term, i) => sum + (tokens.has(term) ? idfByTerm[i] : 0),
            0,
          );
          return { chunk: c, score: totalIdf > 0 ? matchedIdf / totalIdf : 0 };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map(({ chunk, score }) => ({ ...projectHit(chunk), score }));
    },

    async keywordSearch({ countryCode, topicSlug, words, k }) {
      if (words.length === 0) return [];

      const chunks = await loadPublishedChunks();
      const foldedWords = words.map(foldDStroke);
      return chunks
        .filter((c) => matchesFilter(c, { countryCode, topicSlug }))
        .map((c) => {
          const folded = foldDStroke(c.textNorm);
          const matched = foldedWords.filter((w) => folded.includes(w)).length;
          return { chunk: c, matched };
        })
        .filter((x) => x.matched > 0)
        .sort((a, b) => b.matched - a.matched)
        .slice(0, k)
        .map(({ chunk, matched }) => ({ ...projectHit(chunk), score: matched / words.length }));
    },
  };
}
