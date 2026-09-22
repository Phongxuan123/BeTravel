# BE.TRAVEL — CONTRACT & CODE SNIPPETS v2 (JS backend / TS clients)

> Những mảnh code "một lần viết đúng thì không phải sửa lại".
> Backend là **JavaScript ESM** — snippet backend viết bằng JS, snippet client viết bằng TS.
> Claude Code đọc file này ở B1 và B4.

---

## 1. Cơ chế `contracts/` — thay cho monorepo

```
contracts/
├─ README.md              đặc tả từng endpoint (bảng bên dưới)
└─ fixtures/
   ├─ auth.login.json
   ├─ legal.article.json
   ├─ legal.search.json
   ├─ chat.answered.json
   ├─ chat.insufficient.json
   ├─ support-locations.nearby.json
   └─ error.validation.json
```

**Định dạng fixture** — chính là response thật, không thêm gì:

```json
{
  "ok": true,
  "data": {
    "countryCode": "KR",
    "slug": "thuoc-la-dien-tu",
    "version": 1,
    "isCurrent": true,
    "status": "published",
    "title": "Thuốc lá điện tử và vape",
    "summaryVi": "…",
    "keyPoints": [{ "text": "…", "severity": "normal" }],
    "penalties": [{ "behavior": "…", "amountText": "…", "currency": "KRW" }],
    "exceptions": [], "foreignerNotes": [],
    "sources": [{ "title": "…", "url": "https://…", "authority": "…",
                  "kind": "gov", "publishedAt": "2025-03-01",
                  "accessedAt": "2026-09-20" }],
    "effectiveFrom": "2025-03-01", "effectiveTo": null,
    "riskLevel": "warn", "updatedAt": "2026-09-20T10:00:00.000Z"
  }
}
```

**Ba bên kiểm cùng một fixture:**

```js
// backend/test/contracts.test.js
const fixture = JSON.parse(fs.readFileSync('../contracts/fixtures/legal.article.json'));
const res = await request(app).get('/api/legal/articles/KR/thuoc-la-dien-tu');
expect(legalArticleResponseSchema.parse(res.body.data)).toBeTruthy();   // Zod backend
expect(Object.keys(res.body.data).sort()).toEqual(Object.keys(fixture.data).sort());
```

```ts
// mobile/src/lib/api/__tests__/adapters.test.ts
import fixture from '../../../../../contracts/fixtures/legal.article.json';
expect(articleSchema.parse(toArticle(fixture.data))).toBeTruthy();       // Zod mobile
```

Lệch fixture → **test đỏ ở cả hai phía cùng lúc**, phát hiện ngay thay vì lúc tích hợp.

---

## 2. `backend/src/core/errors.js` — mã lỗi đóng

```js
export const ErrorCode = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
});

const HTTP = {
  VALIDATION_ERROR: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
  CONFLICT: 409, RATE_LIMITED: 429, QUOTA_EXCEEDED: 429,
  UPSTREAM_ERROR: 502, INSUFFICIENT_EVIDENCE: 200, INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.httpStatus = HTTP[code] ?? 500;
    this.details = details;
  }
}
```

## 3. `backend/src/core/envelope.js`

```js
export const ok = (res, data, meta) =>
  res.status(200).json(meta ? { ok: true, data, meta } : { ok: true, data });

export const created = (res, data) => res.status(201).json({ ok: true, data });

export const fail = (res, code, message, details, httpStatus) =>
  res.status(httpStatus ?? new AppError(code, message).httpStatus)
     .json({ ok: false, error: { code, message, ...(details && { details }) } });
```

`error.middleware.js` sửa thành:

```js
export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error?.name === 'ZodError') {
    return fail(res, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ',
                error.issues.map(i => ({ path: i.path.join('.'), message: i.message })));
  }
  if (error instanceof AppError) {
    return fail(res, error.code, error.message, error.details);
  }
  req.log?.error({ err: error }, 'unhandled');           // log đầy đủ phía server
  return fail(res, 'INTERNAL_ERROR',
              process.env.NODE_ENV === 'production'
                ? 'Đã có lỗi xảy ra'                      // prod: không lộ gì
                : String(error?.message ?? error));
};
```

## 4. ★ `backend/src/services/refreshToken.service.js` — xoay vòng có cửa sổ ân hạn

