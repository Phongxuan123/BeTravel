# BE.TRAVEL — MASTER PLAN v2 (khớp repo thực tế)

> Thay thế bản v1. v1 giả định frontend là React web — sai; frontend thực tế là **Expo/React Native**.
> Đọc `04_Repo_Audit.md` trước để biết hiện trạng và 8 điểm xung đột.
> Baseline: repo `Phongxuan123/BeTravel` @ `79db16f` · 22/09/2026

---

## PHẦN A — BỨC TRANH

### A.1. Ba workspace, không phải monorepo

```
BeTravel/
├─ contracts/    ★ nguồn sự thật API — README.md + fixtures/*.json
├─ backend/      Express 5 · Mongoose 9 · Zod 4 · JavaScript ESM        [có auth]
├─ mobile/       Expo 57 · expo-router · NativeWind · TS                [18 màn hình, chạy mock]
└─ admin/        Vite · React · TS · Tailwind                           [CHƯA CÓ — dựng ở B2]
```

**Vì sao không monorepo:** backend là JS, hai client là TS — không chia sẻ type trực tiếp được. Và Metro bundler của Expo cộng với npm workspaces là nguồn lỗi kinh điển (`watchFolders`, `nodeModulesPaths`, symlink). Với nhóm sinh viên, cái giá đó lớn hơn lợi ích. Thay bằng cơ chế `contracts/` ở A.2 — rẻ hơn, chắc hơn, không đụng bundler.

### A.2. ★ Cơ chế chống lệch contract

```
contracts/README.md             đặc tả endpoint: path, query, request, response, ErrorCode
contracts/fixtures/<name>.json  MỘT response mẫu thật cho mỗi endpoint
```

| Phía | Kiểm bằng cách nào |
|---|---|
| backend | test: response thật `parse()` được bằng Zod của nó **và** khớp fixture |
| mobile | test: adapter + mock `parse()` được **đúng fixture đó** |
| admin | dùng chung type sinh từ Zod của chính nó, test tương tự |

Fixture là thứ duy nhất cả ba bên cùng nhìn vào. Lệch fixture → test đỏ ở hai phía cùng lúc, phát hiện ngay thay vì phát hiện lúc tích hợp.

### A.3. Đường găng thật của dự án

Không phải code. Là **thu thập và kiểm chứng nội dung pháp lý Hàn Quốc**. Code AI mất 2 ngày; 20 bài luật có nguồn thật mất 2–3 tuần người. Vì vậy:

> **B2 (Admin Portal) phải xong sớm để nhóm nội dung bắt đầu nhập liệu song song với mọi việc còn lại.**

---

## PHẦN B — QUYẾT ĐỊNH KIẾN TRÚC

Phần này là hợp nhất của v1 (những gì còn đúng) và các quyết định mới do đổi nền tảng. Claude Code **không được tự ý đổi**.

### B.1. Envelope & mã lỗi
`{ok:true,data,meta?}` / `{ok:false,error:{code,message,details?}}`. `ErrorCode` là enum đóng 10 giá trị (xem `CLAUDE.md` §5). Backend hiện dùng `{success,message}` — **đổi ở B1**.

### B.2. ★ Auth cho React Native
- Access token JWT 15 phút, lưu memory + `expo-secure-store`.
- Refresh token opaque 64 byte, lưu **hash** trong DB, TTL 30 ngày.
- **Transport theo client:** `AUTH_TRANSPORT=body` cho mobile (trả trong response body, lưu `expo-secure-store`); `cookie` cho admin web. Backend đọc từ **cookie HOẶC body** — một lần viết, hai chế độ.
- **Bật xoay vòng + phát hiện tái sử dụng**, kèm **cửa sổ ân hạn 10 giây**: token vừa bị thay vẫn chấp nhận trong 10s. Giải quyết đúng race condition mà comment hiện tại lo ngại, không phải trả giá bằng việc bỏ xoay vòng.
- Giữ nguyên Google login và forgot-password OTP đã có.

### B.3. ★ Ngân sách 3 search index trên Atlas M0
| # | Collection | Loại | Tên |
|---|---|---|---|
| 1 | `legal_chunks` | `vectorSearch` | `vec_idx` |
| 2 | `legal_chunks` | `search` | `txt_idx` |
| 3 | — | — | **dự phòng, không dùng** |

