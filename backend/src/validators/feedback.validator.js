import { z } from "zod";

import { FeedbackTargetType, FeedbackRating } from "../core/constants.js";

// Schema cua nguoi dung (POST /api/feedback) -- schema danh sach/doi trang
// thai cua admin nam o admin.validator.js, cung cho voi audit/rag (quy uoc
// da co san: schema admin gop mot cho, schema user-facing di theo module rieng).
export const feedbackCreateSchema = z.object({
  targetType: z.enum(Object.values(FeedbackTargetType)),
  targetId: z.string().min(1),
  rating: z.enum(Object.values(FeedbackRating)),
  note: z.string().trim().max(1000).optional().default(""),
  context: z
    .object({
      countryCode: z.string().length(2).optional(),
      question: z.string().max(500).optional(),
    })
    .optional()
    .default({}),
});
