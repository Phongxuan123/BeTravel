/*
 * An thong tin ca nhan trong van ban hoi-dap truoc khi gui cho Admin (H1). Chay o BACKEND:
 * du lieu tho khong bao gio roi may chu qua API admin.
 *
 * Nguyen tac: an thua con hon lot. Ngoai le co chu dich -- so khan cap/so dich vu ngan (000,
 * 112, 13 11 14) va so tong dai 1300/1800 cua Uc la so cong cong, can doc duoc de danh gia
 * cau tra loi; ngay thang (2026-11-02) va so tien kieu 10.000.000 cung giu nguyen.
 */
export const MaskLabel = Object.freeze({
  EMAIL: "[email đã ẩn]",
  PHONE: "[số điện thoại đã ẩn]",
  PASSPORT: "[số giấy tờ đã ẩn]",
  NUMBER: "[số đã ẩn]",
});

// Day so tu 8 chu so tro len (CCCD, so the, so tai khoan, so dien thoai) moi bi an.
const MIN_MASKED_DIGITS = 8;
// So dien thoai: co "+" quoc te, hoac bat dau bang 0 va dai 9-11 so (VN, Uc).
const LOCAL_PHONE_DIGITS = { min: 9, max: 11 };

const EMAIL_PATTERN = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/gu;
// Ho chieu/giay to: 1-2 chu cai + 7-8 chu so (VN: C1234567, Uc: PA1234567).
const PASSPORT_PATTERN = /\b[A-Z]{1,2}\d{7,8}\b/gi;
// Cum chu so, giua cac nhom la MOT dau cach/cham/gach, co the mo dau bang "+" hoac ma vung
// trong ngoac (vd +61 412 345 678, (02) 6261 3305, 4111-1111-1111-1111).
const DIGIT_RUN_PATTERN = /\+?(?:\(\d+\) ?)?\d+(?:[ .-]\d+)*/g;

// 2026-11-02 hoac 02.11.2026 / 02-11-2026.
const DATE_LIKE = /^(?:\d{4}-\d{2}-\d{2}|\d{1,2}[.-]\d{1,2}[.-]\d{4})$/;
const YEAR_RANGE = /^(?:19|20)\d{2}-(?:19|20)\d{2}$/;
// So tien kieu 10.000.000; bat dau bang 0 (vd 091.234.567) la so dien thoai, khong phai tien.
const DOT_THOUSANDS = /^[1-9]\d{0,2}(?:\.\d{3})+$/;
const AU_SERVICE_NUMBER = /^1[38]00\d{6}$/;

const isPublicOrNotPersonal = (run, digits) =>
  digits.length < MIN_MASKED_DIGITS ||
  DATE_LIKE.test(run) ||
  YEAR_RANGE.test(run) ||
  DOT_THOUSANDS.test(run) ||
  AU_SERVICE_NUMBER.test(digits);

const looksLikePhone = (run, digits) => {
  if (run.startsWith("+")) return true;
  const isLocalLength =
    digits.length >= LOCAL_PHONE_DIGITS.min && digits.length <= LOCAL_PHONE_DIGITS.max;
  return digits.startsWith("0") && isLocalLength;
};

function maskDigitRun(run) {
  const digits = run.replace(/\D/g, "");
  if (isPublicOrNotPersonal(run, digits)) return run;
  return looksLikePhone(run, digits) ? MaskLabel.PHONE : MaskLabel.NUMBER;
}

/**
 * @param {string} text van ban goc (cau hoi hoac cau tra loi)
 * @returns {string} van ban da thay thong tin ca nhan bang nhan MaskLabel
 */
export function maskPersonalData(text) {
  if (!text) return "";
  return text
    .replace(EMAIL_PATTERN, MaskLabel.EMAIL)
    .replace(PASSPORT_PATTERN, MaskLabel.PASSPORT)
    .replace(DIGIT_RUN_PATTERN, maskDigitRun);
}