Cả tìm kiếm từ khoá và RAG chạy trên **cùng collection** → search và AI không bao giờ mâu thuẫn, match được bên trong bài dài, và mở đường cho `$rankFusion` sau này.

### B.4. Tiếng Việt — Atlas Search không có analyzer sẵn
Tự định nghĩa `vi_folded`: `icuNormalizer(nfkc)` → `lowercase` → `icuFolding`. Bỏ dấu nên "phat vape" khớp "phạt vape". Kèm field `textNorm` (đã bỏ dấu) làm fallback regex.

### B.5. `SEARCH_DRIVER=atlas|memory`
`memory` = load chunk vào RAM, cosine similarity + regex. Chạy được trong CI, khi mất mạng, và khi Atlas index trục trặc. **Là phương án dự phòng cho buổi bảo vệ.** Cache module TTL 60s, invalidate sau re-index.

### B.6. Embedding & LLM
- `EmbeddingProvider`: Gemini `gemini-embedding-001` @ **768 chiều** (mặc định), OpenAI `text-embedding-3-small` @768 (dự phòng), `MockEmbedding` (test).
- `LlmProvider`: `gemini-2.5-flash` (mặc định), OpenAI (dự phòng), **`MockLlm` (bắt buộc)** — không có nó thì golden test và CI phải đốt quota thật.
- Mỗi chunk lưu `embeddingModel` + `dims`. **Không trộn 2 model trong một index.**

### B.7. ★ Chat KHÔNG streaming ở MVP
`fetch` của React Native không trả `ReadableStream` ổn định trên mọi nền tảng. Câu trả lời pháp lý ngắn (≤250 từ, 2–4 giây) và màn hình chat đã có trạng thái `pending` sẵn. **Trả một lần.** Backend vẫn thiết kế sẵn `?stream=true` cho admin web và Phase 2.

### B.8. Bản đồ
- `react-native-maps` (đã cài), **`PROVIDER_DEFAULT`** → Apple Maps trên iOS (miễn phí, không key), Google Maps trên Android.
- **Android API key bắt buộc đặt quota cap** trong Google Cloud Console.
- **Không dùng Places API.** Tìm điểm gần nhất = `$geoNear` trên `support_locations` của chính mình.
- Chỉ đường = deep link. Gọi = `tel:`. Cả hai miễn phí.
- Chạy được trong **Expo Go SDK 57** — dev và demo không cần dev build.

### B.9. ★ Hợp đồng chống ảo giác
Xem `CLAUDE.md` §7 (bản đầy đủ). Bốn điểm sống còn:
1. Pre-filter `{countryCode, status:'published'}` trong `$vectorSearch.filter` — field phải khai `{"type":"filter"}` trong index definition.
2. **`$lookup` xác minh `status` thật** sau retrieval — không tin field copy trên chunk.
3. **Ngưỡng chặn TRƯỚC khi gọi LLM** — tiết kiệm tiền và đúng nghiệp vụ.
4. **Hậu kiểm bằng code** — xoá marker bịa, phát hiện "tuyên bố định lượng không nguồn" rồi hạ cấp xuống fallback.

### B.10. Vòng đời nội dung
```
draft → pending_review → published → superseded / archived
```
Điều kiện cứng để `published` (validate ở **backend**, không chỉ ẩn nút): ≥1 source đủ `url`+`authority`+`publishedAt`, `summaryVi` không rỗng, `effectiveFrom` có giá trị.
Publish → enqueue `reindex_article`. Unpublish/supersede → enqueue `purge_chunks`.
`isCurrent` do máy trạng thái duy trì + **partial unique index** `{countryCode,slug}` where `isCurrent:true`.

### B.11. Job queue — không cần Redis
Collection `jobs` + worker in-process `setInterval(3000)`, lock bằng `findOneAndUpdate`, idempotent, retry 3 lần.

### B.12. Bảo vệ chi phí — hai lớp
1. `express-rate-limit` (RAM) — chống spam.
2. **Quota lưu DB** `users.aiUsage {date, count}` + van toàn hệ thống — rate limit RAM reset khi server restart, quota DB thì không. Đây mới là thứ bảo vệ ví tiền.

