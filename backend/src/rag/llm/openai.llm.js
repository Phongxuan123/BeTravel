const API_URL = "https://api.openai.com/v1/chat/completions";

// Provider du phong (master plan B.6) -- dung khi Gemini het quota/tam ngung.
export function createOpenAiLlmProvider({ apiKey, model }) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  return {
    provider: "openai",
    model,
    async complete({ systemPrompt, userPrompt }) {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
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
