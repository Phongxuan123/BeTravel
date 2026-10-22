import { test } from "node:test";
import assert from "node:assert/strict";

import "./setup.js";
import { buildNoEvidenceAnswer, findCoverageGap } from "../src/rag/noEvidence.js";
import { FALLBACK_MESSAGE } from "../src/rag/guard.js";

const AU = { countryCode: "AU", countryName: "Úc" };

test("từ chối: câu giao thông ở Úc nêu lý do (luật bang) và link trang chính thức", () => {
  const answer = buildNoEvidenceAnswer({
    ...AU,
    question: "khi lái xe thì nên đi bên trái hay bên phải, nếu đi sai làn thì bị phạt như thế nào",
  });
  assert.match(answer, /Quy tắc giao thông đường bộ/);
  assert.match(answer, /từng bang/);
  assert.match(answer, /https:\/\/www\.nsw\.gov\.au\//);
  // Lời do code soạn không được kèm mức phạt hay con số.
  assert.doesNotMatch(answer, /\d+\s*(AUD|\$|đô|điểm)/i);
});

test("từ chối: câu gõ không dấu vẫn nhận ra chủ đề", () => {
  assert.equal(
    findCoverageGap("thue nha o Sydney can hop dong thue khong", "AU")?.slug,
    "thue-nha",
  );
});

test("từ chối: câu hải quan có nhắc xe không bị coi là câu giao thông", () => {
  assert.equal(findCoverageGap("Mang ô tô cá nhân vào Úc có phải đóng thuế không?", "AU"), null);
});

test("từ chối: thú cưng không trả lời trước khi tìm (kho có luật kiểm dịch), thiếu bằng chứng thì chỉ trang tra cứu", () => {
  const question = "Mang mèo sang Úc được không?";
  assert.equal(findCoverageGap(question, "AU", { beforeSearch: true }), null);
  assert.match(buildNoEvidenceAnswer({ ...AU, question }), /abf\.gov\.au/);
});

test("từ chối: chủ đề khác vẫn giữ lời từ chối chuẩn và liệt kê chủ đề AI trả lời được", () => {
  const answer = buildNoEvidenceAnswer({
    ...AU,
    question: "Đánh bạc ở casino Úc có hợp pháp không?",
  });
  assert.ok(answer.startsWith(FALLBACK_MESSAGE));
  assert.match(answer, /Hải quan hành lý/);
});

test("từ chối: quốc gia chưa khai báo chủ đề thì chỉ có lời từ chối chuẩn", () => {
  const answer = buildNoEvidenceAnswer({
    question: "Lái xe ở Seoul",
    countryCode: "KR",
    countryName: "Hàn Quốc",
  });
  assert.equal(answer, FALLBACK_MESSAGE);
});
