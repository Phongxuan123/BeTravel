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

const SEARCH_QUERY_MAX_LENGTH = 200;

export const topicListQuerySchema = z.object({
  country: countryCodeSchema,
});

export const articleListQuerySchema = paginationQuerySchema.extend({
  country: countryCodeSchema,
  topic: slugSchema.optional(),
});

export const articleSearchQuerySchema = paginationQuerySchema.extend({
  // Moi tu thanh mot $regex -- khong gioi han thi mot q vai nghin ky tu tao
  // hang tram dieu kien $and quet toan collection.
  q: z
    .string()
    .trim()
    .min(1, "Vui long nhap tu khoa tim kiem")
    .max(SEARCH_QUERY_MAX_LENGTH, "Tu khoa tim kiem qua dai"),
  country: countryCodeSchema,
  topic: slugSchema.optional(),
});

// ── SupportLocation cong khai (/api/support-locations, B6) ──────────────
const locationTypeSchema = z.enum(["embassy", "hospital", "police", "pharmacy", "other"]);

export const supportLocationNearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  country: countryCodeSchema.optional(),
  type: locationTypeSchema.optional(),
  radiusKm: z.coerce.number().positive().max(200).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

// Địa điểm bổ sung từ bên thứ ba: BẮT BUỘC chọn loại trong danh sách cố định, không nhận chuỗi tìm
// kiếm tự do (tránh biến endpoint công khai thành proxy tiêu quota/tải của nhà cung cấp).
// Hai cách gọi: (lat, lng) để tìm quanh một điểm, hoặc (country, type=embassy) để lấy đại sứ quán Việt Nam
// của một quốc gia khi chưa có toạ độ nào (chưa có GPS, dữ liệu quốc gia chưa điền toạ độ).
const EXTERNAL_PLACE_TYPES = ["embassy", "hospital", "police", "pharmacy"];

export const externalPlacesQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    // Chỉ chữ cái: giá trị này được nối vào truy vấn Overpass nên không được chứa ký tự khác.
    country: countryCodeSchema.regex(/^[A-Z]{2}$/, "Ma quoc gia chi gom 2 chu cai").optional(),
    type: z.enum(EXTERNAL_PLACE_TYPES),
  })
  .refine((query) => (query.lat === undefined) === (query.lng === undefined), {
    message: "lat va lng phai di cung nhau",
  })
  .refine(
    (query) => query.lat !== undefined || (query.country !== undefined && query.type === "embassy"),
    { message: "Can lat va lng, hoac country voi type=embassy" },
  );

export const supportLocationListQuerySchema = z.object({
  country: countryCodeSchema.optional(),
  type: locationTypeSchema.optional(),
});

// ── Trips (/api/users/trips) ────────────────────────────────────────────
const tripDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải là YYYY-MM-DD")
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
    "Ngày không tồn tại",
  )
  .transform((value) => new Date(value));
const tripStopSchema = z.object({
  countryCode: countryCodeSchema,
  destinationCity: z.string().trim().min(1).max(100),
  destinationDetail: z.string().trim().max(240).optional().default(""),
  startDate: tripDate,
});

export const tripCreateSchema = z
  .object({
    countryCode: countryCodeSchema,
    destinationCity: z.string().trim().min(1, "Thanh pho/khu vuc khong duoc de trong").max(100),
    destinationDetail: z.string().trim().max(240).optional().default(""),
    locationAlerts: z.boolean().optional().default(true),
    regulationAlerts: z.boolean().optional().default(true),
    startDate: tripDate,
    endDate: tripDate,
    stops: z.array(tripStopSchema).min(1).max(20).optional(),
    updatedAt: z.iso.datetime().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "Ngay ve phai sau hoac bang ngay di",
    path: ["endDate"],
  })
  .superRefine((data, context) => {
    if (!data.stops?.length) return;
    if (
      !(data.startDate instanceof Date) ||
      !(data.endDate instanceof Date) ||
      data.stops.some((stop) => !(stop.startDate instanceof Date))
    )
      return;
    const first = data.stops[0];
    if (
      first.startDate.getTime() !== data.startDate.getTime() ||
      first.countryCode !== data.countryCode ||
      first.destinationCity !== data.destinationCity ||
      first.destinationDetail !== data.destinationDetail
    ) {
      context.addIssue({
        code: "custom",
        path: ["stops"],
        message: "Chặng đầu phải khớp điểm đến và ngày đi",
      });
    }
    data.stops.forEach((stop, index) => {
      if (
        stop.startDate > data.endDate ||
        (index > 0 && stop.startDate <= data.stops[index - 1].startDate)
      ) {
        context.addIssue({
          code: "custom",
          path: ["stops", index, "startDate"],
          message: "Ngày chuyển chặng phải tăng và nằm trong chuyến đi",
        });
      }
    });
  });

// Edit chuyến đi dùng cùng contract với create để tránh partial update làm dữ liệu
// nửa cũ/nửa mới. isCurrent được quản lý bằng endpoint /:id/current riêng.
export const tripUpdateSchema = tripCreateSchema;

// ── Incidents cong khai (/api/incidents, B7) ────────────────────────────
export const incidentListQuerySchema = z.object({
  country: countryCodeSchema.optional(),
});

// ── Incident progress (/api/users/incident-progress/:incidentId, B7) ────
export const incidentProgressUpdateSchema = z.object({
  completedSteps: z.array(z.string().trim().min(1).max(100)).max(200),
});

// ── Quick phrases cong khai (/api/quick-phrases, B7) ────────────────────
export const quickPhraseListQuerySchema = z.object({
  country: countryCodeSchema,
});

// ── Geo alerts cong khai (/api/alerts/applicable, B8) ────────────────────
export const alertsApplicableQuerySchema = z.object({
  country: countryCodeSchema,
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

// ── Favorites (/api/users/favorites, B8) ─────────────────────────────────
const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "ID không hợp lệ");

export const favoriteCreateSchema = z.object({
  targetType: z.enum(["article", "location", "incident"]),
  targetId: objectIdSchema,
});
