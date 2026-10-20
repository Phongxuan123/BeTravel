import { env } from "../../core/env.js";

// Dung chung cho moi dich vu tuong thich OpenAI (OpenAI, APIZ...): chi doi OPENAI_BASE_URL.
const chatUrl = () => `${env.OPENAI_BASE_URL.replace(/\/+$/, "")}/chat/completions`;

// Provider du phong (master plan B.6) -- dung khi Gemini het quota/tam ngung.
export function createOpenAiLlmProvider({ apiKey, model }) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  return {
    provider: "openai",
    model,
    async complete({ systemPrompt, userPrompt }) {
      const res = await fetch(chatUrl(), {
        method: "POST",
        signal: AbortSignal.timeout(env.AI_PROVIDER_TIMEOUT_MS),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          // Mot so dich vu tuong thich khong ho tro json_object; prompt da yeu cau JSON, parseLlmJson kiem lai.
          ...(env.OPENAI_JSON_MODE && { response_format: { type: "json_object" } }),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`OPENAI_LLM_FAILED: ${res.status} ${errorText}`);
      }

      const json = await res.json();
      const text = json.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error("OPENAI_LLM_EMPTY_RESPONSE");
      }
      return text;
    },
  };
}
