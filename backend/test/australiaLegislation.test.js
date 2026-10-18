import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb } from "./setup.js";
import { extractBlocks } from "../src/utils/legislationHtml.js";
import { createTtlCache } from "../src/utils/ttlCache.js";

/*
 * Chi test logic thuan cua luong luat Uc (khong goi mang): rut chu tu XHTML
 * va chan tham so xau o tang validate. Luong goi API that duoc kiem bang chay thuc te.
 */

test("extractBlocks rut chu, bo muc luc, giai ma entity va phan loai theo class", () => {
  const html = [
    '<p class="TOC5"><span>Muc luc</span></p>',
    '<p class="ActHead5"><span>&#xa0;</span><span>Section 1 &amp; 2</span></p>',
    '<p class="notetext"><span>Note:</span> <b>x</b></p>',
    '<p class="subsection"><span>(1)</span>&#xa0;&#xa0;<span>Noi dung</span></p>',
    '<p class="paragraph"><span>&#xa0;</span></p>',
  ].join("");

  assert.deepEqual(extractBlocks(html), [
    { kind: "heading", text: "Section 1 & 2", className: "ActHead5" },
    { kind: "note", text: "Note: x", className: "notetext" },
    { kind: "text", text: "(1) Noi dung", className: "subsection" },
  ]);
});

test("createTtlCache goi loader mot lan cho cung khoa va thu lai sau khi loi", async () => {
  const cache = createTtlCache({ ttlMs: 60_000, maxEntries: 2 });
  let calls = 0;
  const loader = async () => ++calls;

  assert.equal(await cache.getOrLoad("a", loader), 1);
  assert.equal(await cache.getOrLoad("a", loader), 1);

  await assert.rejects(cache.getOrLoad("b", () => Promise.reject(new Error("boom"))));
  assert.equal(await cache.getOrLoad("b", loader), 2);
});

let app;

before(async () => {
  await startTestDb();
  app = (await import("../src/app.js")).default;
});

after(stopTestDb);

test("GET /api/laws/australia chan tham so khong hop le truoc khi goi nguon", async () => {
  const badId = await request(app).get("/api/laws/australia/abc'%20or");
  assert.equal(badId.status, 400);
  assert.equal(badId.body.error.code, "VALIDATION_ERROR");

  const missingQuery = await request(app).get("/api/laws/australia/search");
  assert.equal(missingQuery.status, 400);

  const hugeLimit = await request(app).get("/api/laws/australia/C1958A00062/content?limit=9999");
  assert.equal(hugeLimit.status, 400);
});

test("moi muc luat Uc co ma hop le, khong trung trong muc va topicSlugsForTitle tra ve dung muc", async () => {
  const { AU_LAW_TOPICS, topicSlugsForTitle } = await import("../src/core/auLawTopics.js");

  assert.equal(AU_LAW_TOPICS.length, 5);
  for (const topic of AU_LAW_TOPICS) {
    assert.ok(topic.titleIds.length > 0, `${topic.slug} khong duoc rong`);
    assert.equal(new Set(topic.titleIds).size, topic.titleIds.length, `${topic.slug} co ma trung`);
    for (const titleId of topic.titleIds) assert.match(titleId, /^[A-Za-z0-9]{6,20}$/);
  }
  // Migration Act 1958 nam o hai muc: cu tru va xuat nhap canh.
  assert.deepEqual(topicSlugsForTitle("C1958A00062"), ["cu-tru", "xuat-nhap-canh"]);
  assert.deepEqual(topicSlugsForTitle("KHONGCO000"), []);
});

test("GET /api/laws/australia/topics tra ve 5 muc va topic sai bi chan", async () => {
  const topics = await request(app).get("/api/laws/australia/topics");
  assert.equal(topics.status, 200);
  assert.deepEqual(
    topics.body.data.map((topic) => topic.slug),
    ["giao-thong", "cu-tru", "xuat-nhap-canh", "hai-quan-hanh-ly", "quyen-loi-khieu-nai"],
  );

  const badTopic = await request(app).get("/api/laws/australia?topic=khong-co");
  assert.equal(badTopic.status, 400);
});

test("hasOnlyGroundedNumbers chap nhan so co trong nguon va chan so bia", async () => {
  const { hasOnlyGroundedNumbers } = await import("../src/services/australiaLawSummary.service.js");
  const source = "Migration Act 1958\nPart 4A Obligations";

  assert.equal(hasOnlyGroundedNumbers("Phan 4A cua luat 1958", source), true);
  assert.equal(hasOnlyGroundedNumbers("Phat tu 5 nam", source), false);
  assert.equal(hasOnlyGroundedNumbers("Khong co so nao", source), true);
});