### B.13. Hạ tầng
| Thành phần | Nền tảng | Cạm bẫy | Xử lý |
|---|---|---|---|
| backend | Render Free | **ngủ sau ~15 phút → cold start 50s+** | cron ping `/api/health` mỗi 10 phút; **warm-up thủ công 30 phút trước demo** |
| admin | Vercel Hobby | chỉ phi thương mại | dự án học kỳ → OK |
| DB | Atlas M0 | 512MB · 3 search index · `maxPoolSize:10` | đã tính ở B.3 |
| mobile | Expo Go (dev/demo) → EAS build (nộp bài) | react-native-maps cần key khi build store | B.8 |

---

## PHẦN C — MÔ HÌNH DỮ LIỆU

### C.1. Đã có (giữ nguyên, chỉ bổ sung)
`users` (thêm `aiUsage`, `preferences`, `locale`) · `refreshtokens` (thêm `family`, `revokedAt`, `replacedByHash`) · `passwordresets`

### C.2. Phải tạo mới
| Collection | Vai trò |
|---|---|
| `countries` | code ISO-2, tên, ngôn ngữ, `emergencyNumbers`, hotline bảo hộ, `status: active\|coming_soon` |
| `legal_topics` | `(countryCode, slug)` unique, icon, thứ tự |
| **`legal_articles`** | nội dung user-facing + `sources[]` + `version` + `status` + `isCurrent` + `indexState` |
| **`legal_chunks`** | ★ mang cả 2 search index; `embedding[768]` (`select:false`), `text`, `textNorm` |
| `support_locations` | GeoJSON Point + **2dsphere**, `verified` + `verifiedAt` |
| `geo_alerts` | `scope: country\|area`, `center` Point + `radiusM`, hiệu lực thời gian |
| `incident_types` | **`steps[]` nhúng** (luôn đọc cùng nhau) |
| `user_incident_progress` | `(userId, incidentTypeId)` unique |
| `favorites` | `(userId, targetType, targetId)` unique |
| `trips` | chỉ 1 `isCurrent` mỗi user |
| `chat_sessions` · `chat_messages` | message lưu `citations[]`, `retrieval{topScore,chunkIds}`, `fallbackReason` |
| `feedback` | `status: new\|reviewing\|resolved\|rejected` |
| `quick_phrases` | mẫu câu khẩn cấp theo quốc gia |
| `jobs` · `audit_logs` (TTL 180d) · `ai_cache` (TTL 24h) · `ai_events` | vận hành |

### C.3. `legal_articles` — hợp nhất mô hình FE và yêu cầu pháp lý

```js
{
  countryCode: 'KR', topicSlug: 'giao-thong', slug: 'quy-dinh-lai-xe',
  version: 1, isCurrent: true,
  status: 'published',           // draft|pending_review|published|superseded|archived

  title, summaryVi,              // ← FE đang dùng: title, summary
  keyPoints: [{ text, severity: 'normal'|'criminal' }],   // ← FE đang dùng
  penalties: [{ behavior, amountText, amountMin?, amountMax?, currency?, note? }],
  exceptions: [String],          // ← FE đang dùng
  foreignerNotes: [String],      // ← FE đang dùng
  bodyMd: String,                // nội dung đầy đủ, dùng để chunk cho RAG

  sources: [{ title, url, authority, kind, publishedAt, accessedAt }],  // ★ MẢNG
  effectiveFrom: Date, effectiveTo: Date|null,
  riskLevel: 'info'|'warn'|'danger', tags: [String],

  supersedesId, reviewedBy, reviewedAt,
  indexState: { status, chunkCount, lastIndexedAt, embeddingModel, error },
  createdBy, updatedBy, timestamps
}
// unique: (countryCode, slug, version)
// partial unique: (countryCode, slug) WHERE isCurrent = true
```

**Cầu nối sang FE** — `mobile/src/lib/api/adapters.ts` ánh xạ:
`sources[0] → source{name,agency,url}` · `penalties[] → fines: string[]` · `summaryVi → summary` · `topicSlug → topicKey`.
Nhờ vậy **không màn hình nào phải sửa**. Khi FE rảnh thì nâng cấp UI để hiển thị nhiều nguồn và mức phạt có cấu trúc.

### C.4. Định nghĩa index (dán vào Atlas UI)

