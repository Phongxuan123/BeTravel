/*
 * Doc dau ra van ban cua mo hinh. Module THUAN (khong import env/DB) de test don vi chay duoc ma
 * khong can backend/.env -- CI khong co .env nen import answer.js trong test lam tien trinh thoat.
 */

const CONTROL_CHAR_ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
const escapeControlChar = (char) =>
  CONTROL_CHAR_ESCAPES[char] ?? `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;

/*
 * Do 09/11 (Gemini): mo hinh viet xuong dong THAT ben trong chuoi JSON --> JSON.parse loi va cau tra
 * loi bi bo. Chi escape ky tu dieu khien nam TRONG chuoi; xuong dong giua cac key la khoang trang
 * hop le, escape ca chung se lam hong JSON.
 */
const escapeControlCharsInStrings = (jsonText) => {
  let inString = false;
  let escaped = false;
  let repaired = "";
  for (const char of jsonText) {
    const isControlInString = inString && !escaped && char < " ";
    if (isControlInString) {
      repaired += escapeControlChar(char);
      continue;
    }
    if (!escaped && char === '"') inString = !inString;
    escaped = inString && !escaped && char === "\\";
    repaired += char;
  }
  return repaired;
};

const tryParseJson = (jsonText) => {
  try {
    return JSON.parse(jsonText);
  } catch {
    return undefined;
  }
};

// Lay object JSON dau tien trong van ban (mo hinh co the boc them chu hoac ```json).
export const parseJsonObject = (rawText) => {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const jsonText = rawText.slice(start, end + 1);
  return tryParseJson(jsonText) ?? tryParseJson(escapeControlCharsInStrings(jsonText)) ?? null;
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
    // eslint-disable-next-line no-control-regex -- chu dich tim ky tu dieu khien de escape
    const repaired = partial.replace(/[\u0000-\u001f]/g, escapeControlChar);
    return tryParseJson(`"${repaired}"`)?.trim() ?? "";
  }
  const looksLikeJson = raw.trimStart().startsWith("{");
  return looksLikeJson ? "" : raw.trim();
};
