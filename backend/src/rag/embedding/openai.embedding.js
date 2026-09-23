const API_URL = "https://api.openai.com/v1/embeddings";
const MAX_BATCH_SIZE = 50;

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

/*
 * Provider du phong (master plan B.6) -- dung khi Gemini het quota hoac tam
 * ngung hoat dong. text-embedding-3-small ho tro `dimensions` de ep ve cung
 * 768 chieu voi Gemini, tranh tron 2 model trong cung index (CLAUDE.md muc 4.1).
 */
export function createOpenAiEmbeddingProvider({ apiKey, model, dims = 768 }) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  return {
    provider: "openai",
    model,
    dims,
    async embedBatch(texts) {
      const results = [];
      for (const batch of chunkArray(texts, MAX_BATCH_SIZE)) {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, input: batch, dimensions: dims }),
        });

        if (!res.ok) {
          const errorText = await res.text().catch(() => "");
          throw new Error(`OPENAI_EMBEDDING_FAILED: ${res.status} ${errorText}`);
        }

        const json = await res.json();
        results.push(...json.data.map((d) => d.embedding));
      }
      return results;
    },
  };
}
