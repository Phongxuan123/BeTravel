import { env } from "../../core/env.js";
import { createMockLlmProvider } from "./mock.llm.js";
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

// Dịch dùng model riêng, không thay đổi cấu hình AI pháp lý; quota dự án vẫn chung.
export function getTranslationProvider() {
  if (env.LLM_PROVIDER === "gemini")
    return createGeminiLlmProvider({
      apiKey: env.GEMINI_API_KEY,
      model: env.TRANSLATION_MODEL,
      retryUnavailable: true,
    });
  return getLlmProvider();
}
