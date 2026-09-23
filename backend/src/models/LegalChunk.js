import mongoose from "mongoose";

/*
 * legal_chunks mang CA HAI Atlas Search index trong ngan sach 3 index cua M0
 * (vec_idx + txt_idx, xem docs/atlas-indexes.md) -- tim tu khoa va RAG chay
 * tren CUNG collection nen khong bao gio lech nhau.
 *
 * status/countryCode/topicSlug o day la BAN SAO chep tu legal_articles luc
 * chunk, dung lam filter nhanh trong $vectorSearch/$search. KHONG BAO GIO tin
 * chung la nguon su that cuoi cung -- job purge_chunks co the that bai, ban
 * sao co the cu. retrieval.js LUON $lookup lai legal_articles de xac minh
 * status THAT truoc khi dua chunk vao ngu canh cho LLM (CLAUDE.md muc 7).
 */
const legalChunkSchema = new mongoose.Schema(
  {
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: "LegalArticle", required: true, index: true },
    articleSlug: { type: String, required: true },
    articleVersion: { type: Number, required: true },

    // Ban sao tu article luc chunk -- CHI dung de loc so bo, xem canh bao tren.
    countryCode: { type: String, required: true, uppercase: true },
    topicSlug: { type: String, required: true },
    status: { type: String, required: true },

    heading: { type: String, default: "" },
    order: { type: Number, required: true },

    // Text hien thi that (khong co dong ngu canh prepend) -- dua vao context cho LLM.
    text: { type: String, required: true },
    // Ban bo dau + lowercase cua text -- fallback tim tu khoa khi Atlas Search
    // khong dung duoc (SEARCH_DRIVER=memory), xem utils/textNormalize.js.
    textNorm: { type: String, required: true },

    // 768 chieu, KHONG BAO GIO tra ve client -- select:false chan ro ri qua API.
    embedding: { type: [Number], select: false },
    embeddingModel: { type: String, required: true },

    // Chunk sinh tu penalties[] (xem rag/chunking.js) -- danh dau de phan biet
    // voi chunk cat tu bodyMd, huu ich khi debug chat luong retrieval.
    kind: { type: String, enum: ["body", "penalty"], default: "body" },
  },
  { timestamps: true },
);

legalChunkSchema.index({ articleId: 1, articleVersion: 1, order: 1 });
legalChunkSchema.index({ countryCode: 1, status: 1, topicSlug: 1 });

export default mongoose.model("LegalChunk", legalChunkSchema);
