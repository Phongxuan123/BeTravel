import LegalChunk from "../models/LegalChunk.js";
import { ContentStatus } from "../core/constants.js";
import { AppError, ErrorCode } from "../core/errors.js";
import {
  AU_LAW_TOPICS,
  isCuratedTitle,
  topicSlugsForTitle,
  findAuLawTopic,
} from "../core/auLawTopics.js";
import { chunkAuLaw } from "../rag/auLawChunking.js";
import {
  getEmbeddingProvider,
  isLexicalMode,
  LEXICAL_MODEL_LABEL,
} from "../rag/embedding/index.js";
import { invalidateMemorySearchCache } from "../rag/search/memory.driver.js";
import {
  loadDisplayedBlocks,
  getTitleName,
  buildOfficialUrl,
} from "./australiaLegislation.service.js";

/*
 * Đưa điều luật liên bang Úc vào RAG: lấy bản hiện hành -> chunk theo điều -> embed -> ghi
 * legal_chunks với sourceType 'au_legislation'. Dùng CHUNG vec_idx / txt_idx đã có (filter theo
 * countryCode="AU", status, topicSlug) nên không tạo thêm Atlas index (CLAUDE.md mục 4.1).
 * Embed xong mới thay chunk cũ: lỗi giữa chừng không làm mất dữ liệu đang dùng.
 * Chỉ luật đã tuyển chọn (core/auLawTopics.js) mới được index, giới hạn chi phí embedding.
 */
export const AU_COUNTRY_CODE = "AU";
export const AU_SOURCE_TYPE = "au_legislation";

const defaultDeps = () => ({
  loadBlocks: loadDisplayedBlocks,
  getName: getTitleName,
  embedder: getEmbeddingProvider(),
});

const notCurated = (titleId) =>
  new AppError(ErrorCode.VALIDATION_ERROR, `Luật ${titleId} không nằm trong danh sách tuyển chọn.`);

/**
 * @returns {Promise<{titleId:string, lawName:string, registerId:string, chunks:number, replaced:number}>}
 */
export async function indexAuLaw(titleId, deps = {}) {
  if (!isCuratedTitle(titleId)) throw notCurated(titleId);
  const { loadBlocks, getName, embedder } = { ...defaultDeps(), ...deps };

  const [{ rawVersion, allBlocks }, lawName] = await Promise.all([
    loadBlocks(titleId),
    getName(titleId),
  ]);
  const topicSlug = topicSlugsForTitle(titleId)[0];
  const pieces = chunkAuLaw({
    blocks: allBlocks,
    lawName,
    topicLabel: findAuLawTopic(topicSlug)?.label,
  });
  if (pieces.length === 0) {
    throw new AppError(ErrorCode.UPSTREAM_ERROR, `Không rút được điều luật nào từ ${titleId}.`);
  }

  // Chế độ lexical không embed: chunk chỉ cần text/textNorm để tìm theo từ khoá.
  const useEmbedding = !isLexicalMode();
  const vectors = useEmbedding
    ? await embedder.embedBatch(pieces.map((piece) => piece.textForEmbedding))
    : [];
  const officialUrl = buildOfficialUrl(titleId);
  const effectiveFrom = rawVersion.start ? new Date(rawVersion.start) : undefined;

  const documents = pieces.map((piece, index) => ({
    sourceType: AU_SOURCE_TYPE,
    countryCode: AU_COUNTRY_CODE,
    topicSlug,
    status: ContentStatus.PUBLISHED,
    titleId,
    registerId: rawVersion.registerId,
    lawName,
    sectionRef: piece.sectionRef ?? undefined,
    partHeading: piece.partHeading,
    officialUrl,
    effectiveFrom,
    heading: piece.heading,
    order: piece.order,
    text: piece.text,
    textNorm: piece.textNorm,
    embedding: useEmbedding ? vectors[index] : undefined,
    embeddingModel: useEmbedding ? embedder.model : LEXICAL_MODEL_LABEL,
    kind: "body",
  }));

  const { deletedCount } = await LegalChunk.deleteMany({ sourceType: AU_SOURCE_TYPE, titleId });
  await LegalChunk.insertMany(documents);
  invalidateMemorySearchCache();

  return {
    titleId,
    lawName,
    registerId: rawVersion.registerId,
    chunks: documents.length,
    replaced: deletedCount,
  };
}

export async function purgeAuLaw(titleId) {
  const { deletedCount } = await LegalChunk.deleteMany({ sourceType: AU_SOURCE_TYPE, titleId });
  invalidateMemorySearchCache();
  return { titleId, deleted: deletedCount };
}

// Luật đã index: số chunk, mã bản biên soạn và model embedding, để Admin/CLI đối chiếu.
export async function listIndexedAuLaws() {
  const rows = await LegalChunk.aggregate([
    { $match: { sourceType: AU_SOURCE_TYPE } },
    {
      $group: {
        _id: "$titleId",
        lawName: { $first: "$lawName" },
        registerId: { $first: "$registerId" },
        embeddingModel: { $first: "$embeddingModel" },
        chunks: { $sum: 1 },
      },
    },
    { $sort: { lawName: 1 } },
  ]);
  return rows.map(({ _id, ...rest }) => ({ titleId: _id, ...rest }));
}

export const curatedAuTitleIds = () => [
  ...new Set(AU_LAW_TOPICS.flatMap((topic) => topic.titleIds)),
];
