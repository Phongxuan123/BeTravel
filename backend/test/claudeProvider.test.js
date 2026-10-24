import { test } from "node:test";
import assert from "node:assert/strict";

import "./setup.js";
import { createClaudeLlmProvider } from "../src/rag/llm/claude.llm.js";

// Provider Claude dùng cho dịch luật: kiểm đúng định dạng gọi Messages API và cách đọc kết quả/lỗi.
test("createClaudeLlmProvider: thiếu key thì từ chối ngay", () => {
  assert.throws(() => createClaudeLlmProvider({ apiKey: "", model: "m" }), /ANTHROPIC_API_KEY_MISSING/);
});

test("claude provider: gửi x-api-key, system, max_tokens và trả text; lỗi HTTP giữ mã để retry 429", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return calls.length === 1
      ? { ok: true, json: async () => ({ content: [{ type: "text", text: '{"translations":["a"]}' }] }) }
      : { ok: false, status: 429, text: async () => "rate limit" };
  };
  try {
    const provider = createClaudeLlmProvider({ apiKey: "k", model: "claude-haiku-5-5" });
    const text = await provider.complete({ systemPrompt: "sys", userPrompt: "usr" });
    assert.equal(text, '{"translations":["a"]}');
    assert.equal(calls[0].url, "https://api.anthropic.com/v1/messages");
    assert.equal(calls[0].init.headers["x-api-key"], "k");
    assert.equal(calls[0].body.system, "sys");
    assert.equal(calls[0].body.model, "claude-haiku-5-5");
    assert.ok(calls[0].body.max_tokens > 0);
    await assert.rejects(provider.complete({ systemPrompt: "s", userPrompt: "u" }), /CLAUDE_LLM_FAILED: 429/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
