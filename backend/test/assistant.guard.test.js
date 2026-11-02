import { test } from "node:test";
import assert from "node:assert/strict";

import { guardAnswer, VERIFY_NOTE } from "../src/rag/assistant/guard.js";

// Hau kiem bang code cua tro ly ban 2 (CLAUDE.md Phan 4.2 buoc 5) -- phan loi, giu test.

test("guard: xoa marker khong thuoc tap nguon va danh so lai lien tuc", () => {
  const result = guardAnswer({
    answer: "Phải khai báo [3]. Có thể bị kiểm tra [9].\n- Giữ biên nhận [3].",
    allowedNumbers: new Set([1, 3]),
  });
  assert.equal(result.text, "Phải khai báo [1]. Có thể bị kiểm tra.\n- Giữ biên nhận [1].");
  assert.deepEqual(result.usedOriginalNumbers, [3]);
  assert.equal(result.violations.filter((v) => v.type === "unknown_marker").length, 1);
});

test("guard: cau co con so khong nguon bi bo, them dong nhac kiem tra nguon", () => {
  const result = guardAnswer({
    answer: "Có, phải khai báo. Mức phạt là 7.280 AUD.\n- Ngưỡng 10.000 AUD [1].",
    allowedNumbers: new Set([1]),
  });
  assert.ok(!result.text.includes("7.280"));
  assert.ok(result.text.includes("10.000 AUD [1]"));
  assert.ok(result.text.endsWith(VERIFY_NOTE.vi));
});

test("guard: so dien thoai va so khan cap khong bi coi la con so can nguon", () => {
  const answer = "**Gọi 000 ngay.**\n- Gọi đường dây 131 444 nếu không khẩn cấp.";
  const result = guardAnswer({ answer, allowedNumbers: new Set() });
  assert.equal(result.text, answer);
  assert.equal(result.violations.length, 0);
});

test("guard: marker khong hop le khong duoc 'bao lanh' cho con so", () => {
  const result = guardAnswer({
    answer: "Bị phạt 500 AUD [7].",
    allowedNumbers: new Set([1]),
    language: "en",
  });
  assert.ok(!result.text.includes("500"));
  assert.ok(result.text.includes(VERIFY_NOTE.en));
});
