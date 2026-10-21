import { env } from "../../core/env.js";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MAX_BATCH_SIZE = 50;
const MAX_RETRIES = 3;
// Goi mien phi: 100 luot embed/phut (moi van ban trong batch tinh la 1 luot). Khi 429, cho dung
// thoi gian server bao roi thu lai, toi da MAX_RATE_LIMIT_RETRIES lan (index mot luat lon mat vai phut).
const MAX_RATE_LIMIT_RETRIES = 8;
const DEFAULT_RATE_LIMIT_WAIT_MS = 15_000;
const MAX_RATE_LIMIT_WAIT_MS = 65_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

// "Please retry in 9.35s" / retryDelay "9s" trong than loi 429 cua Gemini.
export const parseRetryDelayMs = (errorText) => {
  const match = /retry in ([\d.]+)s|"retryDelay":\s*"(\d+(?:\.\d+)?)s"/i.exec(errorText);
  const seconds = Number.parseFloat(match?.[1] ?? match?.[2]);
  return Number.isFinite(seconds)
    ? Math.min(Math.ceil(seconds * 1000) + 1000, MAX_RATE_LIMIT_WAIT_MS)
    : DEFAULT_RATE_LIMIT_WAIT_MS;
};

async function embedChunkWithRetry({ apiKey, model, dims, texts }, attempt = 1) {
  const url = `${API_BASE}/models/${model}:batchEmbedContents?key=${apiKey}`;
  const body = {
    requests: texts.map((text) => ({
      model: `models/${model}`,
      content: { parts: [{ text }] },
      outputDimensionality: dims,
    })),
  };

  const res = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(env.AI_PROVIDER_TIMEOUT_MS),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    if (res.status === 429 && attempt <= MAX_RATE_LIMIT_RETRIES) {
      await sleep(parseRetryDelayMs(errorText));
      return embedChunkWithRetry({ apiKey, model, dims, texts }, attempt + 1);
    }
    if (res.status >= 500 && attempt < MAX_RETRIES) {
      await sleep(2 ** attempt * 500);
      return embedChunkWithRetry({ apiKey, model, dims, texts }, attempt + 1);
    }
    throw new Error(`GEMINI_EMBEDDING_FAILED: ${res.status} ${errorText}`);
  }

  const json = await res.json();
  return json.embeddings.map((e) => e.values);
}

/*
 * Provider that -- ep dims=768 (khong duoc trom mo hinh nao ra so chieu khac,
 * xem CLAUDE.md muc 4.1 "embedding dong nhat"). Batch toi da 50 text/lan +
 * retry backoff khi Gemini tra 429/5xx (rate limit hoac loi tam thoi).
 */
export function createGeminiEmbeddingProvider({ apiKey, model, dims = 768 }) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  return {
    provider: "gemini",
    model,
    dims,
    async embedBatch(texts) {
      const batches = chunkArray(texts, MAX_BATCH_SIZE);
      const results = [];
      for (const batch of batches) {
        const vectors = await embedChunkWithRetry({ apiKey, model, dims, texts: batch });
        results.push(...vectors);
      }
      return results;
    },
  };
}
