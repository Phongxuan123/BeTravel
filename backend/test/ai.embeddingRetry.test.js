import test from "node:test";
import assert from "node:assert/strict";

// Nap bien moi truong test truoc (CI khong co .env); gemini.embedding.js doc env luc import.
import "./setup.js";

import {
  createGeminiEmbeddingProvider,
  parseRetryDelayMs,
} from "../src/rag/embedding/gemini.embedding.js";

/*
 * Goi Gemini mien phi gioi han 100 luot embed/phut: khi 429 phai cho dung thoi gian server bao
 * roi thu lai, neu khong index mot luat Uc (hang tram chunk) se that bai giua chung.
 */

test("parseRetryDelayMs doc thoi gian cho tu than loi 429, co tran va gia tri mac dinh", () => {
  assert.equal(parseRetryDelayMs("Please retry in 9.35s."), 10350);
  assert.equal(parseRetryDelayMs('{"retryDelay": "30s"}'), 31000);
  assert.equal(parseRetryDelayMs("Please retry in 900s."), 65000);
  assert.equal(parseRetryDelayMs("khong co thong tin"), 15000);
});

test("embedBatch cho roi thu lai khi 429 thay vi that bai", async (t) => {
  const responses = [
    { status: 429, body: "Please retry in 0.1s." },
    { status: 200, body: JSON.stringify({ embeddings: [{ values: [0.1, 0.2] }] }) },
  ];
  const calls = [];
  t.mock.method(globalThis, "fetch", async () => {
    calls.push(Date.now());
    const { status, body } = responses.shift();
    return new Response(body, { status });
  });

  const provider = createGeminiEmbeddingProvider({ apiKey: "k", model: "m", dims: 2 });
  const vectors = await provider.embedBatch(["van ban"]);

  assert.deepEqual(vectors, [[0.1, 0.2]]);
  assert.equal(calls.length, 2);
  assert.ok(calls[1] - calls[0] >= 1000, "phai cho it nhat khoang server bao");
});

test("loi khong phai 429 hoac 5xx thi bao loi ngay, khong thu lai", async (t) => {
  let count = 0;
  t.mock.method(globalThis, "fetch", async () => {
    count += 1;
    return new Response("bad key", { status: 403 });
  });
  const provider = createGeminiEmbeddingProvider({ apiKey: "k", model: "m", dims: 2 });
  await assert.rejects(provider.embedBatch(["x"]), /GEMINI_EMBEDDING_FAILED: 403/);
  assert.equal(count, 1);
});
