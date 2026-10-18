import { z } from "zod";

import { AU_LAW_TOPIC_SLUGS } from "../core/auLawTopics.js";

/*
 * Zod schema cho /api/laws/australia/*. Mọi giá trị người dùng đi vào câu
 * $filter OData của nguồn đều bị chặn ký tự lạ ở đây (id, collection) hoặc
 * được escape ở service (q), nên endpoint không thành proxy truy vấn tự do.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const SEARCH_QUERY_MIN_LENGTH = 2;
const SEARCH_QUERY_MAX_LENGTH = 100;
const DEFAULT_CONTENT_LIMIT = 100;
const MAX_CONTENT_LIMIT = 300;

// Mã văn bản của nguồn dạng C1958A00062, F2008L03829 (chữ + số).
export const titleIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6,20}$/, "Mã văn bản không hợp lệ"),
});

const pageSchema = z.coerce.number().int().min(1).default(DEFAULT_PAGE);
const limitSchema = z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT);

// Query string là chuỗi: "false" phải ra false (z.coerce.boolean coi mọi chuỗi không rỗng là true).
const booleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true");

const searchTextSchema = z
  .string()
  .trim()
  .min(SEARCH_QUERY_MIN_LENGTH, `Từ khóa cần ít nhất ${SEARCH_QUERY_MIN_LENGTH} ký tự`)
  .max(SEARCH_QUERY_MAX_LENGTH);

const listFilterShape = {
  page: pageSchema,
  limit: limitSchema,
  // Mặc định chỉ văn bản còn hiệu lực; truyền inForce=false để xem cả văn bản đã hết hiệu lực.
  inForce: booleanQuerySchema.default(true),
  collection: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{1,40}$/, "collection chỉ gồm chữ cái")
    .optional(),
  // Mục do Be.Travel tuyển chọn (core/auLawTopics.js); khi có topic thì bỏ qua collection.
  topic: z.enum(AU_LAW_TOPIC_SLUGS).optional(),
};

export const listQuerySchema = z.object({ ...listFilterShape, q: searchTextSchema.optional() });
export const searchQuerySchema = z.object({ ...listFilterShape, q: searchTextSchema });

export const versionsQuerySchema = z.object({ page: pageSchema, limit: limitSchema });

export const contentQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(MAX_CONTENT_LIMIT).default(DEFAULT_CONTENT_LIMIT),
});

// Dịch theo cụm 25 đoạn: offset bội số của 25 để cache dùng lại; mỗi lần tối đa 100 đoạn (4 cụm).
const TRANSLATION_CHUNK_SIZE = 25;
const MAX_TRANSLATE_LIMIT = 100;

export const contentViQuerySchema = z.object({
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .refine(
      (value) => value % TRANSLATION_CHUNK_SIZE === 0,
      `offset phải là bội số của ${TRANSLATION_CHUNK_SIZE}`,
    )
    .default(0),
  limit: z.coerce.number().int().min(1).max(MAX_TRANSLATE_LIMIT).default(MAX_TRANSLATE_LIMIT),
});
