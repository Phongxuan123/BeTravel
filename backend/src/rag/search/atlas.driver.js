import mongoose from "mongoose";
import { env } from "../../core/env.js";
import { ContentStatus } from "../../core/constants.js";

/*
 * AtlasSearchDriver -- dung $vectorSearch (vec_idx) va $search (txt_idx) that
 * tren Atlas (docs/atlas-indexes.md). KHONG chay duoc tren mongodb-memory-server
 * (test dung SEARCH_DRIVER=memory) nen driver nay khong co test tu dong --
 * xac minh bang tay tren Atlas that khi index da ACTIVE.
 *
 * Cung shape ket qua voi memory.driver.js: retrieval.js khong biet dang chay
 * driver nao.
 */
const collection = () => mongoose.connection.db.collection("legal_chunks");

const PROJECT_FIELDS = {
  _id: 1,
  articleId: 1,
  articleSlug: 1,
  articleVersion: 1,
  heading: 1,
  text: 1,
  textNorm: 1,
  kind: 1,
  embeddingModel: 1,
  countryCode: 1,
  topicSlug: 1,
  // Chunk luat goc (sourceType 'au_legislation') -- bai noi bo khong co cac truong nay.
  sourceType: 1,
  titleId: 1,
  registerId: 1,
  lawName: 1,
  sectionRef: 1,
  partHeading: 1,
  officialUrl: 1,
  effectiveFrom: 1,
};

// Chunk luat goc khong co articleId: giu null thay vi chuoi "undefined".
const normalizeHit = (h) => ({
  ...h,
  _id: String(h._id),
  articleId: h.articleId ? String(h.articleId) : null,
});

export function createAtlasSearchDriver() {
  return {
    driver: "atlas",

    async vectorSearch({ countryCode, topicSlug, queryVector, k }) {
      const pipeline = [
        {
          $vectorSearch: {
            index: env.VECTOR_INDEX_NAME,
            path: "embedding",
            queryVector,
            numCandidates: env.RAG_NUM_CANDIDATES,
            limit: k,
            filter: {
              countryCode: { $eq: countryCode },
              status: { $eq: ContentStatus.PUBLISHED },
              ...(topicSlug ? { topicSlug: { $eq: topicSlug } } : {}),
            },
          },
        },
        { $project: { ...PROJECT_FIELDS, score: { $meta: "vectorSearchScore" } } },
      ];

      const hits = await collection().aggregate(pipeline).toArray();
      return hits.map(normalizeHit);
    },

    async keywordSearch({ countryCode, topicSlug, words, k }) {
      if (words.length === 0) return [];

      const pipeline = [
        {
          $search: {
            index: env.TEXT_INDEX_NAME,
            compound: {
              must: [{ text: { query: words, path: ["text", "heading"] } }],
              filter: [
                { equals: { path: "countryCode", value: countryCode } },
                { equals: { path: "status", value: ContentStatus.PUBLISHED } },
                ...(topicSlug ? [{ equals: { path: "topicSlug", value: topicSlug } }] : []),
              ],
            },
          },
        },
        { $limit: k },
        { $project: { ...PROJECT_FIELDS, score: { $meta: "searchScore" } } },
      ];

      const hits = await collection().aggregate(pipeline).toArray();
      return hits.map(normalizeHit);
    },
  };
}
