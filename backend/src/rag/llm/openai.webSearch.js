import { env } from "../../core/env.js";

/*
 * Tra web qua Responses API (`/responses` + công cụ `web_search`) của dịch vụ tương thích OpenAI.
 * Đã đo 26/10/2026 qua APIZ: `/chat/completions` KHÔNG tra web được với bất kỳ tham số nào, chỉ
 * `/responses` mới có. `allowed_domains` giới hạn tìm kiếm ở phía nhà cung cấp; guard vẫn kiểm lại
 * từng URL (rag/webAnswer.js), không tin bộ lọc này.
 */
const responsesUrl = () => `${env.OPENAI_BASE_URL.replace(/\/+$/, "")}/responses`;

// Mọi URL mà công cụ tìm kiếm thực sự trả về hoặc mở: model chỉ được trích trong tập này.
const collectSeenUrls = (output) => {
  const urls = new Set();
  for (const item of output) {
    if (item.type !== "web_search_call") continue;
    const action = item.action ?? {};
    if (action.url) urls.add(action.url);
    for (const source of action.sources ?? []) if (source.url) urls.add(source.url);
  }
  return urls;
};

const collectText = (output) =>
  output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .map((part) => part.text ?? "")
    .join("");

export function createOpenAiWebSearchProvider({ apiKey, model }) {
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");

  return {
    provider: "openai",
    model,
    /**
     * @returns {Promise<{text:string, seenUrls:Set<string>, searchCount:number,
     *   usage:{inputTokens:number, outputTokens:number}}>}
     */
    async search({ instructions, input, allowedDomains, maxOutputTokens, timeoutMs }) {
      const res = await fetch(responsesUrl(), {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          instructions,
          input,
          max_output_tokens: maxOutputTokens,
          tools: [{ type: "web_search", filters: { allowed_domains: allowedDomains } }],
          include: ["web_search_call.action.sources"],
        }),
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`OPENAI_WEB_SEARCH_FAILED: ${res.status} ${errorText.slice(0, 200)}`);
      }
      const json = await res.json();
      const output = json.output ?? [];
      const text = collectText(output);
      if (!text) throw new Error("OPENAI_WEB_SEARCH_EMPTY_RESPONSE");
      return {
        text,
        seenUrls: collectSeenUrls(output),
        searchCount: output.filter((item) => item.type === "web_search_call").length,
        usage: {
          inputTokens: json.usage?.input_tokens ?? 0,
          outputTokens: json.usage?.output_tokens ?? 0,
        },
      };
    },
  };
}
