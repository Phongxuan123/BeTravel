/*
 * Chuan hoa chuoi tieng Viet de tim khong dau: lowercase + bo dau bang NFD.
 * Dung chung cho titleNorm/summaryNorm cua LegalArticle va cho query search --
 * mot noi duy nhat, tranh lech logic giua luc ghi va luc doc (Rule 3, DRY).
 */
export const normalizeVi = (input) =>
  (input ?? "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/*
 * NFD KHONG tach duoc "đ" (la mot chu cai rieng, khong phai d + dau) nen
 * titleNorm/textNorm da luu van giu "đ". Khong doi normalizeVi (se lech voi du
 * lieu da luu tren Atlas va lam doi vector mock cua golden test) -- thay vao do
 * gap d/đ luc SO KHOP: nguoi dung go "dai su quan" van ra "Đại sứ quán".
 */
export const foldDStroke = (text) => text.replace(/đ/g, "d");

// Chuoi da escape regex --> moi "d"/"đ" khop ca hai dang.
export const toDStrokeInsensitivePattern = (escapedText) => escapedText.replace(/[dđ]/g, "[dđ]");

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
