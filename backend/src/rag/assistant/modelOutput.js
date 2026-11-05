/*
 * Doc dau ra van ban cua mo hinh. Module THUAN (khong import env/DB) de test don vi chay duoc ma
 * khong can backend/.env -- CI khong co .env nen import answer.js trong test lam tien trinh thoat.
 */

// Lay object JSON dau tien trong van ban (mo hinh co the boc them chu hoac ```json).
export const parseJsonObject = (rawText) => {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(rawText.slice(start, end + 1));
  } catch {
    return null;
  }
};

// JSON bi cat ngang (het token) van cuu duoc phan "answer" da viet xong.
const PARTIAL_ANSWER = /"answer"\s*:\s*"((?:\\.|[^"\\])*)/;

/*
 * Lay cau tra loi tu dau ra mo hinh. Do 02/11: gpt-6-luna doi khi bo qua yeu cau JSON va tra van
 * ban tron -- dung luon van ban do (van qua guard.js), thay vi bao "chua soan duoc".
 */
export const extractAnswer = (raw) => {
  const parsed = parseJsonObject(raw);
  if (typeof parsed?.answer === "string") return parsed.answer;
  const partial = raw.match(PARTIAL_ANSWER)?.[1];
  if (partial) {
    try {
      return JSON.parse(`"${partial}"`).trim();
    } catch {
      return "";
    }
  }
  const looksLikeJson = raw.trimStart().startsWith("{");
  return looksLikeJson ? "" : raw.trim();
};
