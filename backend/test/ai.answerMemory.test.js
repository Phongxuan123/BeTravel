import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";

/*
 * BUG-24: câu đảo từ (Jaccard từ khoá vừa phải) được AI chấm trùng ý trước khi quyết định dùng lại
 * câu trả lời đã nhớ. Chỉ kiểm findSimilarRepeat với provider mock, không gọi model thật.
 */
let AnswerMemory;
let findSimilarRepeat;
let llmIndex;

before(async () => {
  await startTestDb();
  AnswerMemory = (await import("../src/models/AnswerMemory.js")).default;
  ({ findSimilarRepeat } = await import("../src/services/answerMemory.service.js"));
  llmIndex = await import("../src/rag/llm/index.js");
});
after(stopTestDb);
beforeEach(clearTestDb);

const useScoreFromAi = (score) =>
  llmIndex.__setLlmProviderForTest({
    provider: "mock",
    model: "mock-score",
    complete: async () => JSON.stringify({ scores: [score] }),
  });

const remember = () =>
  AnswerMemory.create({
    key: "k1",
    countryCode: "AU",
    question: "Ở Sydney tôi làm mất hộ chiếu thì phải làm gì",
    keywordTerms: ["mất hộ chiếu", "sydney", "trình báo", "đại sứ quán"],
    answer: "Câu trả lời cũ",
    answerSource: "official_web",
    model: "mock",
    sources: [],
    expiresAt: new Date(Date.now() + 3_600_000),
  });

test("cau dao tu: Jaccard vua phai + AI cham du diem thi dung lai cau tra loi cu", async () => {
  await remember();
  useScoreFromAi(95);

  const found = await findSimilarRepeat({
    countryCode: "AU",
    keywordTerms: ["mất hộ chiếu", "sydney", "trình báo", "bước"],
    question: "Mất hộ chiếu ở Sydney thì tôi phải làm những bước gì",
  });

  assert.equal(found?.answer, "Câu trả lời cũ");
});

test("cau dao tu: AI cham thap thi KHONG dung lai", async () => {
  await remember();
  useScoreFromAi(30);

  const found = await findSimilarRepeat({
    countryCode: "AU",
    keywordTerms: ["mất hộ chiếu", "sydney", "trình báo", "bước"],
    question: "Mất hộ chiếu ở Sydney có bị phạt không",
  });

  assert.equal(found, null);
});
