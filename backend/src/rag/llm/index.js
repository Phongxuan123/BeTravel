import { env } from "../../core/env.js";
import { createMockLlmProvider } from "./mock.llm.js";
import { createClaudeLlmProvider } from "./claude.llm.js";
import { createGeminiLlmProvider } from "./gemini.llm.js";
import { createOpenAiLlmProvider } from "./openai.llm.js";

let cachedProvider = null;

export function getLlmProvider() {
  if (cachedProvider) return cachedProvider;

  if (env.LLM_PROVIDER === "gemini") {
    cachedProvider = createGeminiLlmProvider({ apiKey: env.GEMINI_API_KEY, model: env.LLM_MODEL });
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

// Bước tạo từ khoá (RETRIEVAL_MODE=lexical) dùng model riêng nếu có cấu hình, cùng nhà cung cấp chat.
export function getRewriteProvider() {
  const model = env.QUERY_REWRITE_MODEL;
  if (!model || model === env.LLM_MODEL) return getLlmProvider();
  if (env.LLM_PROVIDER === "openai")
    return createOpenAiLlmProvider({ apiKey: env.OPENAI_API_KEY, model });
  if (env.LLM_PROVIDER === "gemini")
    return createGeminiLlmProvider({ apiKey: env.GEMINI_API_KEY, model });
  return getLlmProvider();
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
