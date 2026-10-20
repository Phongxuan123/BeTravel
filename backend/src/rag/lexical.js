import { foldDStroke, normalizeVi } from "../utils/textNormalize.js";

/*
 * Tìm kiếm theo từ khoá có trọng số (IDF), dùng khi RETRIEVAL_MODE=lexical -- không cần dịch vụ
 * embedding. Điểm của một chunk = tổng IDF của các từ khoá nó chứa / tổng IDF của MỌI từ khoá,
 * nên luôn nằm trong [0, 1] và so với ngưỡng RAG_MIN_KEYWORD_* được (giống vai trò điểm cosine).
 * Từ khoá không xuất hiện ở chunk nào vẫn tính vào mẫu số: câu hỏi nói về thứ kho luật không có
 * thì điểm tự thấp, không bị "bỏ qua cho dễ qua ngưỡng".
 */
const MIN_STEMMABLE_LENGTH = 5;
const MIN_TOKEN_LENGTH = 2;
const STOP_WORDS = new Set([
  "the", "of", "and", "or", "to", "in", "an", "for", "is", "are", "be", "on", "by", "with",
  "la", "va", "cua", "co", "khong", "cho", "toi", "bi", "duoc", "nhu", "nao", "nay",
]);

// Bỏ đuôi số nhiều/quá khứ đơn giản để "narcotics"/"narcotic", "imported"/"import" khớp nhau.
const stem = (token) => {
  if (token.length < MIN_STEMMABLE_LENGTH) return token;
  return token.replace(/(ing|ed|es|s)$/, "");
};

export const tokenize = (text) =>
  foldDStroke(normalizeVi(text))
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH && !STOP_WORDS.has(token))
    .map(stem);

// Từ khoá duy nhất sau chuẩn hoá, giữ thứ tự xuất hiện.
export const uniqueTerms = (phrases) => [...new Set(phrases.flatMap(tokenize))];

export const inverseDocumentFrequency = (documentCount, documentFrequency) =>
  Math.log(1 + (documentCount - documentFrequency + 0.5) / (documentFrequency + 0.5));
