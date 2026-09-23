import { env } from "../../core/env.js";
import { createMockEmbeddingProvider } from "./mock.embedding.js";
import { createGeminiEmbeddingProvider } from "./gemini.embedding.js";
import { createOpenAiEmbeddingProvider } from "./openai.embedding.js";

/*
 * Factory theo EMBEDDING_PROVIDER trong env -- noi DUY NHAT quyet dinh dung
 * provider nao, phan con lai cua rag/ chi biet interface { model, dims,
 * embedBatch(texts): Promise<number[][]> }.
 */
let cachedProvider = null;

export function getEmbeddingProvider() {
  if (cachedProvider) return cachedProvider;

  if (env.EMBEDDING_PROVIDER === "gemini") {
    cachedProvider = createGeminiEmbeddingProvider({
      apiKey: env.GEMINI_API_KEY,
      model: env.EMBEDDING_MODEL,
      dims: env.EMBEDDING_DIMS,
    });
  } else if (env.EMBEDDING_PROVIDER === "openai") {
    cachedProvider = createOpenAiEmbeddingProvider({
      apiKey: env.OPENAI_API_KEY,
      model: env.EMBEDDING_MODEL,
      dims: env.EMBEDDING_DIMS,
    });
  } else {
    cachedProvider = createMockEmbeddingProvider({ dims: env.EMBEDDING_DIMS });
  }

  return cachedProvider;
}

// Chi dung trong test: ep doi provider (vi du mock du env that la gemini).
export function __setEmbeddingProviderForTest(provider) {
  cachedProvider = provider;
}
