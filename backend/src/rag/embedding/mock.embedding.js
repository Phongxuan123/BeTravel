import { normalizeVi } from "../../utils/textNormalize.js";
import { djb2Hash } from "./hash.js";

/*
 * Tu chuc nang tieng Viet pho bien (gioi tu, lien tu, dai tu, tro tu...) --
 * bo qua khi bam vao bag-of-words. Khong co buoc nay, cac tu xuat hien o HAU
 * HET moi bai (vi du "quoc", "nguoi", "khong", "duoc"...) se lam cosine
 * similarity cao GIA TAO giua hai doan van hoan toan khac chu de, chi vi cung
 * la van ban phap ly tieng Viet noi ve nguoi Viet o nuoc ngoai -- xap xi hanh
 * vi ha thap trong so tu pho bien (IDF thap) cua embedding model that.
 */
const STOPWORDS_VI = new Set(
  normalizeVi(
    "là gì nào mấy dù được không có của tại đến từ và hoặc như thế này đó một hai ba những rất qua " +
      "bằng về cho với trong ngoài trước sau khi nếu thì sẽ bị cần phải nên đã còn chỉ cũng nữa rồi vì " +
      "bởi mỗi từng cả người quốc nước việt nam hàn dân công dụng trường trạng nhóm hợp nhập cảnh xác " +
      "chính sự ở lệ đồng đổi trực báo ý",
  )
    .split(/\s+/)
    .filter(Boolean),
);

/*
 * MockEmbedding -- BAT BUOC, khong co no thi golden test va CI phai goi API
 * that (CLAUDE.md muc 4.1). KHONG phai vector ngau nhien: bag-of-words băm
 * tung tu (tru stopword) vao 1 trong `dims` chieu roi chuan hoa L2, nen 2 doan
 * text CANG chung nhieu tu ĐẶC TRƯNG CANG co cosine similarity cao -- du "co
 * ngu nghia" de golden test must_answer/must_refuse thuc su phan biet duoc
 * dung/sai chunk, khong phai chi test cho co chay.
 */
export function createMockEmbeddingProvider({ dims = 768, model = "mock-embedding" } = {}) {
  const embedOne = (text) => {
    const vector = new Array(dims).fill(0);
    const words = normalizeVi(text)
      .split(/\s+/)
      .filter((w) => w && !STOPWORDS_VI.has(w));

    for (const word of words) {
      const idx = djb2Hash(word) % dims;
      vector[idx] += 1;
    }

    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map((v) => v / norm);
  };

  return {
    provider: "mock",
    model,
    dims,
    async embedBatch(texts) {
      return texts.map(embedOne);
    },
  };
}
