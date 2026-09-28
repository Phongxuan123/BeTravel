import { z } from "zod";

// Nhan ngon ngu dang "Tiếng Hàn" / "ko" -- 40 ky tu du rong cho moi ten goi.
const LANGUAGE_LABEL_MAX_LENGTH = 40;

// Gioi han 500 ky tu (PROMPT B7 muc 9) -- dich cau dai la truong hop LLM de
// "them binh luan" thay vi chi dich, va cung tranh lam ton chi phi provider.
export const translateRequestSchema = z.object({
  text: z.string().trim().min(1, "Noi dung dich khong duoc de trong").max(500, "Khong dich qua 500 ky tu"),
  // from/to duoc chen thang vao prompt LLM -- khong gioi han thi vuot tran 500
  // ky tu cua `text` (chi phi AI) va mo cua cho prompt injection dai.
  from: z.string().trim().min(1, "Thieu ngon ngu nguon").max(LANGUAGE_LABEL_MAX_LENGTH),
  to: z.string().trim().min(1, "Thieu ngon ngu dich").max(LANGUAGE_LABEL_MAX_LENGTH),
  mode: z.enum(["text", "phrase"]).default("text"),
});
