import LegalArticle from "../../models/LegalArticle.js";
import LegalTopic from "../../models/LegalTopic.js";
import Country from "../../models/Country.js";
import LegalChunk from "../../models/LegalChunk.js";
import { chunkArticle } from "../chunking.js";
import { getEmbeddingProvider } from "../embedding/index.js";
import { invalidateMemorySearchCache } from "../search/memory.driver.js";
import { ContentStatus, IndexStateStatus } from "../../core/constants.js";

/*
 * Handler that cho job 'reindex_article' (B4). Idempotent: xoa het chunk CU
 * cua CHINH (articleId, articleVersion) nay truoc khi ghi moi -- chay lai
 * nhieu lan khong tao chunk trung, va KHONG dung cham chunk cua version khac
 * (lich su van ban van con nguyen).
 */
export async function reindexArticleHandler({ articleId }) {
  const article = await LegalArticle.findById(articleId);
  if (!article || article.status !== ContentStatus.PUBLISHED || !article.isCurrent) return; // bai da bi xoa that su khoi DB, khong con gi de index

  article.indexState.status = IndexStateStatus.INDEXING;
  await article.save();

  try {
    const [country, topic] = await Promise.all([
      Country.findOne({ code: article.countryCode }).lean(),
      LegalTopic.findOne({ countryCode: article.countryCode, slug: article.topicSlug }).lean(),
    ]);

    const pieces = chunkArticle(article.toObject(), {
      countryName: country?.name,
      topicName: topic?.label,
    });

    const provider = getEmbeddingProvider();
    const embeddings = await provider.embedBatch(pieces.map((p) => p.textForEmbedding));

    // Publish/unpublish có thể xảy ra trong lúc chờ embedding từ provider.
    const stillPublished = await LegalArticle.exists({
      _id: article._id,
      status: ContentStatus.PUBLISHED,
      isCurrent: true,
    });
    if (!stillPublished) return;
    if (
      embeddings.length !== pieces.length ||
      embeddings.some(
        (vector) =>
          !Array.isArray(vector) ||
          vector.length !== provider.dims ||
          !vector.every(Number.isFinite),
      )
    ) {
      throw new Error("Embedding trả về số chiều hoặc số lượng không hợp lệ");
    }
    await LegalChunk.deleteMany({ articleId: article._id, articleVersion: article.version });

    await LegalChunk.insertMany(
      pieces.map((p, index) => ({
        articleId: article._id,
        articleSlug: article.slug,
        articleVersion: article.version,
        countryCode: article.countryCode,
        topicSlug: article.topicSlug,
        status: article.status,
        heading: p.heading,
        order: p.order,
        text: p.text,
        textNorm: p.textNorm,
        embedding: embeddings[index],
        embeddingModel: provider.model,
        kind: p.kind,
      })),
    );

    article.indexState = {
      status: IndexStateStatus.INDEXED,
      chunkCount: pieces.length,
      lastIndexedAt: new Date(),
      embeddingModel: provider.model,
      error: "",
    };
    await article.save();

    invalidateMemorySearchCache();
  } catch (error) {
    article.indexState.status = IndexStateStatus.FAILED;
    article.indexState.error = String(error?.message ?? error);
    await article.save();
    throw error; // de job.service.js retry theo maxAttempts
  }
}