test("segmentIntoParts, buildPartDigest va splitByDivisions xu ly cau truc Phan/Dieu/Muc con", async () => {
  const { segmentIntoParts, buildPartDigest, splitByDivisions } =
    await import("../src/utils/legislationSections.js");
  const block = (className, text, kind = className.startsWith("ActHead") ? "heading" : "text") => ({
    className,
    text,
    kind,
  });
  const blocks = [
    block("LongT", "An Act relating to X"),
    block("ActHead2", "Part 1 - Preliminary"),
    block("ActHead5", "1 Short title"),
    block("subsection", "This Act may be cited as the X Act 1958."),
    block("ActHead2", "Part 2 - Main"),
    block("ActHead3", "Division 1 - A"),
    block("ActHead5", "2 First"),
    block("subsection", "A person must do 7 things."),
    block("ActHead3", "Division 2 - B"),
    block("ActHead5", "3 Second"),
    block("ActHead2", "Part 2 - Main"), // lap o cho noi hai tep: khong tao Phan moi
  ];

  const segments = segmentIntoParts(blocks);
  assert.deepEqual(
    segments.map((segment) => segment.heading),
    ["Part 1 - Preliminary", "Part 2 - Main"],
  );

  const digest = buildPartDigest(blocks, segments[0]);
  assert.deepEqual([...digest.indices], [2]);
  assert.match(digest.text, /^\[#2\] 1 Short title :: This Act may be cited/);

  const pieces = splitByDivisions(blocks, segments[1]);
  assert.deepEqual(
    pieces.map((piece) => piece.heading),
    ["Part 2 - Main / Division 1 - A", "Part 2 - Main / Division 2 - B"],
  );
});

test("validatePartOutput chan chi so khong co trong ban trich va so lieu bia", async () => {
  const { validatePartOutput } = await import("../src/services/australiaLawDeepSummary.service.js");
  const context = {
    heading: "Part 2 - Main",
    digestLines: ["[#7] 2 First :: A person must do 7 things.", "[#9] 3 Second :: Nothing here"],
    indices: new Set([7, 9]),
  };
  const good = {
    summary: "Phan nay noi ve nghia vu.",
    keyPoints: [{ text: "Phai lam 7 viec", sources: [7] }],
  };
  assert.equal(validatePartOutput(good, context), true);

  const badSource = { ...good, keyPoints: [{ text: "Y khac", sources: [99] }] };
  assert.equal(validatePartOutput(badSource, context), false);

  // So 7 co trong Dieu #7 nhung KHONG co trong Dieu #9 duoc trich dan.
  const wrongCitation = { ...good, keyPoints: [{ text: "Phai lam 7 viec", sources: [9] }] };
  assert.equal(validatePartOutput(wrongCitation, context), false);

  const inventedNumber = { ...good, keyPoints: [{ text: "Phat 5 nam tu", sources: [7] }] };
  assert.equal(validatePartOutput(inventedNumber, context), false);
});

test("hasSameNumbers cho phep so thang va lap ten luat, chan so bia hoac bi bo", async () => {
  const { hasSameNumbers } = await import("../src/services/australiaLawTranslation.service.js");

  assert.equal(
    hasSameNumbers("Compilation date: 19 April 2021", "Ngay: 19 thang 4 nam 2021"),
    true,
  );
  assert.equal(hasSameNumbers("Act 1971", "Dao luat 1971 (Act 1971)"), true);
  assert.equal(hasSameNumbers("a fine of 5 penalty units", "phat 50 don vi"), false);
  assert.equal(hasSameNumbers("section 189(1) and 2021", "Dieu 189(1)"), false);
});

test("parseRetryAfterMs doc duoc gio/phut/giay va nhan ra han muc ngay", async () => {
  const { parseRetryAfterMs } = await import("../src/rag/llm/rateLimitRetry.js");

  assert.equal(parseRetryAfterMs("Please retry in 27.5s."), 29000);
  assert.equal(parseRetryAfterMs("retry in 2m3s"), 124000);
  assert.ok(parseRetryAfterMs("Please retry in 9h29m48.06s.") > 90_000);
  assert.equal(parseRetryAfterMs("khong co goi y"), null);
});

test("GET content-vi chan offset khong phai boi so 25 va luat ngoai danh sach tuyen chon", async () => {
  const badOffset = await request(app).get("/api/laws/australia/C1971A00003/content-vi?offset=10");
  assert.equal(badOffset.status, 400);
});
