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
