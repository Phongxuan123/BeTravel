import { test } from "node:test";
import assert from "node:assert/strict";
import { createGeminiLlmProvider } from "../src/rag/llm/gemini.llm.js";

test("dịch thử lại 503 đúng một lần và giữ chung timeout; không thử lại 429", async () => {
  const original = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (_url, options) => {
      calls.push(options);
      return calls.length === 1
        ? new Response("unavailable", { status: 503 })
        : Response.json({
            candidates: [
              { content: { parts: [{ text: '{"translated":"Good morning","phonetic":""}' }] } },
            ],
          });
    };
    const provider = createGeminiLlmProvider({
      apiKey: "test",
      model: "test",
      retryUnavailable: true,
    });
    assert.match(
      await provider.complete({ systemPrompt: "translate", userPrompt: "hello" }),
      /Good morning/,
    );
    assert.equal(calls.length, 2);
    assert.equal(calls[0].signal, calls[1].signal);
    calls.length = 0;
    globalThis.fetch = async () => {
      calls.push(1);
      return new Response("quota", { status: 429 });
    };
    await assert.rejects(
      provider.complete({ systemPrompt: "translate", userPrompt: "hello" }),
      /429/,
    );
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = original;
  }
});