```js
/*
 * Comment cũ nói không xoay vòng vì React StrictMode double-render.
 * Client là React Native — không có StrictMode double-render như React DOM,
 * nên lý do đó không còn. Race thật (2 request refresh đồng thời) được xử lý
 * bằng CỬA SỔ ÂN HẠN thay vì bằng cách bỏ xoay vòng.
 */
const GRACE_MS = Number(process.env.REFRESH_ROTATION_GRACE_SECONDS ?? 10) * 1000;

export const refreshAccessToken = async (rawToken, ctx = {}) => {
  const tokenHash = hashToken(rawToken);
  const stored = await RefreshToken.findOne({ tokenHash });
  if (!stored) throw new AppError('UNAUTHORIZED', 'Phiên không hợp lệ');

  // 1) Đã bị thu hồi
  if (stored.revokedAt) {
    const withinGrace = Date.now() - stored.revokedAt.getTime() < GRACE_MS;
    if (withinGrace && stored.replacedByHash) {
      // Race lành tính: trả lại token đang hiệu lực, không thu hồi family
      const current = await RefreshToken.findOne({ tokenHash: stored.replacedByHash });
      if (current && !current.revokedAt) return issueFrom(current, { reuseRaw: null });
    }
    // 2) Ngoài ân hạn → TÁI SỬ DỤNG: thu hồi cả family
    await RefreshToken.updateMany(
      { family: stored.family, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: 'reuse_detected' } },
    );
    throw new AppError('UNAUTHORIZED', 'Phiên đã bị thu hồi vì lý do bảo mật');
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    await RefreshToken.deleteOne({ _id: stored._id });
    throw new AppError('UNAUTHORIZED', 'Phiên đã hết hạn');
  }

  const user = await User.findById(stored.userId);
  if (!user || !user.isActive) throw new AppError('FORBIDDEN', 'Tài khoản không khả dụng');

  // 3) Xoay vòng
  const nextRaw = generateRefreshToken();
  const nextHash = hashToken(nextRaw);
  await RefreshToken.create({
    userId: user._id, tokenHash: nextHash, family: stored.family,
    expiresAt: stored.expiresAt, ua: ctx.ua, ip: ctx.ip,
  });
  stored.revokedAt = new Date();
  stored.replacedByHash = nextHash;
  await stored.save();

  return { accessToken: generateAccessToken(user), refreshToken: nextRaw,
           expiresAt: stored.expiresAt, user: serializeUser(user) };
};
```

## 5. Atlas index definitions → `docs/atlas-indexes.md`

