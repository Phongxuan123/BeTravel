import { env } from "../../core/env.js";

const MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
// Messages API bắt buộc có max_tokens; dịch một cụm 25 đoạn dài nên đặt trần rộng để không bị cắt giữa chừng.
const DEFAULT_MAX_OUTPUT_TOKENS = 16_000;

// Provider Claude (Anthropic Messages API), hiện chỉ dùng cho việc dịch luật (TRANSLATION_PROVIDER=claude).
export function createClaudeLlmProvider({ apiKey, model }) {
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY_MISSING");
  }

  return {
    provider: "claude",
    model,
    async complete({ systemPrompt, userPrompt, maxOutputTokens }) {
      const res = await fetch(MESSAGES_URL, {
        method: "POST",
        signal: AbortSignal.timeout(env.AI_PROVIDER_TIMEOUT_MS),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
          // Không gửi temperature/top_p/top_k: từ 21/10/2026 Messages API trả 400 cho mọi model khi có các
          // tham số này (claude-haiku-5-5 vốn đã từ chối giá trị khác mặc định).
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      // Thông báo lỗi giữ nguyên mã HTTP để rateLimitRetry nhận ra 429 và chờ thử lại.
      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`CLAUDE_LLM_FAILED: ${res.status} ${errorText}`);
      }

      const json = await res.json();
      const text = json.content?.find((block) => block.type === "text")?.text;
      if (!text) {
        throw new Error("CLAUDE_LLM_EMPTY_RESPONSE");
      }
      return text;
    },
  };
}
