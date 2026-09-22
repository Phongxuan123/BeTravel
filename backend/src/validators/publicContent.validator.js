import { z } from "zod";

import { paginationQuerySchema } from "./admin.validator.js";

/*
 * Zod schema cho toan bo endpoint CONG KHAI (khong can dang nhap):
 * /api/countries, /api/legal/topics, /api/legal/articles, /api/legal/search.
 * Tach rieng khoi admin.validator.js vi day la mien nghiep vu khac (doc,
 * khong sua), va khong yeu cau countryCode phai la ma da ton tai trong DB --
 * de service tra NOT_FOUND/mang rong thay vi loi validate.
 */

const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(2, "Ma quoc gia phai la ISO-2 (2 ky tu)");

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Slug khong duoc de trong")
  .regex(/^[a-z0-9-]+$/, "Slug chi duoc chua chu thuong, so va dau gach ngang");

export const topicListQuerySchema = z.object({
  country: countryCodeSchema,
});

export const articleListQuerySchema = paginationQuerySchema.extend({
  country: countryCodeSchema,
  topic: slugSchema.optional(),
});

export const articleSearchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1, "Vui long nhap tu khoa tim kiem"),
  country: countryCodeSchema,
  topic: slugSchema.optional(),
});

// ── Trips (/api/users/trips) ────────────────────────────────────────────
export const tripCreateSchema = z
  .object({
    countryCode: countryCodeSchema,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "Ngay ve phai sau hoac bang ngay di",
    path: ["endDate"],
  });
