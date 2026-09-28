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
