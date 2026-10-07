import { env } from "../../core/env.js";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/*
 * Goi thang REST API cua Gemini bang fetch (khong them SDK @google/genai --
 * chi can 1 endpoint duy nhat, them dependency la thua, Rule 9 KISS).
 * responseMimeType:'application/json' ep model tra JSON thuan, khong bao boc
 * markdown code fence -- dung cach hon parse thu cong.
 */
export function createGeminiLlmProvider({ apiKey, model, retryUnavailable = false }) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  return {
    provider: "gemini",
    model,
    async complete({ systemPrompt, userPrompt }) {
      const url = `${API_BASE}/models/${model}:generateContent?key=${apiKey}`;
      const signal = AbortSignal.timeout(env.AI_PROVIDER_TIMEOUT_MS);
      const options = {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      };
      let res = await fetch(url, options);
      // Một lần thử lại lỗi tạm thời, dùng chung timeout để không kéo dài vô hạn.
      if (retryUnavailable && [502, 503, 504].includes(res.status)) {
        await res.body?.cancel();
        res = await fetch(url, options);
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`GEMINI_LLM_FAILED: ${res.status} ${errorText}`);
      }

      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("GEMINI_LLM_EMPTY_RESPONSE");
      }
      return text;
    },
  };
}
