const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/*
 * Goi thang REST API cua Gemini bang fetch (khong them SDK @google/genai --
 * chi can 1 endpoint duy nhat, them dependency la thua, Rule 9 KISS).
 * responseMimeType:'application/json' ep model tra JSON thuan, khong bao boc
 * markdown code fence -- dung cach hon parse thu cong.
 */
export function createGeminiLlmProvider({ apiKey, model }) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  return {
    provider: "gemini",
    model,
    async complete({ systemPrompt, userPrompt }) {
      const url = `${API_BASE}/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      });

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