`vec_idx` trên `legal_chunks`:
```json
{ "fields": [
  { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
  { "type": "filter", "path": "countryCode" },
  { "type": "filter", "path": "status" },
  { "type": "filter", "path": "topicSlug" }
]}
```

`txt_idx` trên `legal_chunks`: xem `03_Contracts_v2.md` §5 (có analyzer `vi_folded`).

### C.5. Chunking văn bản pháp lý
1. Cắt theo heading markdown; section >1.200 ký tự → cắt theo câu, overlap 15%; <200 ký tự → gộp với section kế.
2. **Prepend dòng ngữ cảnh trước khi embed** (không lưu vào text hiển thị):
   `[Quốc gia: Hàn Quốc] [Chủ đề: Giao thông] [Bài: …] [Hiệu lực từ: …]`
3. Mỗi `penalty` sinh thêm 1 chunk `"Hành vi X → mức phạt Y"` — câu hỏi về mức phạt là loại phổ biến nhất.

---

## PHẦN D — LỘ TRÌNH 9 BATCH

Prompt chi tiết ở `02_ClaudeCode_Batch_Prompts_v2.md`.

| Batch | Tên | Kết quả nhìn thấy được |
|---|---|---|
| **B1** | Hợp nhất contract & nối auth thật | Mobile đăng nhập bằng **tài khoản thật**, không còn auth giả |
| **B2** ★ | Content backbone + **Admin Portal** | Admin nhập & publish bài luật → **nhóm nội dung bắt đầu làm** |
| **B3** | Public content API + nối Explore/Search/Article | Mobile đọc cẩm nang từ **DB thật** |
| **B4** ★ | RAG engine + guardrails + golden test | AI trả lời có nguồn, từ chối đúng lúc; test xanh |
| **B5** | Nối chat mobile + feedback + admin queue | Chat thật end-to-end, báo sai → admin xử lý |
| **B6** | SOS: locations API + admin CRUD + map thật | SOS ≤2 thao tác, map + gọi + chỉ đường |
| **B7** | Incidents + Translator | Workflow có progress lưu server, dịch 2 chiều |
| **B8** | Alerts + Trips/Favorites/Profile thật | Cảnh báo theo vị trí, bỏ nốt mock cuối cùng |
| **B9** | Hardening + seed + EAS build + demo | Nộp được |

### D.1. Dependency không được làm ngược
```
B1 ──▶ B2 ──▶ B3 ──▶ B4 ──▶ B5
        │              └──▶ B8
        └──▶ B6 ──▶ B7
                     └──▶ B9 (cuối cùng)
```
- B4 không bắt đầu trước khi schema + trạng thái publish của B2 đã chốt.
- B6 không nghiệm thu được nếu chưa có `support_locations` đã verify.
- B8 cần cả country context (B3) lẫn admin alert data (B6).

### D.2. Việc của người — chạy song song, bắt đầu từ B2

| Việc | Ai | Ghi chú |
|---|---|---|
| **Thu thập & kiểm chứng 15–20 bài luật KR** | CPO + nhóm nội dung | **2–3 tuần. Đường găng.** Nguồn: Đại sứ quán VN tại Hàn, cơ quan xuất nhập cảnh Hàn, văn bản luật |
| Xác minh 12 điểm SOS (địa chỉ, hotline, giờ) | CMO | Phải gọi kiểm tra thật |
| Soạn 5 workflow sự cố | CPO | Mất hộ chiếu quan trọng nhất |
| Dịch 25 quick phrase sang tiếng Hàn + phiên âm | CMO | Nhờ người biết tiếng Hàn kiểm lại |
| Tạo 2 Atlas search index | CTO | JSON có sẵn, chờ trạng thái `ACTIVE` mới reindex |
| Key Gemini + key Maps Android **có quota cap** | CTO | Quota cap là bắt buộc |

---

## PHẦN E — RỦI RO

