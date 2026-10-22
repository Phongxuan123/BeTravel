import { env } from "../core/env.js";
import { ContentStatus, FallbackReason } from "../core/constants.js";
import { normalizeVi } from "../utils/textNormalize.js";
import { getEmbeddingProvider, isLexicalMode } from "./embedding/index.js";
import { getQuestionKeywords } from "./queryRewrite.js";
import { uniqueTerms } from "./lexical.js";
import { getSearchDriver } from "./search/index.js";
import LegalChunk from "../models/LegalChunk.js";
import LegalArticle from "../models/LegalArticle.js";
import AuRegisterCheck from "../models/AuRegisterCheck.js";
import { isCuratedTitle } from "../core/auLawTopics.js";
import { getCurrentRegisterId } from "../services/australiaLegislation.service.js";
import { rrf } from "./rrf.js";

const AU_SOURCE_TYPE = "au_legislation";
const AU_AUTHORITY = "Federal Register of Legislation (Úc)";
const isAuChunk = (chunk) => chunk.sourceType === AU_SOURCE_TYPE;

/*
 * Nguồn luật Úc chập chờn (timeout, lỗi pool phía họ): nếu mỗi câu hỏi phải chờ nguồn trả lời thì
 * AI chậm hàng chục giây rồi từ chối dù luật không đổi. Nên nhớ mã bản hiện hành đã tra THÀNH CÔNG
 * gần nhất, cả trong RAM lẫn DB (giữ qua lần khởi động lại): còn trong AU_REGISTER_MAX_STALE_HOURS
 * thì dùng ngay và tra lại ở nền (lần tra mới ghi đè kết quả cho câu sau). Chưa từng tra được, hoặc
 * quá hạn, thì vẫn chờ nguồn và fail-closed như cũ.
 */
const MS_PER_HOUR = 3_600_000;
const lastVerifiedRegister = new Map();

const dbRegisterStore = {
  load: (titleId) => AuRegisterCheck.findOne({ titleId }).lean(),
  save: (titleId, registerId, verifiedAt) =>
    AuRegisterCheck.updateOne({ titleId }, { $set: { registerId, verifiedAt } }, { upsert: true }),
};
// Test thay hàm tra nguồn thì mặc định không đọc/ghi DB, để kết quả không lọt sang test khác.
const noRegisterStore = { load: async () => null, save: async () => {} };

// Tra mã bản biên soạn hiện hành của luật Úc; thay được trong test để không gọi mạng.
let currentRegisterLookup = getCurrentRegisterId;
let registerStore = dbRegisterStore;
export const __setAuRegisterLookupForTest = (lookup, { store } = {}) => {
  currentRegisterLookup = lookup ?? getCurrentRegisterId;
  registerStore = lookup ? (store ?? noRegisterStore) : dbRegisterStore;
  lastVerifiedRegister.clear();
};
export const __swapAuRegisterLookupKeepMemoryForTest = (lookup) => {
  currentRegisterLookup = lookup;
};
// Mô phỏng khởi động lại: mất bộ nhớ RAM, còn DB.
export const __forgetAuRegisterMemoryForTest = () => lastVerifiedRegister.clear();

const lookupLiveRegister = async (titleId) => {
  const registerId = await currentRegisterLookup(titleId);
  if (registerId) {
    const verifiedAt = new Date();
    lastVerifiedRegister.set(titleId, { registerId, verifiedAt });
    await registerStore
      .save(titleId, registerId, verifiedAt)
      .catch((error) => console.error("[rag] không lưu được mã bản luật Úc:", error.message));
  }
  return registerId;
};

async function knownRegister(titleId) {
  const inMemory = lastVerifiedRegister.get(titleId);
  if (inMemory) return inMemory;
  const stored = await registerStore.load(titleId).catch(() => null);
  if (stored) lastVerifiedRegister.set(titleId, stored);
  return stored;
}

// Chưa có kết quả xác minh còn hạn: chờ nguồn tối đa AU_REGISTER_LOOKUP_BUDGET_MS. Quá hạn thì coi
// như chưa xác minh được (loại chunk, fail-closed) nhưng vẫn để lần tra chạy tiếp ở nền, lần hỏi
// sau dùng được kết quả. Không để một nguồn chậm giữ người dùng chờ cả phút.
const waitForLiveRegister = (titleId) => {
  const live = lookupLiveRegister(titleId);
  live.catch(() => {});
  const budgetExpired = new Promise((resolve) => {
    setTimeout(() => resolve(null), env.AU_REGISTER_LOOKUP_BUDGET_MS).unref?.();
  });
  return Promise.race([live, budgetExpired]);
};