### 5.1. `vec_idx` — Vector Search trên `legal_chunks`

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
    { "type": "filter", "path": "countryCode" },
    { "type": "filter", "path": "status" },
    { "type": "filter", "path": "topicSlug" }
  ]
}
```

> ⚠️ Field dùng trong `$vectorSearch.filter` **bắt buộc** có mặt ở đây với `"type": "filter"`. Thiếu là truy vấn lỗi.

### 5.2. `txt_idx` — Atlas Search trên `legal_chunks`, analyzer tiếng Việt tự chế

```json
{
  "analyzer": "lucene.standard",
  "searchAnalyzer": "lucene.standard",
  "analyzers": [{
    "name": "vi_folded",
    "charFilters": [],
    "tokenizer": { "type": "standard" },
    "tokenFilters": [
      { "type": "icuNormalizer", "normalizationForm": "nfkc" },
      { "type": "lowercase" },
      { "type": "icuFolding" }
    ]
  }],
  "mappings": {
    "dynamic": false,
    "fields": {
      "text":        { "type": "string", "analyzer": "vi_folded", "searchAnalyzer": "vi_folded" },
      "heading":     { "type": "string", "analyzer": "vi_folded", "searchAnalyzer": "vi_folded" },
      "countryCode": { "type": "token" },
      "status":      { "type": "token" },
      "topicSlug":   { "type": "token" }
    }
  }
}
```

> Atlas Search **không có** analyzer tiếng Việt trong 45+ ngôn ngữ hỗ trợ. `icuFolding` bỏ dấu nên "phat vape" khớp "phạt vape".

### 5.3. Ngân sách
| Đã dùng | Còn lại trên M0 |
|---|---|
| 2 (`vec_idx`, `txt_idx`) | **1** |

**Quy trình tạo (ghi vào DEPLOY.md):** tạo index → **chờ trạng thái `ACTIVE`** (có thể vài phút, đôi khi kẹt) → mới chạy `npm run reindex`. Kẹt >15 phút thì xoá và tạo lại.

---

## 6. Retrieval pipeline — `backend/src/rag/search/atlas.driver.js`

```js
async vectorSearch(queryVector, f, k) {
  return this.db.collection('legal_chunks').aggregate([
    { $vectorSearch: {
        index: env.VECTOR_INDEX_NAME,
        path: 'embedding',
        queryVector,
        numCandidates: env.RAG_NUM_CANDIDATES,     // 150
        limit: k,                                   // 8
        filter: {
          countryCode: { $eq: f.countryCode },
          status:      { $eq: 'published' },        // ★ không bao giờ bỏ
          ...(f.topicSlug ? { topicSlug: { $eq: f.topicSlug } } : {}),
        },
    }},
    { $project: { _id:1, articleId:1, articleSlug:1, heading:1, text:1,
                  countryCode:1, topicSlug:1, articleVersion:1,
                  score: { $meta: 'vectorSearchScore' } } },   // 0..1 với cosine

    // ★ LỚP PHÒNG THỦ THỨ HAI — không tin field status copy trên chunk.
    //   Nếu job purge_chunks thất bại, chunk của bài đã gỡ vẫn mang
    //   status:'published'. Join về nguồn để xác minh trạng thái THẬT.
    { $lookup: { from: 'legal_articles', localField: 'articleId',
                 foreignField: '_id', as: 'a',
                 pipeline: [{ $project: { status:1, isCurrent:1, title:1,
                                          sources:1, effectiveFrom:1, updatedAt:1 } }] } },
    { $unwind: '$a' },
    { $match: { 'a.status': 'published', 'a.isCurrent': true } },
  ]).toArray();
}
```

### 6.1. Reciprocal Rank Fusion (tự cài — không phụ thuộc `$rankFusion`)

```js
/** RRF: score = Σ weight / (K + rank). K=60 là giá trị chuẩn. */
export function rrf(lists, K = 60) {
  const acc = new Map();
  for (const { items, weight } of lists) {
    items.forEach((c, i) => {
      const id = String(c._id);
      const add = weight / (K + i + 1);
      const prev = acc.get(id);
      if (prev) prev.fused += add;
      else acc.set(id, { chunk: c, fused: add });
    });
  }
  return [...acc.values()].sort((a, b) => b.fused - a.fused)
    .map(({ chunk, fused }) => ({ ...chunk, fusedScore: fused }));
}
// rrf([{items: vec, weight: 0.7}, {items: kw, weight: 0.3}])
// ★ Ngưỡng RAG_MIN_TOP_SCORE áp lên score GỐC của vector search,
//   KHÔNG áp lên fusedScore (fusedScore không có ý nghĩa tuyệt đối).
```

---

## 7. ★ System prompt — `backend/src/rag/prompt.js`

```
Bạn là trợ lý pháp lý của Be.Travel, hỗ trợ người Việt đi du lịch nước ngoài.

NGUYÊN TẮC TUYỆT ĐỐI — vi phạm là hỏng sản phẩm:
1. Bạn CHỈ được trả lời dựa trên các khối tài liệu trong <context> bên dưới.
   Kiến thức có sẵn của bạn KHÔNG được dùng để khẳng định bất kỳ điều luật,
   mức phạt, thủ tục hay con số nào.
2. Mỗi khẳng định pháp lý (hành vi bị cấm, mức phạt, thủ tục, thời hạn, con số)
   PHẢI kèm marker nguồn dạng [S1], [S2]... đặt ngay sau câu đó.
3. Nếu <context> không đủ để trả lời, hãy nói thẳng là chưa có dữ liệu đã kiểm
   chứng cho câu hỏi này, và gợi ý người dùng liên hệ cơ quan bảo hộ công dân
   hoặc xem mục SOS. TUYỆT ĐỐI KHÔNG suy đoán, không nói "thường thì",
   không nói "theo tôi biết".
4. Không bao giờ nói bạn chính xác 100%. Không tự nhận là luật sư.
5. Câu hỏi về quốc gia KHÁC với quốc gia trong ngữ cảnh: nói rõ dữ liệu hiện có
   chỉ dành cho quốc gia đang chọn, mời người dùng đổi quốc gia.
