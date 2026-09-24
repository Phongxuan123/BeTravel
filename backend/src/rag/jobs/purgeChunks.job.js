import LegalArticle from "../../models/LegalArticle.js";
import LegalChunk from "../../models/LegalChunk.js";
import { invalidateMemorySearchCache } from "../search/memory.driver.js";
import { ContentStatus, IndexStateStatus } from "../../core/constants.js";

/*
 * Handler that cho job 'purge_chunks' (B4). Chay khi bai roi khoi 'published'
 * (unpublish/supersede) -- xoa TOAN BO chunk cua (articleId), khong chi
 * version hien tai, vi bai khong con published thi khong version nao cua no
 * duoc phep xuat hien trong ket qua RAG nua.
 *
 * Day la lop don dep CHU DONG; retrieval.js van co lop phong thu THU HAI
 * ($lookup xac minh status that) de an toan ke ca khi job nay chua kip chay
 * hoac that bai (CLAUDE.md muc 7).
 */
export async function purgeChunksHandler({ articleId }) {
  const article = await LegalArticle.findById(articleId);
  // Job purge cũ có thể chạy sau khi bài đã được xuất bản lại.
  if (article?.status === ContentStatus.PUBLISHED && article.isCurrent) return;

  await LegalChunk.deleteMany({ articleId });

  if (article) {
    article.indexState = {
      status: IndexStateStatus.NOT_INDEXED,
      chunkCount: 0,
      lastIndexedAt: article.indexState?.lastIndexedAt ?? null,
      embeddingModel: "",
      error: "",
    };
    await article.save();
  }

  invalidateMemorySearchCache();
}
