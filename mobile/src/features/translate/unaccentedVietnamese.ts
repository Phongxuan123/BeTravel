// Âm tiết tiếng Việt thông dụng khi gõ không dấu. Danh sách ngắn có chủ đích: chỉ cần đủ để nhận
// ra câu không dấu, không phải bộ tách từ (BUG-14).
const COMMON_UNACCENTED_SYLLABLES = new Set([
  'toi', 'khong', 'can', 'mot', 'cua', 'duoc', 'di', 'den', 'la', 'va', 'co', 'bi', 'nhu', 'cho',
  'nguoi', 'nao', 'gi', 'sao', 'o', 'ra', 'vao', 'xin', 'hay', 'muon', 'biet', 'lam', 'dau', 'bao',
  'nhieu', 'xe', 'san', 'bay', 'luc', 'gio', 'sang', 'chieu', 'toi', 'ban', 'minh', 'chung', 'thi',
]);
const MIN_WORDS = 4;
const MIN_SYLLABLE_RATIO = 0.5;
const VIETNAMESE_MARKS = /[\u00C0-\u1EF9]/;

/**
 * Câu tiếng Việt gõ KHÔNG dấu (vd "Toi can mot chiec xe taxi"): bộ dịch offline dễ dịch sai nghĩa vì
 * nhiều từ không dấu trùng với từ khác. Không tự thêm dấu (dễ sai), chỉ để màn Dịch cảnh báo người dùng.
 */
export function looksLikeUnaccentedVietnamese(text: string): boolean {
  if (VIETNAMESE_MARKS.test(text.normalize('NFC'))) return false;
  const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (words.length < MIN_WORDS) return false;
  const known = words.filter((word) => COMMON_UNACCENTED_SYLLABLES.has(word)).length;
  return known / words.length >= MIN_SYLLABLE_RATIO;
}
