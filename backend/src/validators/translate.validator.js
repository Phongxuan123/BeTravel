import { z } from "zod";

// Gioi han 500 ky tu (PROMPT B7 muc 9) -- dich cau dai la truong hop LLM de
// "them binh luan" thay vi chi dich, va cung tranh lam ton chi phi provider.
export const translateRequestSchema = z.object({
  text: z.string().trim().min(1, "Noi dung dich khong duoc de trong").max(500, "Khong dich qua 500 ky tu"),
  from: z.string().trim().min(1, "Thieu ngon ngu nguon"),
  to: z.string().trim().min(1, "Thieu ngon ngu dich"),
  mode: z.enum(["text", "phrase"]).default("text"),
});
