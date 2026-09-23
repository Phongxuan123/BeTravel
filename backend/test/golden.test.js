import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import Country from "../src/models/Country.js";
import LegalTopic from "../src/models/LegalTopic.js";
import LegalArticle from "../src/models/LegalArticle.js";
import LegalChunk from "../src/models/LegalChunk.js";
import User from "../src/models/User.js";
import { ContentStatus } from "../src/core/constants.js";
import { chunkArticle } from "../src/rag/chunking.js";
import { getEmbeddingProvider, __setEmbeddingProviderForTest } from "../src/rag/embedding/index.js";
import { __setLlmProviderForTest } from "../src/rag/llm/index.js";
import { createMockEmbeddingProvider } from "../src/rag/embedding/mock.embedding.js";
import { createMockLlmProvider } from "../src/rag/llm/mock.llm.js";
import { invalidateMemorySearchCache } from "../src/rag/search/memory.driver.js";
import { COUNTRIES, KR_TOPICS, KR_ARTICLES, buildBodyMd } from "../scripts/seed-content.js";
import * as chatService from "../src/services/chat.service.js";

/*
 * ★ GOLDEN TEST (docs/03_Contracts_v2.md muc 13, CLAUDE.md muc 4.1 AC-04).
 * Chay toan bo pipeline chat THAT (chat.service.js) tren du lieu KR THAT
 * (tai su dung dung noi dung trong scripts/seed-content.js -- Rule 3 DRY,
 * khong bia mot bo du lieu gia lap song song) voi SEARCH_DRIVER=memory +
 * LLM_PROVIDER=mock + EMBEDDING_PROVIDER=mock -- KHONG goi API that, ket qua
 * tat dinh, chay duoc trong CI.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { cases } = JSON.parse(fs.readFileSync(path.join(__dirname, "golden", "kr.json"), "utf8"));

let user;

test.before(async () => {
  await startTestDb();
});

test.after(async () => {
  await stopTestDb();
});

test("golden KR", async (t) => {
  await clearTestDb();
  __setEmbeddingProviderForTest(createMockEmbeddingProvider({ dims: 768 }));
  __setLlmProviderForTest(createMockLlmProvider());
  invalidateMemorySearchCache();

  for (const c of COUNTRIES) await Country.create(c);
  for (const topic of KR_TOPICS) await LegalTopic.create({ countryCode: "KR", ...topic });

  const embeddingProvider = getEmbeddingProvider();

  for (const a of KR_ARTICLES) {
    const article = await LegalArticle.create({
      ...a,
      countryCode: "KR",
      version: 1,
      isCurrent: true,
      status: ContentStatus.PUBLISHED,
      bodyMd: buildBodyMd(a),
    });

    const pieces = chunkArticle(article.toObject(), { countryName: "Hàn Quốc", topicName: a.topicSlug });
    const embeddings = await embeddingProvider.embedBatch(pieces.map((p) => p.textForEmbedding));

    await LegalChunk.insertMany(
      pieces.map((p, index) => ({
        articleId: article._id,
        articleSlug: article.slug,
        articleVersion: article.version,
        countryCode: "KR",
        topicSlug: article.topicSlug,
        status: ContentStatus.PUBLISHED,
        heading: p.heading,
        order: p.order,
        text: p.text,
        textNorm: p.textNorm,
        embedding: embeddings[index],
        embeddingModel: embeddingProvider.model,
        kind: p.kind,
      })),
    );
  }
  invalidateMemorySearchCache();

  user = await User.create({
    username: "golden_test_user",
    fullName: "Golden Test",
    email: "golden@betravel.test",
    password: "x".repeat(20),
    phone: "",
    role: "user",
  });

  for (const c of cases) {
    await t.test(`${c.id} (${c.type}): ${c.question}`, async () => {
      const session = await chatService.createSession(user._id, c.contextCountry ?? "KR");
      const { message } = await chatService.sendMessage({
        userId: user._id,
        sessionId: session._id,
        question: c.question,
      });

      if (c.type === "must_answer") {
        assert.equal(
          message.fallbackReason,
          null,
          `mong doi co cau tra loi, nhung nhan fallback: ${message.fallbackReason}`,
        );
        assert.ok(
          message.citations.length >= (c.assert.minCitations ?? 1),
          `mong doi >= ${c.assert.minCitations ?? 1} citation, nhan ${message.citations.length}`,
        );
        if (c.expectArticleSlug) {
          const slugs = message.citations.map((cit) => cit.articleSlug);
          assert.ok(
            slugs.includes(c.expectArticleSlug),
            `mong doi citation tu '${c.expectArticleSlug}', nhan [${slugs.join(", ")}]`,
          );
        }
        return;
      }

      if (c.type === "must_refuse") {
        assert.equal(message.fallbackReason, "INSUFFICIENT_EVIDENCE");
        assert.equal(message.citations.length, 0);
        for (const pattern of c.assert.answerMustNotMatch ?? []) {
          assert.doesNotMatch(message.text, new RegExp(pattern, "iu"));
        }
        return;
      }

      if (c.type === "country_isolation") {
        // Khong duoc tra loi nhu the du lieu KR la du lieu cua nuoc duoc hoi.
        assert.equal(message.citations.length, 0);
        for (const pattern of c.assert.answerMustNotMatch ?? []) {
          assert.doesNotMatch(message.text, new RegExp(pattern, "iu"));
        }
        if (c.assert.mustMentionWrongCountry) {
          assert.match(message.text, /chỉ dành cho|đổi quốc gia/iu);
        }
      }
    });
  }
});
