/*
 * Chuan hoa chuoi tieng Viet de tim khong dau: lowercase + bo dau bang NFD.
 * Dung chung cho titleNorm/summaryNorm cua LegalArticle va cho query search --
 * mot noi duy nhat, tranh lech logic giua luc ghi va luc doc (Rule 3, DRY).
 *
 * "đ" la chu cai rieng (U+0111), NFD KHONG tach duoc thanh "d" + dau, nen
 * phai thay tuong minh -- neu khong, "dang ky" khong bao gio khop "Đăng ký"
 * (docs/03_Contracts_v2.md muc chuan hoa).
 */
export const normalizeVi = (input) =>
  (input ?? "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();

const toWordSequence = (text) => ` ${text.replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
const lowerKeepAccents = (input) => (input ?? "").toString().normalize("NFC").toLowerCase();
const hasVietnameseMarks = (text) => normalizeVi(text) !== lowerKeepAccents(text).trim();

/*
 * Kiem tra `text` co chua cum tu `phrase` theo RANH GIOI TU. So khop chuoi con
 * tran se sai ("uc" nam trong "thuc"), va bo dau cung sai: "Lào" -> "lao"
 * trung voi "lao động". Vi vay so GIU DAU truoc; chi so khong dau khi nguoi
 * dung go ca cau khong dau (khi do khong con cach phan biet nao khac).
 */
export const containsPhrase = (text, phrase) => {
  const accentedPhrase = toWordSequence(lowerKeepAccents(phrase));
  if (accentedPhrase.trim() === "") return false;
  if (toWordSequence(lowerKeepAccents(text)).includes(accentedPhrase)) return true;
  if (hasVietnameseMarks(text)) return false;
  return toWordSequence(normalizeVi(text)).includes(toWordSequence(normalizeVi(phrase)));
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/*
 * Regex tim mot tu DA chuan hoa trong gia tri *Norm luu trong DB. Du lieu luu
 * truoc khi normalizeVi doi "đ" -> "d" van con "đ" cho toi khi duoc luu lai,
 * nen moi "d" trong tu khoa khop ca "d" lan "đ" -- tranh tim kiem hoi quy.
 */
export const buildNormalizedWordRegex = (normalizedWord) =>
  new RegExp(escapeRegex(normalizedWord).replace(/d/g, "[dđ]"), "i");