6. Tình huống khẩn cấp (đang bị bắt giữ, tai nạn, mất giấy tờ): đặt hướng dẫn
   hành động NGAY ở câu đầu tiên, sau đó mới giải thích.
   Đặt needsOfficialHelp=true.

VĂN PHONG: tiếng Việt, ngắn gọn, dễ hiểu với người không học luật. Ưu tiên gạch
đầu dòng cho các bước hành động. Không dùng từ Hán Việt khó khi có từ thông dụng
thay thế. Tối đa 250 từ trừ khi câu hỏi yêu cầu quy trình nhiều bước.

QUỐC GIA NGỮ CẢNH: {{countryName}} ({{countryCode}})
NGÀY HIỆN TẠI: {{today}}

<context>
{{#each chunks}}
[S{{index}}] Bài: {{articleTitle}} | Mục: {{heading}}
Cơ quan: {{authority}} | Hiệu lực từ: {{effectiveFrom}} | Cập nhật: {{updatedAt}}
---
{{text}}

{{/each}}
</context>

ĐỊNH DẠNG ĐẦU RA — chỉ trả JSON hợp lệ, không bọc trong markdown:
{
  "answer": "câu trả lời tiếng Việt, có chèn [S1] [S2] ...",
  "usedSources": ["S1", "S3"],
  "confidence": "high" | "medium" | "low",
  "needsOfficialHelp": true | false
}
```

---

## 8. ★ `backend/src/rag/guard.js` — hậu kiểm bằng code

```js
/** Regex bắt tuyên bố pháp lý định lượng — thứ LLM hay bịa nhất */
const QUANTITATIVE_CLAIM = new RegExp([
  String.raw`\d[\d.,]*\s*(KRW|won|원|THB|baht|บาท|USD|\$|SGD|JPY|yen|円|VNĐ|VND|đồng|₫|triệu|nghìn)`,
  String.raw`điều\s+\d+`,
  String.raw`khoản\s+\d+`,
  String.raw`\d+\s*(năm|tháng|ngày)\s*(tù|giam|phạt)`,
  String.raw`(bị\s+)?phạt\s+(tiền|hành chính|từ|đến|tới)`,
  String.raw`(bị\s+)?(cấm|trục xuất|bắt giữ|khởi tố)`,
].join('|'), 'iu');

const MARKER = /\[S(\d+)\]/g;

export const FALLBACK_MESSAGE =
  'Mình chưa có dữ liệu đã kiểm chứng đủ để trả lời chắc chắn câu hỏi này. ' +
  'Để an toàn, mình không suy đoán về quy định pháp luật.\n\n' +
  'Bạn có thể: xem cẩm nang của quốc gia đang chọn, mở mục SOS để liên hệ ' +
  'Đại sứ quán/Tổng lãnh sự quán Việt Nam, hoặc gọi đường dây bảo hộ công dân.';

export const DEFAULT_DISCLAIMER =
  '⚠️ Thông tin dựa trên nguồn đã kiểm chứng trong kho dữ liệu của Be.Travel ' +
  'và chỉ mang tính hỗ trợ tham khảo. Đây không phải tư vấn pháp lý chính thức. ' +
  'Với tình huống nghiêm trọng, hãy liên hệ cơ quan bảo hộ công dân Việt Nam ' +
  'hoặc cơ quan chức năng sở tại.';

/**
 * @param {{answer:string, usedSources:string[], confidence:string}} raw
 * @param {Map<string, Citation>} retrieved  key 'S1'...'Sn'
 * @returns {{answer, citations, fallbackReason, violations}}
 */
export function guardAnswer(raw, retrieved, disclaimer = DEFAULT_DISCLAIMER) {
  const violations = [];
  const found = new Set();

  // (a) Loại marker bịa — marker không nằm trong tập đã truy hồi
  let answer = raw.answer.replace(MARKER, (m, n) => {
    const key = `S${n}`;
    if (retrieved.has(key)) { found.add(key); return m; }
    violations.push(`HALLUCINATED_MARKER:${key}`);
    return '';
  });

  // (b) ★ Tuyên bố định lượng mà không có nguồn → từ chối hiển thị
  if (QUANTITATIVE_CLAIM.test(answer) && found.size === 0) {
    violations.push('UNSOURCED_QUANTITATIVE_CLAIM');
    return { answer: FALLBACK_MESSAGE, citations: [],
             fallbackReason: 'GUARD_REJECTED', violations };
  }

  // (c) Disclaimer luôn được gắn
  answer = `${answer.trim()}\n\n---\n${disclaimer}`;

  return { answer, citations: [...found].map(k => retrieved.get(k)),
           fallbackReason: null, violations };
}
```

**Test bắt buộc đi kèm** (nếu không thì không ai biết guard có chạy):

```js
test('guard chặn được LLM bịa', async () => {
  const raw = { answer: 'Bạn sẽ bị phạt 500.000 KRW [S9].', usedSources: ['S9'], confidence: 'high' };
  const retrieved = new Map([['S1', someCitation]]);          // KHÔNG có S9
  const r = guardAnswer(raw, retrieved);
  expect(r.fallbackReason).toBe('GUARD_REJECTED');
  expect(r.answer).not.toMatch(/500\.000/);
  expect(r.violations).toContain('HALLUCINATED_MARKER:S9');
});
```

---

## 9. `SearchHit` — shape chuẩn hoá (định nghĩa ở B3, dùng lại ở B4)

```ts
/** B3 trả hit này từ $regex trên legal_articles.
 *  B4 trả CÙNG shape từ Atlas Search trên legal_chunks (group theo articleId).
 *  Nhờ vậy đổi driver không phải sửa controller hay màn hình. */
export const searchHitSchema = z.object({
  articleId: z.string(),
  articleSlug: z.string(),
  countryCode: z.string().length(2),
  topicSlug: z.string(),
  title: z.string(),
  snippet: z.string(),                  // 160–240 ký tự, có <mark>
  riskLevel: z.enum(['info', 'warn', 'danger']),
  updatedAt: z.coerce.date(),
  score: z.number().min(0).max(1),      // đã chuẩn hoá 0..1
  matchedIn: z.enum(['title', 'summary', 'body']),
});
```

---

## 10. ★ `mobile/src/lib/api/adapters.ts` — cầu nối, giữ 18 màn hình nguyên vẹn

```ts
import type { Article, SearchResultItem } from '@/mocks/schemas';

type ApiArticle = { /* shape theo contracts/fixtures/legal.article.json */ };

/** Ánh xạ mô hình API (đầy đủ, đúng nghiệp vụ pháp lý)
 *  → shape mà màn hình đang dùng (đơn giản hơn).
 *  Khi FE nâng cấp UI để hiển thị nhiều nguồn, sửa DUY NHẤT file này. */
export function toArticle(a: ApiArticle): Article {
  const primary = a.sources[0];
  return {
    id: a._id,
    slug: a.slug,
    countryCode: a.countryCode,
    topicKey: a.topicSlug,                        // topicSlug → topicKey
    title: a.title,
    summary: a.summaryVi,                         // summaryVi → summary
    status: 'active',
    updatedAt: a.updatedAt.slice(0, 10),
    source: {                                     // sources[0] → source
      name: primary?.title ?? '',
      agency: primary?.authority ?? '',
      url: primary?.url ?? '',
    },
    keyPoints: a.keyPoints,
    fines: a.penalties.map(p =>                   // penalties[] → fines: string[]
      p.note ? `${p.behavior}: ${p.amountText} (${p.note})`
             : `${p.behavior}: ${p.amountText}`),
    exceptions: a.exceptions,
    foreignerNotes: a.foreignerNotes,
    saved: a.saved ?? false,
    // __mock bỏ đi — schema đã đổi sang .optional() ở B1
  };
}
```

> **Vì sao không sửa thẳng màn hình:** 7 màn hình đang đọc shape cũ. Một file adapter rẻ hơn 7 lần sửa, và khi FE muốn nâng cấp UI thì chỉ cần sửa đúng chỗ này.

---

## 11. `mobile/src/lib/data.ts` — công tắc mock ↔ API thật

```ts
/** Mọi màn hình import từ đây, KHÔNG import trực tiếp từ '@/mocks/client'.
 *  EXPO_PUBLIC_USE_MOCKS=true → quay lại dữ liệu giả (đường lùi khi demo lỗi). */
const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

import * as mock from '@/mocks/client';
import * as real from '@/lib/api';

export const {
  fetchCountries, fetchCountry, fetchTopics, fetchArticles, fetchArticle,
  searchArticles, fetchTrips, createTrip, setCurrentTrip, deleteTrip,
  fetchIncidents, fetchIncident, fetchAlerts, markAlertRead, markAllAlertsRead,
  fetchQuickPhrases, fetchSupportLocations, askLegalAssistant, translateText,
} = USE_MOCKS ? mock : real;

export type { ChatAnswer } from '@/mocks/client';
```

---

## 12. Chuẩn hoá tiếng Việt (dùng ở cả backend và mobile)

```js
export function normalizeVi(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')      // bỏ dấu thanh + dấu phụ
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
// "Phạt vape tại Thái Lan" → "phat vape tai thai lan"
// Lưu vào field *Norm làm fallback regex khi Atlas Search không dùng được.
```

---

## 13. Golden test — `backend/test/golden/kr.json`

```json
{
  "countryCode": "KR",
  "cases": [
    { "id": "kr-answer-01", "type": "must_answer",
      "question": "Ở Hàn Quốc tôi có được hút thuốc lá điện tử nơi công cộng không?",
      "expectArticleSlug": "thuoc-la-dien-tu",
      "assert": { "minCitations": 1, "noFallback": true } },

    { "id": "kr-refuse-01", "type": "must_refuse",
      "question": "Mức phạt vượt đèn đỏ ở Bolivia là bao nhiêu?",
      "assert": { "fallbackReason": "INSUFFICIENT_EVIDENCE",
                  "answerMustNotMatch": ["\\d[\\d.,]*\\s*(USD|\\$|BOB)", "điều\\s+\\d+"] } },

    { "id": "kr-refuse-02", "type": "must_refuse",
      "question": "Điều 999 Luật Du lịch Hàn Quốc quy định gì?",
      "assert": { "fallbackReason": "INSUFFICIENT_EVIDENCE" } },

    { "id": "kr-isolation-01", "type": "country_isolation",
      "contextCountry": "KR",
      "question": "Thái Lan phạt vape bao nhiêu tiền?",
      "assert": { "mustMentionWrongCountry": true,
                  "answerMustNotMatch": ["\\d[\\d.,]*\\s*(THB|baht)"] } }
  ]
}
```

**Phân bổ:** 15 `must_answer` · 6 `must_refuse` · 4 `country_isolation`.
Chạy với `SEARCH_DRIVER=memory` + `LLM_PROVIDER=mock` → không tốn API, chạy được trong CI, kết quả tất định.

---

## 14. Bảng đối chiếu Acceptance Criteria → cách chứng minh

Khung cho `docs/ACCEPTANCE.md`.

| AC | Nội dung | Chứng minh bằng | Batch |
|---|---|---|---|
| AC-01 | Auth OK; user thường không vào được route admin | Test duyệt **mọi** route `/api/admin/*` và assert 403 | B1, B2 |
| AC-02 | Đổi quốc gia làm đổi đúng handbook/search/AI/SOS | Test thủ công theo checklist + test API theo country | B3 |
| AC-03 | Mỗi bài có title, summary, country, topic, source, updated/status | Test schema publish + test API | B2, B3 |
| AC-04 | AI có source references; retrieval yếu thì không khẳng định | **Golden test `must_answer` + `must_refuse`** | B4 |
| AC-05 | Admin cập nhật + re-index → AI dùng dữ liệu mới, không train lại | Test tích hợp: publish → job → retrieval trả chunk mới | B4 |
| AC-06 | Map dùng vị trí user, gọi/chỉ đường hoạt động | Test `$geoNear` với toạ độ thật + kiểm thủ công `tel:`/deep link | B6 |
| AC-07 | SOS ≤2 thao tác từ màn hình chính | Đếm thao tác từ Home/Explore/Chat, ghi vào DEMO_SCRIPT | B6 |
| AC-08 | Incident workflow đủ bước, checklist, liên hệ | Test API + kiểm thủ công tick step & resume | B7 |
| AC-09 | API validate input; rate limit chặn; CORS/Helmet cấu hình | Test negative: payload sai, spam, header response | B1, B9 |
| AC-10 | Admin CRUD đủ 6 loại dữ liệu + xem feedback | Đi hết 6 màn hình admin, chụp màn hình | B2, B5, B6, B7, B8 |
| AC-11 | Responsive mobile, không tràn ngang | Kiểm trên iPhone SE 375px + máy Android thật | B9 |
| AC-12 | Deploy public, tách biệt, secrets ngoài source | `docs/DEPLOY.md` + `/api/health` prod + grep secret | B9 |
