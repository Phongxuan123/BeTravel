import { z } from "zod";
import { normalizeLanguage } from "../translation/languages.js";

// from/to duoc chen vao prompt LLM -- gioi han do dai (QA-3) va chuan hoa ve
// danh sach ngon ngu ho tro de chan prompt injection dai.
const languageSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .transform(normalizeLanguage)
  .pipe(z.string({ error: "Ngôn ngữ chưa được hỗ trợ" }));

// Gioi han 500 ky tu (PROMPT B7 muc 9) -- dich cau dai la truong hop LLM de
// "them binh luan" thay vi chi dich, va cung tranh lam ton chi phi provider.
export const translateRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Noi dung dich khong duoc de trong")
    .max(500, "Khong dich qua 500 ky tu"),
  from: languageSchema,
  to: languageSchema,
  mode: z.enum(["text", "phrase"]).default("text"),
});
