import dotenv from "dotenv";
import { z } from "zod";

/*
 * Nạp .env NGAY TẠI ĐÂY thay vì ở server.js. Lý do: ESM kéo toàn bộ lệnh
 * import lên đầu file, nên `dotenv.config()` viết ở server.js thực ra chạy SAU
 * khi các module con đã được nạp -- module nào đọc env lúc khởi tạo sẽ thấy
 * rỗng. Đặt ở đây thì mọi module import `env` đều chắc chắn đã có .env.
 * `override: true` để một MONGODB_URI cũ còn sót trong terminal không đè lên .env.
 *
 * NGOẠI LỆ: trong NODE_ENV=test, KHÔNG override. test/setup.js tự đặt
 * MONGODB_URI/JWT_ACCESS_SECRET trỏ vào mongodb-memory-server TRƯỚC khi import
 * module này -- override:true sẽ lấy MONGODB_URI Atlas thật trong .env đè lên,
 * khiến test cố kết nối mạng thật và treo hàng chục giây.
 */
dotenv.config({ path: ".env", override: process.env.NODE_ENV !== "test", quiet: true });

/*
 * Validate toàn bộ biến môi trường NGAY LÚC KHỞI ĐỘNG và fail fast.
 * Lý do: thiếu một secret mà vẫn chạy được thì lỗi sẽ nổ giữa lúc demo,
 * ở một endpoint ngẫu nhiên, thay vì nổ ngay ở dòng log đầu tiên.
 *
 * Mọi ngưỡng RAG, tên model, TTL đều nằm ở đây -- không hard-code trong code
 * nghiệp vụ (Rule 6).
 */

const booleanish = (defaultValue) =>
  z
    .string()
    .optional()
    .transform((value) => (value === undefined ? defaultValue : value === "true"));

const numeric = (defaultValue) => z.coerce.number().optional().default(defaultValue);

const csv = (defaultValue) =>
  z
    .string()
    .optional()
    .transform((value) =>
      (value ?? defaultValue)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: numeric(3000),

  CLIENT_URL: z.string().default("http://localhost:5173"),
  CORS_ORIGINS: csv("http://localhost:5173,http://localhost:8081"),

  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI không được để trống")
    .refine(
      (uri) => uri.startsWith("mongodb://") || uri.startsWith("mongodb+srv://"),
      "MONGODB_URI phải bắt đầu bằng mongodb:// hoặc mongodb+srv://",
    ),
  MONGO_MAX_POOL_SIZE: numeric(10),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET phải dài ít nhất 16 ký tự"),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  REFRESH_TTL_DAYS: numeric(30),

  // body = mobile (expo-secure-store) · cookie = admin web · both = cả hai
  AUTH_TRANSPORT: z.enum(["body", "cookie", "both"]).default("body"),
  // Cửa sổ ân hạn xoay vòng refresh token, xem refreshToken.service.js
  REFRESH_ROTATION_GRACE_SECONDS: numeric(10),

  GOOGLE_CLIENT_ID: z.string().optional().default(""),

  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: numeric(465),
  SMTP_SECURE: booleanish(true),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  // true = khong gui email that (test/dev khong co SMTP). Mac dinh false: production gui that.
  SMTP_DISABLED: booleanish(false),

  LLM_PROVIDER: z.enum(["gemini", "openai", "mock"]).default("mock"),
  GEMINI_API_KEY: z.string().optional().default(""),
  OPENAI_API_KEY: z.string().optional().default(""),
  LLM_MODEL: z.string().default("gemini-3.6-flash"),
  TRANSLATION_MODEL: z.string().default("gemini-3.5-flash-lite"),
  EMBEDDING_PROVIDER: z.enum(["gemini", "openai", "mock"]).default("mock"),
  EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),
  EMBEDDING_DIMS: numeric(768),

  SEARCH_DRIVER: z.enum(["atlas", "memory"]).default("memory"),
  VECTOR_INDEX_NAME: z.string().default("vec_idx"),
  TEXT_INDEX_NAME: z.string().default("txt_idx"),
  // Cong tat tam thoi toan bo tra cuu phap luat (cam nang, tim kiem, AI Legal).
  // Mặc định mở theo yêu cầu khôi phục cẩm nang; chỉ trả nội dung đã xuất bản.
  // Đặt false nếu vận hành cần tạm đóng tra cứu.
  LEGAL_LOOKUP_ENABLED: booleanish(true),
  RAG_TOP_K: numeric(8),
  RAG_NUM_CANDIDATES: numeric(150),
  RAG_MIN_TOP_SCORE: numeric(0.62),
  RAG_MIN_SOFT_SCORE: numeric(0.55),
  RAG_MIN_CHUNKS: numeric(2),
  AI_PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  AI_CACHE_TTL_HOURS: numeric(24),
  AI_DAILY_QUOTA_USER: numeric(40),
  AI_DAILY_QUOTA_GLOBAL: numeric(800),

  APP_VERSION: z.string().default("1.0.0"),

  // Chi dung boi scripts/seed-content.js (npm run seed) -- tao/nang quyen
  // 1 tai khoan admin de dang nhap Admin Portal ngay sau khi seed. Doi mat
  // khau NGAY sau lan dang nhap dau tien, dac biet o moi truong da trien khai.
  // KHONG co mat khau mac dinh: repo public, gia tri mac dinh = ai cung biet.
  SEED_ADMIN_EMAIL: z.string().optional().default("admin@betravel.local"),
  SEED_ADMIN_PASSWORD: z
    .string()
    .optional()
    .transform((value) => value || undefined),
});

