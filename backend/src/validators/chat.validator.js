import { z } from "zod";

export const chatSessionCreateSchema = z.object({
  countryCode: z.string().length(2).transform((v) => v.toUpperCase()),
});

export const chatMessageCreateSchema = z.object({
  question: z.string().trim().min(3, "Câu hỏi quá ngắn").max(500, "Câu hỏi quá dài (tối đa 500 ký tự)"),
});

export const chatFeedbackSchema = z.object({
  feedback: z.enum(["up", "down"]),
});