async function lookupCurrentRegister(titleId) {
  const known = await knownRegister(titleId);
  const ageMs = known ? Date.now() - new Date(known.verifiedAt).getTime() : Infinity;
  const knownIsFresh = ageMs < env.AU_REGISTER_MAX_STALE_HOURS * MS_PER_HOUR;
  if (!knownIsFresh) return waitForLiveRegister(titleId);
  // Tra lại ở nền; lỗi nền không ảnh hưởng câu trả lời hiện tại.
  lookupLiveRegister(titleId).catch(() => {});
  return known.registerId;
}

/*
 * Gọi khi server khởi động (không chờ): xác minh trước mọi luật Úc đã index, tuần tự để không dồn
 * tải lên nguồn. Nhờ vậy câu hỏi đầu tiên sau khi server thức không phải đợi nguồn luật Úc.
 */
export async function warmAuRegisterChecks() {
  const titleIds = (await LegalChunk.distinct("titleId", { sourceType: AU_SOURCE_TYPE })).filter(
    isCuratedTitle,
  );
  let verified = 0;
  for (const titleId of titleIds) {
    if (await lookupCurrentRegister(titleId).catch(() => null)) verified += 1;
  }
  console.log(`[rag] xác minh trước luật Úc: ${verified}/${titleIds.length}`);
}

const FOCUS_ARTICLE_WEIGHT = 0.5;
const VECTOR_WEIGHT = 0.7;
const KEYWORD_WEIGHT = 0.3;

