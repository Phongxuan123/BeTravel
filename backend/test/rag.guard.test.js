import test from "node:test";
import assert from "node:assert/strict";

import { guardAnswer, FALLBACK_MESSAGE } from "../src/rag/guard.js";
import { createHallucinatingMockLlmProvider } from "../src/rag/llm/mock.llm.js";

/*
 * [!] Test bat buoc di kem guard.js (docs/03_Contracts_v2.md muc 8) -- neu
 * khong co test nay thi khong ai biet guardrail co thuc su chay hay khong.
 */

test("guard xoa marker khong nam trong tap da truy hoi", () => {
  const raw = {
    answer: "Đây là thông tin tham khảo [S9].",
    usedSources: ["S9"],
    confidence: "high",
  };
  const retrieved = new Map([["S1", { marker: "S1", text: "nội dung thật" }]]);

  const result = guardAnswer(raw, retrieved);

  assert.equal(result.fallbackReason, "GUARD_REJECTED"); // mọi câu trả lời phải có citation hợp lệ
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

test("marker hợp lệ không bảo chứng con số bịa", () => {
  const result = guardAnswer(
    { answer: "Phạt 500.000 KRW [S1].", usedSources: ["S1"] },
    new Map([["S1", { text: "Nguồn chỉ nêu 100.000 KRW" }]]),
  );
  assert.equal(result.fallbackReason, "GUARD_REJECTED");
});

test("marker ở câu trước không bảo chứng mức phạt phía sau", () => {
  const result = guardAnswer(
    { answer: "Thông tin chung [S1]. Phạt 500.000 KRW.", usedSources: ["S1"] },
    new Map([["S1", { text: "Thông tin chung" }]]),
  );
  assert.equal(result.fallbackReason, "GUARD_REJECTED");
});

// BUG-20: model tự đánh số trong từng ý; guard bỏ tiền tố để client không hiện "1 1." hay nhảy số.
test("guard bo tien to so thu tu va gach dau dong trong tung y", () => {
  const raw = {
    answer: "Cần hộ chiếu khi nhập cảnh [S1].",
    usedSources: ["S1"],
    confidence: "high",
    actions: [
      "1. Mang theo hộ chiếu còn hạn [S1].",
      "3) Khai báo hải quan [S1].",
      "- Giữ vé khứ hồi [S1].",
    ],
    avoid: ["* Không mang thực phẩm tươi [S1]."],
  };
  const retrieved = new Map([
    ["S1", { marker: "S1", text: "Cần hộ chiếu, khai báo hải quan, vé khứ hồi, thực phẩm tươi" }],
  ]);

  const { sections } = guardAnswer(raw, retrieved);

  for (const item of [...sections.actions, ...sections.avoid])
    assert.doesNotMatch(item, /^\s*(\d+[.)]|[-*•])\s/);
  assert.equal(sections.actions.length, 3);
});
