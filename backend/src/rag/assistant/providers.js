import { env } from "../../core/env.js";
import { buildAuxiliaryProvider } from "../llm/index.js";
import { createOpenAiWebSearchProvider } from "../llm/openai.webSearch.js";

/*
 * Ba vai tro mo hinh cua tro ly ban 2 (G1: manh cho tra loi, re cho buoc phu). Gom ve mot cho de
 * test thay duoc toan bo bang provider gia, khong goi API that.
 */
let overrides = null;

export const getAnswerProvider = () =>
  overrides?.answer ?? buildAuxiliaryProvider(env.ASSISTANT_MODEL || env.LLM_MODEL);

export const getTriageProvider = () =>
  overrides?.triage ??
  buildAuxiliaryProvider(env.ASSISTANT_TRIAGE_MODEL || env.QUERY_REWRITE_MODEL || env.LLM_MODEL);

// null = tang tra web dang tat hoac nha cung cap khong ho tro (chi giao thuc OpenAI co /responses).
export const getWebSearchProvider = () => {
  if (overrides && "web" in overrides) return overrides.web;
  if (!env.ASSISTANT_WEB_SEARCH_ENABLED || env.LLM_PROVIDER !== "openai") return null;
  return createOpenAiWebSearchProvider({
    apiKey: env.OPENAI_API_KEY,
    model: env.ASSISTANT_WEB_SEARCH_MODEL || env.ASSISTANT_MODEL || env.LLM_MODEL,
  });
};

export const __setAssistantProvidersForTest = (providers) => {
  overrides = providers;
};
