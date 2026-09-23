import test from "node:test";
import assert from "node:assert/strict";

import { guardAnswer, FALLBACK_MESSAGE } from "../src/rag/guard.js";
import { createHallucinatingMockLlmProvider } from "../src/rag/llm/mock.llm.js";

/*
 * ★ Test bat buoc di kem guard.js (docs/03_Contracts_v2.md muc 8) -- neu
 * khong co test nay thi khong ai biet guardrail co thuc su chay hay khong.
 */

test("guard xoa marker khong nam trong tap da truy hoi", () => {
  const raw = { answer: "Đây là thông tin tham khảo [S9].", usedSources: ["S9"], confidence: "high" };
  const retrieved = new Map([["S1", { marker: "S1", text: "nội dung thật" }]]);

  const result = guardAnswer(raw, retrieved);

  assert.equal(result.fallbackReason, null); // khong co tuyen bo dinh luong -> chi xoa marker, khong ha cap
  assert.doesNotMatch(result.answer, /\[S9\]/);
  assert.ok(result.violations.includes("HALLUCINATED_MARKER:S9"));
});

test("guard chặn LLM bịa số tiền không nguồn -> hạ cấp fallback", async () => {
  const provider = createHallucinatingMockLlmProvider();
  const raw = JSON.parse(await provider.complete({}));
  const retrieved = new Map([["S1", { marker: "S1", text: "dữ liệu thật khác, không liên quan" }]]); // KHONG co S9

  const result = guardAnswer(raw, retrieved);

  assert.equal(result.fallbackReason, "GUARD_REJECTED");
  assert.equal(result.answer, FALLBACK_MESSAGE);
  assert.doesNotMatch(result.answer, /500\.000/);
  assert.ok(result.violations.includes("HALLUCINATED_MARKER:S9"));
  assert.ok(result.violations.includes("UNSOURCED_QUANTITATIVE_CLAIM"));
  assert.deepEqual(result.citations, []);
});

test("guard giữ nguyên câu trả lời có nguồn hợp lệ, luôn gắn disclaimer", () => {
  const raw = {
    answer: "Người lao động EPS được làm tối đa số giờ theo hợp đồng đã ký [S1].",
    usedSources: ["S1"],
    confidence: "high",
  };
  const retrieved = new Map([["S1", { marker: "S1", text: "..." }]]);

  const result = guardAnswer(raw, retrieved);

  assert.equal(result.fallbackReason, null);
  assert.match(result.answer, /\[S1\]/);
  assert.match(result.answer, /Thông tin dựa trên nguồn/);
  assert.equal(result.citations.length, 1);
});
