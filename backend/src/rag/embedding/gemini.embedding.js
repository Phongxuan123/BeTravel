const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MAX_BATCH_SIZE = 50;
const MAX_RETRIES = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (attempt < MAX_RETRIES && (res.status === 429 || res.status >= 500)) {
      await sleep(2 ** attempt * 500);
      return embedChunkWithRetry({ apiKey, model, dims, texts }, attempt + 1);
    }
    const errorText = await res.text().catch(() => "");
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
