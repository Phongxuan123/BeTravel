import { env } from "../../core/env.js";
import { createMockLlmProvider } from "./mock.llm.js";
import { createClaudeLlmProvider } from "./claude.llm.js";
import { createGeminiLlmProvider } from "./gemini.llm.js";
import { createOpenAiLlmProvider } from "./openai.llm.js";

let cachedProvider = null;

/*
 * Do 10/11 tren Render: Gemini thinh thoang tra 503 (qua tai) --> tro ly bao "dang ban" du hoi lai
 * ngay thi duoc. Thu lai mot lan trong cung timeout, nhu provider dich.
 */
const createGeminiChatProvider = (model) =>
  createGeminiLlmProvider({ apiKey: env.GEMINI_API_KEY, model, retryUnavailable: true });

export function getLlmProvider() {
  if (cachedProvider) return cachedProvider;

  if (env.LLM_PROVIDER === "gemini") {
    cachedProvider = createGeminiChatProvider(env.LLM_MODEL);
  } else if (env.LLM_PROVIDER === "openai") {
    cachedProvider = createOpenAiLlmProvider({ apiKey: env.OPENAI_API_KEY, model: env.LLM_MODEL });
  } else {
    cachedProvider = createMockLlmProvider();
  }

  return cachedProvider;
}

export function __setLlmProviderForTest(provider) {
  cachedProvider = provider;
}

// Provider cho một model bước phụ, cùng nhà cung cấp với chat; model rỗng hoặc trùng chat dùng luôn provider chat.
export function buildAuxiliaryProvider(model) {
  if (!model || model === env.LLM_MODEL) return getLlmProvider();
  if (env.LLM_PROVIDER === "openai")
    return createOpenAiLlmProvider({ apiKey: env.OPENAI_API_KEY, model });
  if (env.LLM_PROVIDER === "gemini") return createGeminiChatProvider(model);
  return getLlmProvider();
}

/*
 * Bọc provider chính bằng model dự phòng (BUG-01): model chính hết giờ, báo lỗi hoặc trả kết quả mà
 * input.validate (tuỳ chọn) từ chối thì thử model dự phòng đúng 1 lần. Không có model dự phòng thì giữ
 * nguyên hành vi cũ (lỗi ném ra, kết quả không hợp lệ trả lại để caller tự xử lý).
 */
export function withAuxiliaryFallback(primary, fallback) {
  if (!fallback || fallback === primary) return primary;
  return {
    ...primary,
    async complete(input) {
      let primaryText = null;
      let primaryError = null;
      try {
        primaryText = await primary.complete(input);
        if (!input.validate || input.validate(primaryText)) return primaryText;
      } catch (error) {
        primaryError = error;
      }
      try {
        return await fallback.complete(input);
      } catch (fallbackError) {
        if (primaryError) throw primaryError;
        console.error(
          "[rag] model dự phòng bước phụ cũng lỗi:",
          String(fallbackError?.message ?? fallbackError).slice(0, 200),
        );
        return primaryText;
      }
    },
  };
}

// Bước tạo từ khoá / chấm chủ đề / chấm trùng câu dùng model riêng (QUERY_REWRITE_MODEL), có model dự phòng tuỳ chọn.
export function getRewriteProvider() {
  const primary = buildAuxiliaryProvider(env.QUERY_REWRITE_MODEL);
  const fallbackModel = env.QUERY_REWRITE_FALLBACK_MODEL;
  if (!fallbackModel) return primary;
  return withAuxiliaryFallback(primary, buildAuxiliaryProvider(fallbackModel));
}

// Dịch dùng model riêng, không thay đổi cấu hình AI pháp lý; quota dự án vẫn chung.
// TRANSLATION_PROVIDER=gemini|claude: dịch luôn chạy bằng nhà cung cấp đó (model TRANSLATION_MODEL) dù chat dùng nhà cung cấp
// khác (APIZ); mặc định dùng chung nhà cung cấp với chat.
export function getTranslationProvider() {
  if (env.TRANSLATION_PROVIDER === "claude")
    return createClaudeLlmProvider({ apiKey: env.ANTHROPIC_API_KEY, model: env.TRANSLATION_MODEL });
  if (env.LLM_PROVIDER === "gemini" || env.TRANSLATION_PROVIDER === "gemini")
    return createGeminiLlmProvider({
      apiKey: env.GEMINI_API_KEY,
      model: env.TRANSLATION_MODEL,
      retryUnavailable: true,
    });
  return getLlmProvider();
}
