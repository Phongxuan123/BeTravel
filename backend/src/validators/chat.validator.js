import { z } from "zod";

export const chatSessionCreateSchema = z.object({
  countryCode: z
    .string()
    .length(2)
    .transform((v) => v.toUpperCase()),
});

export const chatMessageCreateSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Câu hỏi quá ngắn")
    .max(500, "Câu hỏi quá dài (tối đa 500 ký tự)"),
  // CTA "Hoi AI ve bai nay" tu man hinh chi tiet bai luat (B5) -- uu tien
  // chunk cua CHINH bai do trong RRF (xem rag/retrieval.js FOCUS_ARTICLE_WEIGHT).
  focusArticleId: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, "ID bài luật không hợp lệ")
    .optional(),
});

export const chatFeedbackSchema = z.object({
  feedback: z.enum(["up", "down"]),
});