async function fetchFocusArticleChunks(focusArticleId, countryCode) {
  if (!focusArticleId) return [];

  const chunks = await LegalChunk.find({
    articleId: focusArticleId,
    countryCode,
    status: ContentStatus.PUBLISHED,
  })
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
async function verifyAgainstArticles(chunks, countryCode) {
  const articleIds = [...new Set(chunks.map((c) => c.articleId))];
  if (articleIds.length === 0) return { verifiedChunks: [], articleById: new Map() };

  const articles = await LegalArticle.find({
    _id: { $in: articleIds },
    status: ContentStatus.PUBLISHED,
    isCurrent: true,
    countryCode,
  })
    .select("title sources effectiveFrom updatedAt version")
    .lean();

  const articleById = new Map(articles.map((a) => [String(a._id), a]));
  const verifiedChunks = chunks.filter(
    (c) => articleById.get(c.articleId)?.version === c.articleVersion,
  );

  return { verifiedChunks, articleById };
}

/*
 * Chunk luật gốc Úc KHÔNG thuộc legal_articles nên xác minh bằng cách khác, cùng tinh thần
 * "không tin bản sao trên chunk": (1) luật còn nằm trong danh sách tuyển chọn, (2) registerId
 * của chunk đúng là bản biên soạn HIỆN HÀNH tra từ nguồn (hoặc kết quả tra thành công gần đây,
 * xem lookupCurrentRegister). Không tra được thì loại chunk (fail-closed).
 */
async function verifyAuChunks(chunks) {
  const titleIds = [...new Set(chunks.map((chunk) => chunk.titleId))].filter(isCuratedTitle);
  const currentByTitle = new Map(
    await Promise.all(
      titleIds.map(async (titleId) => {
        try {
          return [titleId, await lookupCurrentRegister(titleId)];
        } catch {
          return [titleId, null];
        }
      }),
    ),
  );
  return chunks.filter((chunk) => {
    const current = currentByTitle.get(chunk.titleId);
    return Boolean(current) && current === chunk.registerId;
  });
}

// Xác minh theo loại nguồn của từng chunk; giữ nguyên thứ tự đầu vào.
async function verifyChunks(chunks, countryCode) {
  const [articleResult, verifiedAuChunks] = await Promise.all([
    verifyAgainstArticles(
      chunks.filter((chunk) => !isAuChunk(chunk)),
      countryCode,
    ),
    verifyAuChunks(chunks.filter(isAuChunk)),
  ]);
  const verifiedIds = new Set(
    [...articleResult.verifiedChunks, ...verifiedAuChunks].map((chunk) => String(chunk._id)),
  );
  return {
    verifiedChunks: chunks.filter((chunk) => verifiedIds.has(String(chunk._id))),
    articleById: articleResult.articleById,
  };
}

function toAuCitation(chunk, marker) {
  return {
    marker,
    chunkId: String(chunk._id),
    articleId: null,
    articleSlug: "",
    title: chunk.lawName,
    heading: chunk.heading,
    text: chunk.text,
    kind: chunk.kind,
    authority: AU_AUTHORITY,
    effectiveFrom: chunk.effectiveFrom ?? null,
    updatedAt: chunk.effectiveFrom ?? null,
    sourceType: AU_SOURCE_TYPE,
    officialUrl: chunk.officialUrl ?? "",
  };
}

function toCitation(chunk, article, marker) {
  if (isAuChunk(chunk)) return toAuCitation(chunk, marker);
  const primarySource = article.sources?.[0];
  return {
    marker,
    chunkId: String(chunk._id),
    articleId: chunk.articleId,
    articleSlug: chunk.articleSlug,
    title: article.title,
    heading: chunk.heading,
    text: chunk.text,
    kind: chunk.kind,
    authority: primarySource?.authority ?? "",
    effectiveFrom: article.effectiveFrom ?? null,
    updatedAt: article.updatedAt,
    sourceType: "article",
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
/*
 * Kiểm một danh sách nguồn đã ghi phiên bản (FAQ đã duyệt, G6) còn hiệu lực không, theo đúng tinh thần
 * lớp phòng thủ thứ hai: bài phải THẬT SỰ published + isCurrent và đúng version; luật Úc phải còn trong
 * danh sách tuyển chọn và registerId vẫn là bản hiện hành. Tra cứu lỗi --> coi như hết hiệu lực.
 */
export async function areSourcesCurrent(sources) {
  if (sources.length === 0) return false;
  const articleSources = sources.filter((source) => source.sourceType !== AU_SOURCE_TYPE);
  const auSources = sources.filter((source) => source.sourceType === AU_SOURCE_TYPE);

  const articles = await LegalArticle.find({
    _id: { $in: articleSources.map((source) => source.articleId) },
    status: ContentStatus.PUBLISHED,
    isCurrent: true,
  })
    .select("version")
    .lean();
  const versionById = new Map(articles.map((article) => [String(article._id), article.version]));
  const articlesCurrent = articleSources.every(
    (source) => versionById.get(String(source.articleId)) === source.articleVersion,
  );
  if (!articlesCurrent) return false;

  const auChecks = await Promise.all(
    auSources.map(async (source) => {
      if (!isCuratedTitle(source.titleId)) return false;
      try {
        return (await lookupCurrentRegister(source.titleId)) === source.registerId;
      } catch {
        return false;
      }
    }),
  );
  return auChecks.every(Boolean);
}

export async function retrieve(params) {
  return isLexicalMode() ? retrieveLexical(params) : retrieveHybrid(params);
}

// Ngưỡng bằng chứng (hợp đồng chống ảo giác bước 3); hits xếp điểm giảm dần.
const meetsThreshold = (hits, { top, soft }) =>
  (hits[0]?.score ?? 0) >= top &&
  hits.filter((hit) => hit.score >= soft).length >= env.RAG_MIN_CHUNKS;

const notEnoughEvidence = (topScore) => ({
  passed: false,
  reason: FallbackReason.INSUFFICIENT_EVIDENCE,
  topScore,
  chunks: [],
  retrievedMap: new Map(),
});

// Xác minh lần cuối + gán marker S1..Sn; dùng chung cho hai chế độ.
async function buildRetrievalResult(fusedChunks, countryCode, topScore) {
  const { verifiedChunks, articleById } = await verifyChunks(fusedChunks, countryCode);
  if (verifiedChunks.length === 0) return notEnoughEvidence(topScore);

  const retrievedMap = new Map();
  const chunks = verifiedChunks.map((chunk, index) => {
    const marker = `S${index + 1}`;
    const citation = toCitation(chunk, articleById.get(chunk.articleId), marker);
    retrievedMap.set(marker, citation);
    return citation;
  });
  return { passed: true, reason: null, topScore, chunks, retrievedMap };
}

/*
 * RETRIEVAL_MODE=lexical: không có embedding. LLM chuyển câu hỏi thành từ khoá (tiếng Việt + Anh),
 * tìm theo độ phủ từ khoá có trọng số, rồi áp NGƯỠNG TRƯỚC khi gọi LLM trả lời như chế độ hybrid và
 * vẫn qua lớp xác minh nguồn thật. Điểm lexical lỏng hơn cosine: chống trả lời sai dựa nhiều hơn
 * vào guard (marker, số liệu) và cờ answerable của model, không riêng ngưỡng này.
 */
export async function retrieveLexical({
  question,
  countryCode,
  topicSlug,
  focusArticleId,
  keywords,
}) {
  // chat.service đã lấy từ khoá (để so FAQ) thì dùng lại, khỏi tra cache lần nữa.
  const { vi, en } = keywords ?? (await getQuestionKeywords(question));
  const driver = getSearchDriver();
  const searches = [uniqueTerms(vi), uniqueTerms(en)].map((terms) =>
    driver.lexicalSearch({ countryCode, topicSlug, terms, k: env.RAG_TOP_K }),
  );
  // Một chunk khớp danh sách tiếng Việt hoặc tiếng Anh: giữ điểm cao hơn của hai lần tìm.
  const bestById = new Map();
  for (const hit of (await Promise.all(searches)).flat()) {
    const previous = bestById.get(hit._id);
    if (!previous || hit.score > previous.score) bestById.set(hit._id, hit);
  }
  const hits = [...bestById.values()].sort((a, b) => b.score - a.score).slice(0, env.RAG_TOP_K);
  const keywordThresholds = {
    top: env.RAG_MIN_KEYWORD_TOP_SCORE,
    soft: env.RAG_MIN_KEYWORD_SOFT_SCORE,
  };
  // Xác minh chỉ loại bớt chunk: điểm thô chưa qua ngưỡng thì chắc chắn không qua, nên từ chối ngay,
  // không chờ tra nguồn luật Úc (trước đây câu ngoài kho mất 15-80 giây chỉ để bị từ chối).
  if (!meetsThreshold(hits, keywordThresholds)) return notEnoughEvidence(hits[0]?.score ?? 0);

  const { verifiedChunks: verifiedHits } = await verifyChunks(hits, countryCode);
  const topScore = verifiedHits[0]?.score ?? 0;
  if (!meetsThreshold(verifiedHits, keywordThresholds)) return notEnoughEvidence(topScore);

  const focusChunks = await fetchFocusArticleChunks(focusArticleId, countryCode);
  const fused = rrf([
    { items: verifiedHits, weight: 1 },
    ...(focusChunks.length ? [{ items: focusChunks, weight: FOCUS_ARTICLE_WEIGHT }] : []),
  ]).slice(0, env.RAG_TOP_K);
  return buildRetrievalResult(fused, countryCode, topScore);
}

async function retrieveHybrid({ question, countryCode, topicSlug, focusArticleId }) {
  const embeddingProvider = getEmbeddingProvider();
  const [queryVector] = await embeddingProvider.embedBatch([question]);
  // Lech so chieu = cau hinh sai (EMBEDDING_DIMS/model) -- bao loi ro (caller
  // ha cap PROVIDER_ERROR) thay vi tinh cosine tren vector bi cat cut am tham.
  if (!Array.isArray(queryVector) || queryVector.length !== embeddingProvider.dims) {
    throw new Error("EMBEDDING_DIMS_MISMATCH");
  }
  const words = normalizeVi(question).split(/\s+/).filter(Boolean);

  const driver = getSearchDriver();
  const [rawVectorHits, keywordHits] = await Promise.all([
    driver.vectorSearch({ countryCode, topicSlug, queryVector, k: env.RAG_TOP_K }),
    driver.keywordSearch({ countryCode, topicSlug, words, k: env.RAG_TOP_K }),
  ]);
  // CLAUDE.md "Embedding dong nhat": chunk cua model khac (doi model nhung chua
  // re-index het) cho cosine vo nghia -- khong duoc gop vao diem nguong.
  const vectorHits = rawVectorHits.filter((hit) => hit.embeddingModel === embeddingProvider.model);

  // [!] Nguong ap len score GOC cua vector search, KHONG ap len fusedScore
  // (fusedScore chi co y nghia tuong doi giua cac chunk, khong tuyet doi).
  // Chunk bị gỡ không được góp điểm giúp tập bằng chứng vượt ngưỡng.
  const vectorThresholds = { top: env.RAG_MIN_TOP_SCORE, soft: env.RAG_MIN_SOFT_SCORE };
  // Như nhánh lexical: điểm thô chưa qua ngưỡng thì từ chối ngay, không tra nguồn.
  const rankedVectorHits = [...vectorHits].sort((a, b) => b.score - a.score);
  if (!meetsThreshold(rankedVectorHits, vectorThresholds)) {
    return notEnoughEvidence(rankedVectorHits[0]?.score ?? 0);
  }
  const { verifiedChunks: verifiedVectorHits } = await verifyChunks(vectorHits, countryCode);
  const topScore = verifiedVectorHits[0]?.score ?? 0;
  if (!meetsThreshold(verifiedVectorHits, vectorThresholds)) return notEnoughEvidence(topScore);

  const focusChunks = await fetchFocusArticleChunks(focusArticleId, countryCode);
  const fusedLists = [
    { items: verifiedVectorHits, weight: VECTOR_WEIGHT },
    { items: keywordHits, weight: KEYWORD_WEIGHT },
    ...(focusChunks.length ? [{ items: focusChunks, weight: FOCUS_ARTICLE_WEIGHT }] : []),
  ];
  const fused = rrf(fusedLists).slice(0, env.RAG_TOP_K);
  return buildRetrievalResult(fused, countryCode, topScore);
}