| # | Rủi ro | Mức | Chặn bằng |
|---|---|---|---|
| R1 | **Nội dung pháp lý trễ → không có gì để demo** | Rất cao / Chí mạng | B2 sớm, nhập liệu song song từ tuần 2 |
| R2 | AI bịa điều luật ngay lúc bảo vệ | TB / Chí mạng | B.9 hậu kiểm bằng code + golden test |
| R3 | Refresh token cookie hỏng trên Android | Cao / Nặng | B.2 `AUTH_TRANSPORT=body` + secure-store |
| R4 | Đụng trần 3 search index M0 | Cao / Nặng | B.3 dồn 2 index vào `legal_chunks` |
| R5 | Backend Render ngủ → demo treo 50s | Rất cao / Nặng | cron ping + warm-up thủ công |
| R6 | Chunk bài đã gỡ vẫn được trích dẫn | TB / Rất nặng | `$lookup` xác minh status thật |
| R7 | Hoá đơn Google Maps Android | TB / Nặng | quota cap + `PROVIDER_DEFAULT` + demo trên iOS |
| R8 | `__mock: literal(true)` làm hỏng parse API thật | Cao / TB | đổi `.optional()` ở B1 |
| R9 | Lệch contract FE/BE | Cao / Nặng | `contracts/` + fixture test hai phía |
| R10 | Streaming RN không chạy → viết lại chat | Cao / Nặng | B.7 không streaming ở MVP |
| R11 | Quota AI cạn giữa demo | TB / Nặng | `ai_cache` + key dự phòng + `SEARCH_DRIVER=memory` |
| R12 | Scope creep sang Premium/luật sư/B2B | Cao / TB | khoá P0; P1/P2 chỉ để schema rỗng |
| R13 | `expo-secure-store` chưa cài | Chắc chắn | cài ở B1 bằng `npx expo install` |
| R14 | Cạn connection pool Atlas M0 | TB / TB | `maxPoolSize:10` |

---

## PHẦN F — BIẾN MÔI TRƯỜNG

### `backend/.env`
```bash
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173          # admin web
CORS_ORIGINS=http://localhost:5173,http://localhost:8081
MONGODB_URI=mongodb+srv://.../WDPPROJECT01

JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES=15m
REFRESH_TTL_DAYS=30
AUTH_TRANSPORT=body                        # body | cookie | both
REFRESH_ROTATION_GRACE_SECONDS=10

GOOGLE_CLIENT_ID=
SMTP_HOST= / SMTP_PORT= / SMTP_USER= / SMTP_PASSWORD=

LLM_PROVIDER=gemini                        # gemini | openai | mock
GEMINI_API_KEY= / OPENAI_API_KEY=
LLM_MODEL=gemini-2.5-flash
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMS=768

SEARCH_DRIVER=atlas                        # atlas | memory
VECTOR_INDEX_NAME=vec_idx
TEXT_INDEX_NAME=txt_idx
RAG_TOP_K=8
RAG_NUM_CANDIDATES=150
RAG_MIN_TOP_SCORE=0.62
RAG_MIN_SOFT_SCORE=0.55
RAG_MIN_CHUNKS=2
AI_CACHE_TTL_HOURS=24
AI_DAILY_QUOTA_USER=40
AI_DAILY_QUOTA_GLOBAL=800
```

### `mobile/.env`
```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/api   # IP LAN, KHÔNG dùng localhost
EXPO_PUBLIC_USE_MOCKS=false                        # true = quay lại dữ liệu giả
```

### `admin/.env`
```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## PHẦN G — KHÔNG LÀM Ở MVP

Luật sư/live chat · dịch giọng nói/OCR · payment thật · background geofence & push · đối soát affiliate · B2B API/white-label · i18n UI · **streaming chat** · UI admin sửa system prompt · Places API.

---

## PHẦN H — HAI ĐIỀU CHỈNH SO VỚI TÀI LIỆU GỐC

1. **Bỏ "RAG giúp AI trả lời chuẩn xác 100%"** (pitch deck slide 5). Không dùng câu này ở sản phẩm, UI hay thuyết trình. Vừa sai kỹ thuật vừa là rủi ro pháp lý thật — và hội đồng sẽ bắt ngay. Thay bằng: *"Trả lời dựa trên nguồn đã kiểm chứng, luôn kèm trích dẫn; khi dữ liệu chưa đủ, hệ thống nói rõ thay vì suy đoán."*

2. **Bỏ Places API.** Spec gốc đã cho phép dùng dữ liệu nội bộ, và dữ liệu nội bộ còn đúng tinh thần "điểm hỗ trợ đã được kiểm chứng" hơn.
