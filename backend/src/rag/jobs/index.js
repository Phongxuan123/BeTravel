import { registerJobHandler } from "../../services/job.service.js";
import { JobName } from "../../core/constants.js";
import { reindexArticleHandler } from "./reindexArticle.job.js";
import { purgeChunksHandler } from "./purgeChunks.job.js";
import { indexAuLawHandler } from "./indexAuLaw.job.js";

// Goi mot lan luc khoi dong server (truoc startJobWorker()) -- xem server.js.
export function registerRagJobHandlers() {
  registerJobHandler(JobName.REINDEX_ARTICLE, reindexArticleHandler);
  registerJobHandler(JobName.PURGE_CHUNKS, purgeChunksHandler);
  registerJobHandler(JobName.INDEX_AU_LAW, indexAuLawHandler);
}
