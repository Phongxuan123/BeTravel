import { z } from "zod";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_TRIP_FIELD_LENGTH = 60;

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Mã không hợp lệ");

// Thong tin chuyen di do client gui (D2: nguoi dung thay va tat duoc) -- chi vai truong ngan,
// di vao prompt nen gioi han do dai.
const tripSchema = z.object({
  city: z.string().trim().max(MAX_TRIP_FIELD_LENGTH).optional(),
  startDate: z.string().trim().max(MAX_TRIP_FIELD_LENGTH).optional(),
  endDate: z.string().trim().max(MAX_TRIP_FIELD_LENGTH).optional(),
});

export const sendMessageSchema = z.object({
  conversationId: objectIdSchema.optional(),
  countryCode: z.string().trim().length(2).toUpperCase(),
  message: z.string().trim().min(1, "Vui lòng nhập câu hỏi").max(MAX_MESSAGE_LENGTH),
  trip: tripSchema.optional(),
});

export const regenerateSchema = z.object({
  detailed: z.boolean().optional().default(false),
});

export const idParamSchema = z.object({ id: objectIdSchema });
