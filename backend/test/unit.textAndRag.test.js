import test from "node:test";
import assert from "node:assert/strict";

import {
  containsPhrase,
  foldDStroke,
  normalizeVi,
  toDStrokeInsensitivePattern,
} from "../src/utils/textNormalize.js";
import { chunkArticle } from "../src/rag/chunking.js";
import { rrf } from "../src/rag/rrf.js";
import { parsePagination, buildPageMeta } from "../src/core/pagination.js";

/*
 * Test don vi cho cac ham thuan (khong DB/network): chuan hoa tieng Viet,
 * chunking, RRF, phan trang.
 */

// --- normalizeVi ---

test("normalizeVi bo dau, ha chu thuong, cat khoang trang", () => {
  assert.equal(normalizeVi("  Hàn Quốc  "), "han quoc");
  assert.equal(normalizeVi(null), "");
  assert.equal(normalizeVi(undefined), "");
  assert.equal(normalizeVi(123), "123");
});

test("foldDStroke gap đ thanh d de so khop 'dang ky' voi 'Đăng ký'", () => {
  assert.equal(foldDStroke(normalizeVi("Đăng ký")), "dang ky");
  assert.ok(foldDStroke(normalizeVi("Thủ tục đăng ký tạm trú")).includes("dang ky"));
});

test("containsPhrase so khop theo ranh gioi tu, khong theo chuoi con", () => {
  assert.equal(containsPhrase("Luật lao động ở Hàn Quốc?", "Lào"), false);
  assert.equal(containsPhrase("Đi Lào cần visa không?", "Lào"), true);
  assert.equal(containsPhrase("Còn ở Nhật Bản thì sao", "Nhật Bản"), true);
  assert.equal(containsPhrase("thực phẩm", "Úc"), false);
  assert.equal(containsPhrase("Du lịch Úc, cần gì?", "Úc"), true);
  assert.equal(containsPhrase("bất kỳ", ""), false);
  // Go khong dau ca cau: van nhan ra ten nuoc.
  assert.equal(containsPhrase("con o nhat ban thi sao", "Nhật Bản"), true);
  assert.equal(containsPhrase("NHẬT BẢN có gì", "Nhật Bản"), true);
});

test("toDStrokeInsensitivePattern khop ca 'd' lan 'đ' trong gia tri *Norm da luu", () => {
  const regex = new RegExp(toDStrokeInsensitivePattern("dang"), "i");
  assert.ok(regex.test("thu tuc đang ky"));
  assert.ok(regex.test("thu tuc dang ky"));
  assert.ok(new RegExp(toDStrokeInsensitivePattern("đang"), "i").test("dang ky"));
});

// --- chunkArticle ---

const baseArticle = {
  countryCode: "KR",
  topicSlug: "giao-thong",
  title: "Bài test",
  effectiveFrom: new Date("2025-01-01T00:00:00Z"),
};

test("chunkArticle cat theo heading va gop section ngan", () => {
  const long = "Câu dài đủ ký tự. ".repeat(15);
  const chunks = chunkArticle({
    ...baseArticle,
    bodyMd: `## Mot\n${long}\n## Hai\n${long}`,
  });
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].heading, "Mot");
  assert.equal(chunks[1].heading, "Hai");
  assert.deepEqual(
    chunks.map((c) => c.order),
    [0, 1],
  );
  assert.ok(chunks.every((c) => c.kind === "body"));
});

test("chunkArticle cat section dai >1200 ky tu va khong chunk nao vuot qua nhieu", () => {
  const sentence = "Người nước ngoài phải mang theo hộ chiếu khi ra đường. ";
  const chunks = chunkArticle({ ...baseArticle, bodyMd: `## Dai\n${sentence.repeat(60)}` });
  assert.ok(chunks.length > 1);
  for (const c of chunks) assert.ok(c.text.length <= 1200 + sentence.length);
});

test("chunkArticle dung summaryVi khi khong co bodyMd, them chunk penalty rieng", () => {
  const chunks = chunkArticle({
    ...baseArticle,
    summaryVi: "Tóm tắt ngắn.",
    penalties: [
      { behavior: "Vượt đèn đỏ", amountText: "70.000 KRW" },
      { behavior: "Say rượu", amountText: "1 triệu KRW", note: "tùy mức" },
    ],
  });
  assert.equal(chunks.length, 3);
  assert.equal(chunks[1].kind, "penalty");
  assert.match(chunks[1].text, /Vượt đèn đỏ.*70\.000 KRW/);
  assert.match(chunks[2].text, /\(tùy mức\)$/);
});

test("chunkArticle prepend dong ngu canh chi vao textForEmbedding", () => {
  const [chunk] = chunkArticle(
    { ...baseArticle, summaryVi: "Nội dung." },
    { countryName: "Hàn Quốc", topicName: "Giao thông" },
  );
  assert.equal(chunk.text, "Nội dung.");
  assert.match(chunk.textForEmbedding, /^\[Quốc gia: Hàn Quốc\] \[Chủ đề: Giao thông\]/);
  assert.match(chunk.textForEmbedding, /Hiệu lực từ: 2025-01-01/);
  assert.equal(chunk.textNorm, "noi dung.");
});

test("chunkArticle bai rong khong sinh chunk", () => {
  assert.deepEqual(chunkArticle({ ...baseArticle, bodyMd: "", summaryVi: "" }), []);
});

// --- rrf ---

test("rrf cong diem chunk xuat hien o nhieu danh sach va sap xep giam dan", () => {
  const a = { _id: "a" };
  const b = { _id: "b" };
  const c = { _id: "c" };
  const fused = rrf([
    { items: [a, b], weight: 1 },
    { items: [b, c], weight: 1 },
  ]);
  assert.deepEqual(
    fused.map((x) => x._id),
    ["b", "a", "c"],
  );
  assert.ok(Math.abs(fused[0].fusedScore - (1 / 62 + 1 / 61)) < 1e-12);
});

test("rrf danh sach rong tra mang rong", () => {
  assert.deepEqual(rrf([]), []);
});

// --- pagination ---

test("parsePagination mac dinh, kep gioi han va tinh skip", () => {
  assert.deepEqual(parsePagination(), { page: 1, limit: 20, skip: 0 });
  assert.deepEqual(parsePagination({ page: "3", limit: "10" }), { page: 3, limit: 10, skip: 20 });
  assert.deepEqual(parsePagination({ page: "-5", limit: "999" }), {
    page: 1,
    limit: 100,
    skip: 0,
  });
  assert.deepEqual(parsePagination({ page: "abc", limit: "0" }), { page: 1, limit: 20, skip: 0 });
  assert.deepEqual(parsePagination({ limit: "-3" }), { page: 1, limit: 1, skip: 0 });
  assert.deepEqual(buildPageMeta({ page: 2, limit: 5 }, 11), { page: 2, limit: 5, total: 11 });
});