const PRODUCTION_JWT_SECRET_MIN_LENGTH = 32;
const PROVIDER_API_KEY = { gemini: "GEMINI_API_KEY", openai: "OPENAI_API_KEY" };

/*
 * Production KHONG duoc am tham chay provider mock (mac dinh cua schema, de
 * dev/test khong ton tien): thieu bien la tro ly AI tra loi gia hoac tu choi
 * moi cau ma khong ai biet vi sao. Fail fast ngay luc khoi dong (QA-5, M16).
 */
const productionEnvSchema = envSchema.superRefine((data, ctx) => {
  if (data.NODE_ENV !== "production") return;
  if (data.JWT_ACCESS_SECRET.length < PRODUCTION_JWT_SECRET_MIN_LENGTH) {
    ctx.addIssue({
      code: "custom",
      path: ["JWT_ACCESS_SECRET"],
      message: `Production cần JWT_ACCESS_SECRET dài ít nhất ${PRODUCTION_JWT_SECRET_MIN_LENGTH} ký tự`,
    });
  }
  for (const key of ["LLM_PROVIDER", "EMBEDDING_PROVIDER"]) {
    const provider = data[key];
    if (provider === "mock") {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: "Production không được dùng provider mock",
      });
    } else if (!data[PROVIDER_API_KEY[provider]]) {
      ctx.addIssue({
        code: "custom",
        path: [PROVIDER_API_KEY[provider]],
        message: `Thiếu ${PROVIDER_API_KEY[provider]} cho ${key}=${provider}`,
      });
    }
  }
});

// Ham thuan de test duoc tung cau hinh ma khong phai doc .env that (co secret).
export const parseEnv = (source) => productionEnvSchema.safeParse(source);

const parsed = parseEnv(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  console.error("Cấu hình môi trường không hợp lệ:\n" + problems);
  console.error("Kiểm tra backend/.env, đối chiếu backend/.env.example.");
  process.exit(1);
}

export const env = Object.freeze(parsed.data);

export const isProduction = env.NODE_ENV === "production";

export const authTransportIncludes = (mode) =>
  env.AUTH_TRANSPORT === mode || env.AUTH_TRANSPORT === "both";
