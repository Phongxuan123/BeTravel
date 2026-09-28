# QA_REPORT — Đợt QA / bug hunt Be.Travel

> Đặc tả: `docs/07_QA_BugHunt.md`. Báo cáo này cập nhật dần theo từng phiên (QA-1 --> QA-5).
> Rule 12: không emoji, chỉ dùng `[v] [X] [!] [*] --> ---`.
> Chú giải chấm INV: `[v]` có test cụ thể chứng minh · `[*]` đã đọc code, chưa có test ·
> `[X]` sai / chưa đạt · `[!]` cần người quyết định.

| Phiên | Phạm vi | Trạng thái | Ngày |
|---|---|---|---|
| QA-1 | Pha 0 + Pha 1 (D01-D40) + M01-M04 | xong | 28/09/2026 |
| QA-2 | M05-M07 | xong | 28/09/2026 |
| QA-3 | M08-M12 | xong | 28/09/2026 |
| QA-4 | M13-M15 | xong | 28/09/2026 |
| QA-5 | M16-M17 + Pha 3 + Pha 4 + báo cáo tổng | chưa làm | |

Nhánh: `feature/qa-20260928`, tách từ `main` tại `2d681d8`. Không push, không merge.

---

## 0. GHI CHÚ VỀ ĐẶC TẢ

[!] `docs/07_QA_BugHunt.md` dừng ở M17 (dòng 755). Các phần có trong mục lục nhưng **không có
nội dung**: PHAN 6 (E2E-01..20), PHAN 7 (edge case, gồm 7.1 được M01 tham chiếu), PHAN 8
(danh mục BUG-xx, gồm BUG-H01), PHAN 9 (quy trình xử lý lỗi), PHAN 10 (mẫu QA_REPORT),
PHAN 11, PHAN 12 (DoD đợt QA). Phiên này dùng:
- Quy trình sửa lỗi theo `0.3` (test tái hiện đỏ --> sửa --> xanh) + Rule 13B của `05_ToiUuHeThong.md`.
- Cấu trúc báo cáo tự đặt (file này), bám bảng baseline mục 3.2 và thang G1-G12.
- **Cần người bổ sung PHAN 6-12 trước QA-5** (Pha 3/Pha 4 và DoD đợt QA phụ thuộc vào chúng).

---

## 1. BASELINE (Pha 0) — số liệu thật, chạy 28/09/2026 trên `2d681d8`

Môi trường: Windows 11, Node 22.16.0, npm 10.9.2. `node_modules` có sẵn, lock không đổi --> bỏ
qua `npm ci` (mục 3.2 cho phép). `patch-package`: `query-string@7.1.3` applied.

| Workspace | Lint | Type | Format | Test (pass/tổng) | Build/Export | Warning |
|---|---|---|---|---|---|---|
| backend | [v] 0 lỗi | n/a | [X] BASE-01 | 151/151 (~20s) · golden 26/26 | n/a | 0 |
| mobile | [v] 0 lỗi | [v] tsc sạch | n/a | 94/94 (21 suite) | [v] iOS 7,8MB hbc / [v] Android 8MB hbc | 0 |
| admin | [v] oxlint 0 | [v] tsc sạch | n/a | 9/9 (4 file) | [v] chunk lớn nhất 455 kB (gzip 140 kB) | 0 |

Khác:
- `expo-doctor`: 21/21 checks passed.
- `npm audit --omit=dev`: backend / mobile / admin đều **0** advisory (low/moderate/high/critical).
- Golden test: 26 test node = 25 ca golden + 1 test tổng hợp (khớp "25/25 ca" của G2).
- Export đặt ở thư mục tạm của phiên (không phải `/tmp` — Windows), không commit.

### 1.1. Lỗi baseline

| ID | Mức | Mô tả | Xử lý |
|---|---|---|---|
| BASE-01 | S4 | `npm run format:check` đỏ: **28 file** backend thật sự lệch Prettier (19 `src/`, 9 `test/`) — danh sách ở mục 5 | Chưa format: theo 05 phải commit format **riêng**, gom cuối đợt (Mode C/QA-5) |
| BASE-02 | S4 | Trên Windows `format:check` báo **147** file vì `core.autocrlf=true` chuyển file sang CRLF, còn `.prettierrc` ép `endOfLine: lf`. CI Linux sẽ chỉ thấy 28 | Đề xuất `.gitattributes` với `* text=auto eol=lf` (hỏi người trước, đụng mọi file) |

### 1.2. An toàn môi trường (mục 3.3)

- Host `MONGODB_URI` trong `backend/.env`: **cluster Atlas thật** (không in user/password).
- Test **không** chạm Atlas: `test/setup.js` dùng `MongoMemoryServer` và `mongoose.connect(mongod.getUri())`;
  `env.js` không `override` .env khi `NODE_ENV=test`; không test nào import `config/db.js`/`server.js`.
  `setup.js` ép `LLM_PROVIDER=mock`, `EMBEDDING_PROVIDER=mock`, `SEARCH_DRIVER=memory`.
- Không chạy `seed*`/`create-admin` trong phiên. Không gọi Gemini/OpenAI.
- [!] Phát hiện: `POST /auth/forgot-password` với email **tồn tại** sẽ gửi SMTP thật bằng thông tin
  trong `.env` (không có mock email). Test mới chỉ dùng email không tồn tại; ghi nợ QA-M02-06.

---

## 2. PHA 1 — DETECTOR TĨNH (D01-D40)

Lệnh chạy bằng `git grep`/ripgrep; `\|` đã thay bằng `|`. Mỗi detector rỗng đều có lệnh đối chứng
(ví dụ D01 đối chứng liệt kê được 3 file `.env.example`; D05 đối chứng `token.js` đọc thẳng
`process.env.JWT_ACCESS_SECRET`).

| ID | Kết quả | Kết luận |
|---|---|---|
| D01 | rỗng | [v] không file env/secret bị track; `.claude/` không bị track |
| D02 | 1 dòng: `config/db.js:42` là ví dụ `user:password@<cluster-host>` trong comment | [v] không phải secret |
| D03 | chỉ `docs/04_Repo_Audit.md:183` (dòng tài liệu lịch sử ghi "cần xóa host") | [v] `backend/README.md` đã sạch; dòng lịch sử vẫn lộ host --> xem QA-D03 |
| D04 | `docs/PROGRESS.md` có 3 email tài khoản thật + mật khẩu admin mặc định; `env.js`/`.env.example` có mật khẩu admin mặc định | [X] --> **đã sửa** QA-D04-A, QA-D04-B |
| D05 | rỗng | [v] không fallback chuỗi cố định cho JWT secret |
| D06 | rỗng | [v] |
| D07 | nhánh production trả "Đã có lỗi xảy ra", không `stack` | [*] không test được vì `isProduction` đóng băng lúc import |
| D08 | 1 chỗ `ArticleEditorPage.tsx:346`, HTML từ `renderSafeMarkdown` --> `DOMPurify.sanitize` | [v] `markdown.test.ts` |
| D09 | rỗng | [v] |
| D10 | `guard.js:10` (regex hằng, không từ input) · `publicContent.service.js:110` qua `escapeRegex` | [v] cả hai an toàn |
| D11 | Đường công khai: `publicContent`, `favorite` (VISIBLE_FILTER), `rag/retrieval` (verifyAgainstArticles). Còn lại là admin/job | [*] đối chiếu từng filter ở QA-2 (M05) |
| D12 | `embedding` `select:false`; `+embedding` chỉ ở `memory.driver.js` | [v] |
| D13 | `publicSupportLocation.service.js` **không** lọc `verified:true` (cả `/nearby` lẫn `/support-locations`) | [!] QA-D13 — mâu thuẫn đặc tả, cần người chốt |
| D14 | Incident: `status:'published'` [v]; GeoAlert: status + khoảng hiệu lực [v]; QuickPhrase: model **không có** trường trạng thái | [v] không rò rỉ; QuickPhrase không có bản nháp (S3 ghi nhận) |
| D15 | `$geoNear` là stage đầu, lọc trong `query` | [v] |
| D16 | Mọi `coordinates: [...]` ở src/test đều `[lng, lat]`; admin `csv.ts` `[lng, lat]` | [v] (MapPicker Leaflet kiểm ở QA-4) |
| D17 | `admin/FeedbackQueuePage.tsx:82` và `admin/RagIndexPage.tsx:14` hard-code `['KR','JP','TH','SG']` | [X] S2 QA-D17 (admin UI, nên lấy từ `/admin/countries`) |
| D18 | `retrieval.js#verifyAgainstArticles` chạy chung cho cả 2 driver, lọc `published+isCurrent+countryCode+version` | [v] (`hardening.test.js` "chunk cũ của draft/superseded không lọt RAG") |
| D19 | `chat.service.js`: retrieve --> `if (!retrieval.passed)` trả fallback --> mới gọi LLM | [*] spy đếm LLM = 0 ở QA-2 |
| D20 | Ngưỡng/model/index chỉ trong `env.js`; còn lại là comment | [v] |
| D21 | `guardAnswer` gọi 1 chỗ; cache chỉ lưu kết quả đã guard và `fallbackReason == null` | [v] đọc code; test ở QA-2 |
| D22 | rỗng trong `backend/src/rag` ngoài ký tự U+2605 ở comment `guard.js`/`retrieval.js` | [v] disclaimer không emoji (xem D30) |
| D23 | 4/4 fetch provider có `AbortSignal.timeout(env.AI_PROVIDER_TIMEOUT_MS)` | [v] |
| D24 | `aiUsage.service.js`: `findOneAndUpdate` với `count < limit` + `$inc` cùng lệnh | [v] (`hardening.test.js` quota đồng thời) |
| D25 | 11 màn hình/component `import type {...} from '@/mocks/schemas'` | [X] S3 QA-D25 (chỉ import type, không có dữ liệu mock lúc chạy; nhưng lệch dấu hiệu B8 của CLAUDE.md "grep `@/mocks` mobile/src/app --> rỗng") |
| D26 | chỉ trong test (`http.test.ts`) | [v] |
| D27 | rỗng | [v] |
| D28 | Không có `AppError('XYZ')` chuỗi tự do; mọi mã đi qua `ErrorCode.*` | [v] |
| D29 | chỉ `core/envelope.js` (+ `res.json()` đọc response provider) | [v] |
| D30 | `README.md:89-96` dùng U+2705; `mobile/app/trips/new.tsx:473` render ký tự U+2713 trong UI; U+2605 trong comment src/test/contracts; U+26A0 trong chuỗi `chat.test.ts` | [X] S3 QA-D30 (tài liệu 00-04 gốc của nhóm không tính) |
| D31 | `config/db.js` (3), `server.js` (1) | [v] log khởi động có chủ đích, không in secret |
| D32 | rỗng | [v] |
| D33 | rỗng | [v] |
| D34 | rỗng | [v] |
| D35 | >60 dòng: `adminCrudController.js:13` (factory, 85), `chat.service.js:147` `sendMessage` (~187), `legalArticle.service.js:173` `changeArticleStatus` (62), `passwordReset.service.js:177` `resetPassword` (62), `refreshToken.service.js:83` `refreshAccessToken` (78) | S4 ghi nhận, không tự tách (chat/refresh thuộc ngoại lệ Rule 9 hoặc đã có test hồi quy dày) |
| D36 | rỗng | [v] |
| D37 | 1 chỗ `auth.test.js:155` chờ 1,2s (vượt cửa sổ ân hạn 1s có chủ đích) | [v] |
| D38 | `skip: () => NODE_ENV === 'test'` | [v] |
| D39 | `app.set('trust proxy', 1)` hard-code | [v] đủ cho Render (1 proxy); S4: chưa theo env |
| D40 | Mọi route ghi có `validateBody`, trừ: `trips PUT /:id/current`, `DELETE *` (không body), `new-version`, `refresh`, `logout`; nhóm `/auth/*` validate **trong controller** (`registerSchema/loginSchema/changePasswordSchema`), còn `google`, `forgot/verify/resend/reset`, `PATCH /me` kiểm tay trong service | [v] có lý do; S4: thống nhất sang `validateBody` |

---

## 3. PHA 2 — MODULE (QA-1: M01-M04)

Test mới: `backend/test/qa.core.test.js` (23 test) + 1 test ở `mobile/src/lib/api/__tests__/http.test.ts`.

### M01 — Envelope, lỗi, validate

| INV | Chấm | Bằng chứng |
|---|---|---|
| 01.1 envelope 2 dạng | [v] | `contracts.test.js` (error.validation/unauthorized), `qa.core` INV-01.6 |
| 01.2 mã đóng + HTTP | [v] | `qa.core` "INV-01.2 moi ErrorCode anh xa dung HTTP status" |
| 01.3 JSON hỏng --> 400 | [v] | `hardening.test.js` "API trả lỗi 400 cho ID và JSON không hợp lệ" |
| 01.4 ObjectId sai --> 400 | [v] | cùng test trên |
| 01.5 E11000 --> 409, không lộ index | [v] sau sửa | `qa.core` INV-01.5 (đỏ trước sửa: "Username đã được sử dụng" cho trùng mã quốc gia) --> QA-M01-01 |
| 01.6 404 envelope | [v] | `qa.core` INV-01.6 |
| 01.7 production không lộ message | [*] | `error.middleware.js:51-55`; `isProduction` đóng băng lúc import nên chưa test |
| 01.8 payload > 2mb | [v] | `qa.core` INV-01.8 — trả **400** VALIDATION_ERROR (không phải 413) --> S4 QA-M01-02 |
| 01.9 validateQuery lưu bản đã coerce | [v] | `hardening.test.js` "Express query giữ coerce..." |
| 01.10 phân trang | [v] | `qa.core` INV-01.10 (`limit=100000`, `page=0`, `limit=0` --> 400; meta đúng) |
| H-01.a đọc `req.query` thô | [*] | Mọi route list admin có `validateQuery`; `parsePagination` tự `parseInt` nên an toàn cả khi thiếu |
| H-01.b SyntaxError express.json | [v] | `entity.parse.failed` xử lý ở `error.middleware.js:36` |
| H-01.c mass assignment | [v] | `qa.core` "H-01.c PATCH /auth/me..." (role/isActive/email giữ nguyên); Zod `z.object` mặc định strip field lạ; `createArticle` ghi đè `status/isCurrent/version` sau spread |

### M02 — Xác thực

| INV | Chấm | Bằng chứng |
|---|---|---|
| 02.1 không lộ password | [v] | `qa.core` INV-02.1 (quét đệ quy key ở register/login/me/refresh) |
| 02.2 refresh lưu hash | [v] | `qa.core` INV-02.2 |
| 02.3 xoay vòng | [v] | `auth.test.js` "cap access token moi va XOAY VONG" |
| 02.4 ân hạn | [v] | `auth.test.js` "TRONG cua so an han" |
| 02.5 reuse --> thu hồi family | [v] | `auth.test.js` "NGOAI cua so an han thu hoi toan bo family" |
| 02.6 refresh đồng thời | [v] | `hardening.test.js` "refresh đồng thời chỉ tạo một token con" |
| 02.7 logout body + cookie, idempotent | [v] | `qa.core` INV-02.7 |
| 02.8 hết hạn / sai chữ ký / alg none | [v] | `qa.core` INV-02.8 |
| 02.9 khóa/hạ quyền mất quyền ngay | [v] | `hardening.test.js` "JWT cũ không giữ quyền admin..."; `qa.core` INV-02.9 (refresh bị 403 + family thu hồi) |
| 02.10 AUTH_TRANSPORT | [*] | `authTransport.js`: đọc cookie **hoặc** body; cookie options kiểm ở QA-5 (M16) |
| 02.11 chuẩn hóa email/phone | [v] | `qa.core` INV-02.11 |
| 02.12 không phân biệt lỗi đăng nhập | [v] sau sửa | `qa.core` INV-02.12 (đỏ trước sửa: tài khoản bị khóa + mật khẩu sai trả 403 "đã bị vô hiệu hóa") --> QA-M02-01 |
| 02.13 OTP | [v] một phần | `qa.core` "OTP sai 5 lần thì khóa", "forgot-password email không tồn tại"; `hardening.test.js` OTP đồng thời. [X] `resend` không có cooldown theo email --> QA-M02-02 |
| 02.14 change-password | [v] | `auth.test.js` "doi mat khau that va thu hoi refresh token cu" |
| 02.15 rate limit ngoài test | [*] | `rateLimit.middleware.js` chỉ skip khi `NODE_ENV==='test'`; limiter `resetRateLimit` dùng chung cho 4 route (8 req/15 phút/IP gộp) |
| 02.16 mobile secure-store, lỗi mạng không logout | [v] | `http.test.ts` "refresh mất mạng giữ token"; `tokenStore.ts` dùng `expo-secure-store` |
| 02.17 single-flight refresh | [v] | `http.test.ts` "nhiều request cùng nhận 401 chỉ kích hoạt một lần refresh" (mới) |
| 02.18 đổi tài khoản xóa cache | [v] một phần | mobile `userStorage.test.tsx`; `auth.tsx` `queryClient.clear()` khi đổi owner; admin `authContext.tsx` `queryClient.clear()` [*] |
| H-02.a vòng lặp refresh | [v] | cờ `isRetry` + `refreshInFlight` (mobile + admin) |
| H-02.b Google | [*] | `GOOGLE_EMAIL_ALREADY_REGISTERED` chặn chiếm tài khoản; thiếu client id --> `INTERNAL_ERROR` có message rõ |
| H-02.c PATCH /me phone | [v] | `qa.core` "H-02.c" |
| H-02.d JWT payload | [v] | chỉ `sub` + `role`; `auth.middleware.js` đọc role/isActive từ DB |
| H-02.f admin refresh ở localStorage | [*] | chấp nhận có điều kiện: D08 sạch; CSP chưa có (QA-4) |

### M03 — RBAC

| INV | Chấm | Bằng chứng |
|---|---|---|
| 03.1 requireRole cấp router | [v] | `admin.routes.js:59` `router.use(authenticateToken, requireRole(ADMIN))` |
| 03.2 sweep tự động | [v] | `rbac.sweep.test.js` (đọc `router.stack`, >=40 route) |
| 03.3 401/403/admin bị khóa | [v] | `rbac.sweep.test.js`; `qa.core` INV-03.3 |
| 03.4 không route admin ngoài `/api/admin` | [*] | đọc `app.js` + 10 file routes: không có thao tác quản trị ngoài admin router |
| 03.5 hành động nguy hiểm chặn ở backend | [v] | sweep bao cả DELETE/publish/bulk-verify/reindex |
| H-03.a sweep bỏ sót `router.use` con | [*] | hiện admin router không có sub-router; nếu thêm sau này sweep sẽ **bỏ sót** --> S4 QA-M03-01 |
| H-03.b reindex-country chống bấm liên tục | [X] | không rate limit, không khử trùng job: mỗi lần bấm enqueue lại toàn bộ bài --> S3 QA-M03-02 |
| H-03.c audit mọi hành động ghi | [X] | có audit: articles, countries, topics, locations (+bulk), incidents, quick-phrases, geo-alerts, feedback. **Thiếu**: `POST /admin/rag/reindex-country` --> S3 QA-M03-03 |

### M04 — Vòng đời nội dung pháp lý

| INV | Chấm | Bằng chứng |
|---|---|---|
| 04.1 đồ thị trạng thái | [!] | `changeArticleStatus` **chấp nhận mọi chuyển** giữa 5 trạng thái (vd `archived --> published`, `superseded --> published` = đưa bản cũ trở lại hiện hành). Contract §7.3 chỉ mô tả điều kiện publish, không có đồ thị --> QA-M04-01 cần người chốt |
| 04.2 điều kiện publish ở backend | [v] | `admin.test.js` "publish bai luat thieu source bi tu choi voi CONFLICT..." |
| 04.3 tối đa 1 isCurrent | [v] | `admin.test.js` "partial unique index chan duoc..."; `qa.core` H-04.b (publish đồng thời 2 bản nháp, 4/4 lần chạy xanh) |
| 04.4 bài đã publish không sửa trực tiếp; không đổi slug/country | [v] | `hardening.test.js` "bài đã publish không sửa trực tiếp"; `qa.core` INV-04.4 |
| 04.5 optimistic concurrency trong lệnh UPDATE | [v] | `admin.test.js` "updatedAt cu -> CONFLICT"; `hardening.test.js` "hai bản sửa nháp chỉ một bản thắng" |
| 04.6 publish --> reindex; rời published --> purge | [v] | `admin.test.js` (reindex, purge khi supersede); `qa.core` INV-04.6 (archive --> purge) |
| 04.7 job worker | [v] | `hardening.test.js` 3 test (lease/nhận lại, không handler, hết lượt --> failed) |
| 04.8 cùng embeddingModel/dims | [*] | kiểm sâu ở QA-2 (M06) |
| 04.9 titleNorm đồng bộ | [v] | `qa.core` INV-04.9. Không có `updateOne/findOneAndUpdate` nào sửa `title/summaryVi` (chỉ `updateMany` đổi `status/isCurrent` khi supersede) |
| 04.10 xóa Country/Topic đang tham chiếu | [v] sau sửa | `qa.core` INV-04.10 (đỏ trước sửa: xóa được, để bài mồ côi) --> QA-M04-02 |
| 04.11 DOMPurify, link http(s) | [v] | `markdown.test.ts`; `sourceSchema.url` regex `^https?://` |
| 04.12 bản nháp editor theo (tài khoản, bài) | [*] | `ArticleEditorPage.tsx:109` khóa `bt_admin_article_draft_<userId>_<id>`; không autosave khi banner khôi phục đang mở |
| H-04.a titleNorm lệch qua update | [v] | như 04.9 |
| H-04.b publish đồng thời | [v] có điều kiện | an toàn **nhờ partial unique index**. Chạy lẻ trên DB mới (index chưa build) thì ra **2 bản isCurrent** --> logic ứng dụng một mình không đủ --> S2 QA-M04-03 |
| H-04.c chunk mồ côi | [v] | `hardening.test.js` "chunk cũ của draft/superseded không lọt RAG" |
| H-04.d effectiveTo đã qua | [X] ghi nợ | bài luật **không** lọc `effectiveTo` ở API công khai lẫn RAG; validator bài luật không kiểm `effectiveTo >= effectiveFrom` (GeoAlert có). Không tự đổi hành vi --> S3 QA-M04-04 |
| H-04.e seed/golden dùng chung | [v] | golden 26/26 sau mọi thay đổi; không sửa golden |

---

---

## 3B. PHA 2 — MODULE (QA-2: M05-M07)

Test mới: `backend/test/qa.content-rag.test.js` (24 test); mobile `features/chat/__tests__/ChatScreen.test.tsx`,
`lib/api/__tests__/search.test.ts` (2), 1 test thêm ở `AnswerCard.test.tsx`. Fixture `hardening.test.js` sửa
`embeddingModel` cho khớp provider (xem QA2-M06-03).

### M05 — API nội dung công khai & tìm kiếm

| INV | Chấm | Bằng chứng |
|---|---|---|
| 05.1 chặn 5 trạng thái ở mọi endpoint | [v] | `qa.content-rag` INV-05.1: draft, pending_review, archived, superseded, published-nhưng-không-hiện-hành × list/detail/search/related/`articleCount` topic + country |
| 05.2 slug có bản superseded | [v] | `qa.content-rag` INV-05.2 (trả bản hiện hành v2, không trả nội dung cũ) |
| 05.3 `articleCount` chỉ đếm published+current | [v] | như 05.1 |
| 05.4 coming_soon / 404 | [v] | `qa.content-rag` INV-05.4; `publicContent.test.js` |
| 05.5 chuẩn hóa tiếng Việt, `đ`-->`d`, giới hạn q | [v] sau sửa | `qa.content-rag` INV-05.5 x2 (đỏ trước sửa: "dai su quan" không ra "Đại sứ quán"; q 201 ký tự trả 200) --> QA2-M05-01, QA2-M05-02 |
| 05.6 regex injection | [v] | `qa.content-rag` INV-05.6 (`(a+)+$`, `.*`, `[`, `\`, `a|b` --> 200, 0 kết quả) |
| 05.7 snippet không HTML | [v] | search trả `summaryVi` thuần, không `<mark>`; mobile render `Text` |
| 05.8 không lộ trường nội bộ | [v] sau sửa | `qa.content-rag` INV-05.8 (đỏ trước sửa: lộ `reviewNote`, `indexState.error`, `titleNorm`, `createdBy`...) --> QA2-M05-03 |
| 05.9 cô lập quốc gia | [v] | `qa.content-rag` INV-05.9 |
| H-05.a `kr` chữ thường | [v] | cùng test; validator `toUpperCase` |
| H-05.b total khi tách AND | [v] | `countDocuments(filter)` dùng cùng filter với `find` |
| H-05.c regex không index | [*] | chấp nhận ở quy mô hiện tại (quyết định B3), không sửa |

### M06 — RAG, guardrail, quota, cache

| INV | Chấm | Bằng chứng |
|---|---|---|
| 06.1 lọc country+published ở tầng search | [v] | `atlas.driver.js` filter; `memory.driver.js` `status` + `matchesFilter`; `hardening` "focusArticle không đưa chunk quốc gia khác" |
| 06.2 xác minh bài thật ở cả 2 driver | [v] sau bổ sung test | `retrieval.js#verifyAgainstArticles` dùng chung; `qa.content-rag` INV-06.2 (bài published nhưng `isCurrent:false`) — xem mutation 3 |
| 06.3 dưới ngưỡng --> LLM = 0 lần | [v] | `qa.content-rag` INV-06.3 (spy đếm: câu ngoài phạm vi + câu nước khác = 0 lần; câu hợp lệ = 1 lần) |
| 06.4 ngưỡng trên score gốc | [v] | `retrieval.js` tính `topScore` từ vector hits đã xác minh, trước RRF |
| 06.5 guard marker + định lượng | [v] sau sửa | `rag.guard.test.js`; `qa.content-rag` H-06.a (pipeline thật), H-06.b (9 dạng) --> QA2-M06-01 |
| 06.6 so số tiền với nguồn | [v] | `rag.guard.test.js` "marker hợp lệ không bảo chứng con số bịa"; `qa.content-rag` H-06.b ký hiệu `₩` đứng trước |
| 06.7 disclaimer, không "100%" | [v] | `qa.content-rag` INV-06.7; `git grep -niE "100\s*%" -- backend/src mobile/src admin/src`: quy tắc 4 system prompt (câu phủ định), kích thước CSS/SVG, và comment lỗi thời `mobile/src/lib/api/adapters.ts:269` "quick-phrases vẫn 100% mock tới B7" (S4). Không có câu hứa chính xác 100% |
| 06.8 JSON hỏng / answer rỗng / thiếu trường / throw | [v] | `qa.content-rag` INV-06.8 (4 dạng --> PROVIDER_ERROR, không 500) |
| 06.9 lỗi embedding/search/timeout | [v] | `hardening` "lỗi embedding trở thành fallback"; D23 timeout 4/4 provider |
| 06.10 câu hỏi nước khác chặn trước retrieval | [X] một phần | 4 ca golden `country_isolation` xanh, nhưng chỉ khớp **tên đầy đủ** --> QA2-M06-04 |
| 06.11 focusArticle cùng quốc gia, hiện hành | [v] | `hardening` "focusArticle không đưa chunk quốc gia khác" |
| 06.12 cache key + expiresAt | [v] | `qa.content-rag` INV-06.12 (sửa bài --> cache miss); `hardening` "cache hết hạn không dùng lại" |
| 06.13 cache hit trừ quota | [*] | Code: quota trừ **trước** cache (`sendMessage` dòng 151). Tài liệu chưa ghi --> S4 QA2-M06-06 |
| 06.14 quota nguyên tử, không trừ khi validate lỗi | [v] | `hardening` 2 test đồng thời; `qa.content-rag` INV-06.14. Quyết định: lỗi provider **vẫn trừ** lượt (comment `aiUsage.service.js`) |
| 06.15 ai_events | [v] | `qa.content-rag` INV-06.15. Lưu cả câu hỏi thô — quyết định có chủ đích (`AiEvent.js`: A01 cần hiện "top câu hỏi fallback") |
| 06.16 chunking | [v] | `qa.content-rag` INV-06.16 (cắt >1200 có overlap, gộp <200, penalty riêng, dòng ngữ cảnh không vào `text`). [*] một câu đơn >1200 ký tự không bị cắt |
| 06.17 lệch dims / trộn model | [v] sau sửa | `qa.content-rag` INV-06.17 (đỏ trước sửa: chunk model cũ vẫn làm bằng chứng) --> QA2-M06-02 |
| H-06.a mutation testing | xem dưới | |
| H-06.b regex bỏ sót | [v] sau sửa | 5/9 dạng lọt trước sửa --> QA2-M06-01 |
| H-06.c từ chối oan | [v] | `qa.content-rag` H-06.c ("gọi 112", "tổng đài 1345", "9 giờ" không bị hạ cấp) |
| H-06.d marker dạng lạ | [*] | `[S1, S2]`, `[s1]`, `【S1】`, `[S01]` không được nhận: có số liệu --> bị chặn (an toàn); không số liệu --> hiện nguyên chuỗi marker, 0 citation --> S3 QA2-M06-05 |
| H-06.e prompt injection | [*] | Trong câu hỏi: guard vẫn chặn (hậu kiểm không phụ thuộc LLM). Trong nội dung bài do admin nhập: **không chặn được** — rủi ro tin cậy nội dung admin, ghi nhận |
| H-06.f 20 request song song | [v] | `hardening` "quota user đồng thời chỉ cấp đúng số lượt còn lại" |
| H-06.g reset quota 07:00 giờ VN | [*] | Khóa ngày UTC (`toISOString().slice(0,10)`) --> reset 07:00 sáng giờ VN. Ghi nhận, không đổi |

**Mutation testing thủ công (H-06.a)** — sửa tạm trên cây làm việc, chạy golden + guard + hardening + qa, hoàn nguyên sau mỗi lần (đã kiểm `git diff`/grep không còn dấu `MUTATION`):

| # | Đột biến | Kết quả với bộ test **baseline** | Xử lý |
|---|---|---|---|
| 1 | Bỏ `guardAnswer` trong `chat.service.js`, trả thẳng answer LLM | [X] **sống sót**: golden dùng MockLlm luôn trích đúng nguồn, `rag.guard.test` gọi thẳng hàm --> không test nào đi qua guard trên đường thật | Thêm `qa.content-rag` H-06.a (LLM bịa qua `sendMessage`) --> đỏ dưới đột biến, xanh khi hoàn nguyên. **S1 QA2-M06-07 đã xử lý** |
| 2 | `RAG_MIN_TOP_SCORE=0.99` (qua env) | [v] bị bắt: 16/26 ca golden đỏ | — |
| 3 | Bỏ `isCurrent: true` ở `verifyAgainstArticles` | [X] **sống sót**: test cũ chỉ đổi `status` | Thêm `qa.content-rag` INV-06.2 --> đỏ dưới đột biến. **S1 QA2-M06-08 đã xử lý** |

### M07 — Chat & feedback

| INV | Chấm | Bằng chứng |
|---|---|---|
| 07.1 IDOR session/message | [v] | `qa.content-rag` INV-07.1: B gọi GET messages, POST message, PATCH rename, DELETE, POST feedback trên session của A --> 404 cả 5; dữ liệu A nguyên vẹn; quota B không bị trừ; `feedback.test.js` báo sai tin nhắn người khác |
| 07.2 xóa session xóa message | [v] | `qa.content-rag` INV-07.2. Feedback trỏ tin đã xóa: admin detail trả `message: null`, không crash |
| 07.3 message lưu citations/retrieval/fallbackReason | [v] | `hardening` "cache hết hạn... giữ metadata AI và chunkId thật" |
| 07.4 chat cần đăng nhập | [v] | `chat.routes.js` `router.use(authenticateToken)`; mobile chặn guest bằng màn "Đăng nhập để hỏi AI" |
| 07.5 feedback rate limit, độ dài, trạng thái | [v] một phần | `feedbackRateLimit`; `qa.content-rag` INV-07.5 (note >1000 --> 400); audit ở `feedback.test.js`. [X] không có đồ thị trạng thái (mọi chuyển đều hợp lệ) --> S3 QA2-M07-03 |
| 07.6 mobile pending / chống gửi trùng / fallback / SOS | [v] sau sửa | `ChatScreen.test.tsx` (đỏ trước sửa: 2 request song song); `AnswerCard.test.tsx` needsOfficialHelp (đỏ trước sửa) --> QA2-M07-01, QA2-M07-02. Fallback hiển thị khối riêng màu vàng, không phải lỗi đỏ [v] |
| 07.7 tiêu đề session | [v] | `chatSessionRenameSchema` 1-100 ký tự; mobile render `Text` (không HTML); `profile.test.js` |
| H-07.a UI ngụ ý AI nhớ ngữ cảnh | [v] | Không có câu chữ như vậy trên màn hình; comment `lib/api/chat.ts` nói "giữ lịch sử" là lưu phiên, không phải multi-turn |
| H-07.b phân trang | [X] | `listSessions`/`listMessages` trả toàn bộ, không giới hạn --> S3 QA2-M07-04 |

---

## 3C. PHA 2 — MODULE (QA-3: M08-M12)

Test mới: `backend/test/qa.support.test.js` (13 test + 1 `todo` tái hiện nợ H-09.a); mobile
`lib/api/__tests__/countriesOffline.test.ts` (2), `features/sos/__tests__/SosHubScreen.test.tsx` (1).
Test cũ `trips.test.js`, `contracts.test.js` thêm seed Country (bắt buộc sau QA3-M12-02), không nới điều kiện.

### M08 — SOS

| INV | Chấm | Bằng chứng |
|---|---|---|
| 08.1 chỉ trả `verified:true` | [!] | Không lọc — quyết định B6 (xem QA-D13, chờ người chốt) |
| 08.2 `$geoNear` đầu, giới hạn lat/lng/radius/limit | [v] | D15; `qa.support` INV-08.2 (lat 91, lng 181, lat chữ, radiusKm 5000, limit 1000 --> 400) |
| 08.3 `[lng, lat]` mọi tầng | [v] | `supportLocation.test.js` tọa độ thật Seoul/Busan; admin `csv.test.ts`; validator tuple `[lng, lat]`. MapPicker Leaflet kiểm ở QA-4 |
| 08.4 đơn vị khoảng cách | [v] | API `distanceMeters`; mobile `haversineKm` + nhãn m/km |
| 08.5 CSV import từng dòng | [v] một phần | `supportLocation.test.js`, `hardening` bulk import. [X] không định nghĩa khóa trùng: import 2 lần cùng file tạo 2 bản ghi --> S3 QA3-M08-02 |
| 08.6 `tel:`/website http(s)/thiếu tọa độ | [v] | `qa.support` INV-08.6; mobile vô hiệu nút khi thiếu số/tọa độ (`sos/index.tsx`) |
| 08.7 SOS khi mất mạng | [v] sau sửa | H-08.a bên dưới |
| 08.8 từ chối quyền vị trí vẫn dùng được SOS | [v] | `supportLocation.test.js` fallback theo quốc gia; `sos/index.tsx` bắt lỗi GPS, giữ nguyên số khẩn cấp |
| H-08.a mất mạng khi mở app | [v] sau sửa | **S1** QA3-M08-01: mỗi lần mở app offline `country` rỗng --> `SosHubScreen` `return null` = màn hình trắng, không số khẩn cấp, không nút quay lại. Đã sửa (cache danh sách quốc gia + màn dự phòng). [!] Lần đầu cài app mà offline vẫn chưa có số khẩn cấp --> QA3-M08-03 cần người duyệt dữ liệu tĩnh |
| H-08.b Android thiếu Maps key | [*] | Không kiểm được trên máy ảo/thiết bị; danh sách điểm vẫn tải độc lập với MapView |
| H-08.c cache SOS tách bộ lọc, tính lại khoảng cách | [v] | `sos.test.ts` |

### M09 — Workflow sự cố

| INV | Chấm | Bằng chứng |
|---|---|---|
| 09.1 chỉ published; gộp toàn cục + quốc gia | [v] | `incident.test.js` 3 test |
| 09.2 progress chỉ workflow published; bước không tồn tại | [v] một phần | `incident.test.js` "Tiến độ không đọc/ghi incident nháp". Khác đặc tả: bước ngoài phạm vi bị **lọc âm thầm** (200) thay vì 400 — quyết định B7 có test, ghi nhận |
| 09.3 unique + PUT idempotent | [v] | `qa.support` INV-09.3 (3 PUT đồng thời --> 1 bản ghi) |
| 09.4 admin 409 khi stale; refetch không đè nháp | [v] | `incident.test.js` "Hai admin lưu cùng phiên bản"; admin `IncidentEditorPage.test.tsx` |
| 09.5 CTA | [*] | `runCta` dùng `Linking.openURL` **không** `.catch` (thiết bị không có ứng dụng gọi --> promise bị từ chối không xử lý) --> S3 QA3-M09-03 (gộp INV-13.7 ở QA-4) |
| H-09.a đổi thứ tự bước | [X] tái hiện | `qa.support` H-09.a (`todo`): tick "Trình báo công an" chuyển sang "Xin giấy thông hành" --> S2 QA3-M09-01, cần người chốt (đổi schema, chạm dữ liệu) |
| H-09.b `updatedAt` optional | [X] ghi nợ | Admin hiện tại luôn gửi; API vẫn nhận PATCH không có `updatedAt` --> S3 QA3-M09-02 |
| H-09.c mobile NOT_FOUND vs lỗi mạng | [v] | `incidents.test.ts` (sửa ở PR #20) |

### M10 — Dịch khẩn cấp & mẫu câu

| INV | Chấm | Bằng chứng |
|---|---|---|
| 10.1 rate limit/quota | [v] một phần | `translateRateLimit` 30/15 phút/IP; không quota DB — quyết định B7 có ghi lý do (`rateLimit.middleware.js`) |
| 10.2 giới hạn độ dài + ngôn ngữ | [v] sau sửa | `qa.support` INV-10.2 (đỏ trước sửa: `to`/`from` 5000 ký tự --> 200, chèn thẳng vào prompt LLM) --> S2 QA3-M10-01. Ngôn ngữ chưa theo danh sách cố định (nhãn tự do ≤40) — ghi nhận |
| 10.3 provider lỗi --> 502 | [v] | `qa.support` INV-10.3 (throw / JSON hỏng / `translated` rỗng) |
| 10.4 `mode` text/phrase | [*] | Backend xử lý như nhau; UI không hứa khác biệt |
| 10.5 mẫu câu theo quốc gia, offline | [v] | `qa.support` INV-10.5; mobile `translate.test.ts` (cache offline). QuickPhrase không có trạng thái nháp (D14) |
| 10.6 nhãn "bản dịch máy" | [*] | Kiểm UI ở QA-4 |

### M11 — Cảnh báo theo vị trí

| INV | Chấm | Bằng chứng |
|---|---|---|
| 11.1 area cần center/radius; `effectiveTo >= effectiveFrom` ở create và PATCH | [v] | `alerts.test.js`; `qa.support` INV-11.1 |
| 11.2 hiệu lực thời gian, quốc gia, bán kính, bỏ bản ghi hỏng | [v] | `alerts.test.js` 5 test; `qa.support` INV-11.2 (nước khác, chưa tới ngày) |
| 11.3 GPS chỉ khi có consent, không nền, last-known ≤5 phút | [v] | `usePollAlerts.test.tsx`; code `usePollAlerts.ts` (`AppState` active, `maxAge` 5 phút) |
| 11.4 backend không log tọa độ | [v] | Không có logger request (morgan/pino) trong `backend/`; `findApplicable` chỉ tính, không ghi |
| 11.5 dismiss theo tài khoản, hàng đợi | [v] | `alerts.test.ts` (mobile) |
| 11.6 tôn trọng safety | [v] | `usePollAlerts.test.tsx` |
| H-11.a log query string | [v] | như 11.4 |
| H-11.b giờ thiết bị | [v] | So sánh hiệu lực chạy ở server (`new Date()` backend) |

### M12 — Favorites, trips, preferences

| INV | Chấm | Bằng chứng |
|---|---|---|
| 12.1 IDOR | [v] | `trips.test.js` xem/xóa/sửa; `qa.support` favorite B xóa của A, trip B đặt current của A --> 404 |
| 12.2 chặn target không công khai | [v] | `favorites.test.js` "Favorites không lộ draft, archived, địa điểm chưa xác minh..." |
| 12.3 bookmark superseded chỉ metadata | [v] | `favorites.test.js` 2 test. Bài hiện hành trong favorites lộ trường nội bộ --> đã sửa QA3-M12-01 (`qa.support` INV-12.3) |
| 12.4 unique, idempotent | [v] | `favorites.test.js` "Luu trung 1 muc khong loi" |
| 12.5 một isCurrent, endDate, chặn coming_soon | [v] sau sửa | `trips.test.js`; `qa.support` INV-12.5 (đỏ trước sửa: tạo được trip tới JP coming_soon và mã "XX") --> QA3-M12-02 |
| 12.6 preferences chặt | [v] | `qa.support` INV-12.6 (role/email bị bỏ qua); `profile.test.js` |
| 12.7 dữ liệu local theo email+mode | [v] | `userStorage.test.tsx` |
| H-12.a N request bài đã lưu | [*] | `fetchArticles(savedOnly)` gọi chi tiết từng slug --> 50 bookmark = 51 request. Ghi S3 hiệu năng QA3-M12-03, không đổi contract |
| H-12.b xóa trip đang current | [v] | Không trip nào thành current; mock cùng hành vi |

---

## 3D. PHA 2 — MODULE (QA-4: M13-M15)

Test mới: mobile `RouteErrorFallback.test.tsx` (2), `openExternal.test.ts` (3), `contractsB7B8.test.ts` (4);
admin `DangerousActions.test.tsx` (2); backend `contracts.test.js` +3 (5 fixture chưa từng được backend đối chiếu).

### M13 — Mobile

**Bảng trạng thái màn hình (INV-13.2)** — `L` loading · `E` empty · `R` error · `T` nút thử lại.

| Màn hình | L | E | R | T | Ghi chú |
|---|---|---|---|---|---|
| `index` (Home) | [v] Skeleton | [v] | [v] | [X] | Lỗi hiển thị chung một dòng |
| `explore/index` | [v] | [v] | [v] | [X] | |
| `explore/[country]/[slug]` | [v] | n/a | [v] | [X] | Có nút "Quay lại" |
| `search/index` | [*] không chỉ báo đang tìm | [v] EmptyState | [v] | [X] | |
| `chat/index` | [v] TypingDots | [v] | [v] (khối vàng) | [v] gửi lại | |
| `sos/index` | n/a | n/a | [v] sau sửa QA-3 | [v] | |
| `sos/map` | [v] | [v] | [v] + ErrorBoundary MapView | [X] | |
| `incidents/index` | [v] | [v] | [v] | [X] | |
| `incidents/[slug]` | [v] | n/a | [v] | [X] | |
| `translate/index` | [X] mẫu câu | [X] | [X] mẫu câu (lỗi dịch có Alert) | [X] | QA4-M13-04 |
| `alerts/index` | [v] | [v] | [v] | [X] | |
| `favorites/index` | [v] | [v] | [v] | [X] | Lỗi và "rỗng" hiện **cùng lúc** — QA4-M13-05 |
| `trips/index` | [v] | [v] | [v] | [X] | |
| `trips/new` | [v] (sửa) | n/a | [v] | — | |
| `profile/index` | [v] ("…") | — | [X] | [X] | Đếm số chuyến/đã lưu về 0 khi lỗi |
| `settings/index` | [X] | — | [X] | [X] | Lỗi tải preferences --> hiện giá trị mặc định như thật — QA4-M13-06 |
| `welcome`, `(auth)/*` (5), `coming-soon`, `_dev/design-system` | tĩnh / form | — | form báo lỗi | — | `_dev/design-system` vẫn là route trong bản production — QA4-M13-08 |

| INV | Chấm | Bằng chứng |
|---|---|---|
| 13.1 mọi màn qua `@/lib/data`, mock toàn app | [v] sau sửa | D25: 11 file `import type` từ `@/mocks/schemas` --> chuyển qua `@/lib/data` (re-export type). `grep '@/mocks' src/app src/components src/features` = rỗng (dấu hiệu B8 của CLAUDE.md đúng lại) |
| 13.2 3 trạng thái | [v] một phần | Bảng trên: hầu hết có L/E/R, **gần như không màn nào có nút thử lại** --> S3 QA4-M13-03 |
| 13.3 ErrorBoundary route gốc | [v] sau sửa | S2 QA4-M13-01: không có ErrorBoundary cấp route (chỉ MapView) --> lỗi render một màn làm sập app. Đã thêm (`_layout.tsx` export theo API Expo Router, đã tra docs) + test (đỏ khi gỡ export) |
| 13.4 adapter chịu dữ liệu thiếu | [v] | `adapters.test.ts`; fixture mới QA-2 bỏ trường nội bộ vẫn xanh |
| 13.5 Zod không bắt `__mock` | [v] | `schemas.ts` `__mock: z.literal(true).optional()` |
| 13.6 URL API | [v] | `http.ts`: URL tường minh ưu tiên, suy IP LAN chỉ khi `__DEV__`. [*] build production thiếu URL --> lỗi bị bọc thành "Không thể kết nối" (S4) |
| 13.7 `tel:`/link không crash | [v] sau sửa | S3 QA4-M13-02: 7 chỗ `Linking.openURL` không bắt lỗi (Home, profile, incident CTA, SOS map...) và số không chuẩn hóa --> helper `lib/openExternal.ts` (`toTelUrl` bỏ khoảng trắng/chấm/gạch/ngoặc, giữ `+`; lỗi --> Alert) |
| 13.8 xin quyền vị trí đúng lúc, giải thích thật | [v] | `locationPermission.ts` giải thích trước hộp thoại, nói rõ gửi tọa độ tới máy chủ, không theo dõi nền; từ chối vĩnh viễn --> trả `null`, không lặp. [X] không hướng dẫn mở Settings khi bị từ chối vĩnh viễn (S3) |
| 13.9 token ở secure-store | [v] | `tokenStore.ts`. Hồ sơ `authUser` (email, tên) ở AsyncStorage — không phải token |
| 13.10 queryKey theo quốc gia/user | [v] một phần | articles/topics/quick-phrases có `countryCode`; đổi tài khoản `queryClient.clear()`. [X] `['alerts']` không gồm quốc gia --> có thể thoáng thấy cảnh báo nước cũ khi đổi quốc gia (S3 QA4-M13-07) |
| 13.11 font lỗi vẫn vào app | [X] | `_layout.tsx`: `if (!fontsLoaded) return null` — `useFonts` lỗi thì `loaded` không bao giờ true --> kẹt splash. S3 QA4-M13-09 (cần thiết bị để tái hiện) |
| 13.12 không emoji UI | [X] | `trips/new.tsx:473` ký tự U+2713 (QA-D30) |
| 13.13 Expo Go SDK 57 | [v] | `expo-doctor` 21/21; không thêm native module mới trong đợt QA |
| 13.14 patch-package | [v] | baseline: `query-string@7.1.3` applied |
| 13.15 không hard-code quốc gia mặc định | [v] một phần | `countryContext` chọn nước `active` đầu tiên. [*] `sos/map.tsx` tọa độ mặc định Tokyo khi thiếu GPS lẫn Đại sứ quán (S4) |
| 13.16 bàn phím che ô nhập | [X] đọc code | Không có `KeyboardAvoidingView` ở chat (ô nhập đáy màn hình) — trên iOS bàn phím có thể che ô nhập. Cần xác nhận trên thiết bị, không tự sửa mù — QA4-M13-10 |
| H-13.c ngày tháng | [v] | `parseISODate` dùng nửa đêm giờ địa phương; "Cập nhật" từ timestamp nên theo giờ địa phương là đúng |
| H-13.d `Intl` trên Hermes | [*] | Cần thiết bị |

### M14 — Admin

| INV | Chấm | Bằng chứng |
|---|---|---|
| 14.1 ProtectedRoute, refresh 1 lần | [v] | `ProtectedRoute.tsx`; `apiClient.ts` single-flight + `isRetry` |
| 14.2 hiện lỗi `details` từ backend | [v] một phần | Publish hiện `details`; form khác chỉ hiện `message` (S4) |
| 14.3 409 giữ nội dung đang gõ | [v] incident / [*] bài luật | `IncidentEditorPage.test.tsx`; bài luật đọc code: lỗi giữ form, **không** có "tải bản mới để so" (S3) |
| 14.4 DOMPurify, link ngoài | [v] | `markdown.test.ts`; không có `target="_blank"` nào |
| 14.5 phân trang/lọc | [X] một phần | `LocationsPage`/`CountriesPage` gọi `limit: 100`, không phân trang --> điểm thứ 101 trở đi không hiện (S3 QA4-M14-03) |
| 14.6 xác nhận hành động nguy hiểm | [v] sau sửa | Xóa/publish có xác nhận; **xác minh hàng loạt điểm SOS** và **re-index quốc gia** thì không --> S2 QA4-M14-01 (xác minh = đưa điểm lên SOS thật). Đã thêm + test |
| 14.7 MapPicker `[lat,lng]` --> `[lng,lat]` | [*] | `MapPicker.tsx`, `CirclePicker.tsx` đổi đúng chiều (đọc code, chưa có test do Leaflet cần DOM thật) |
| 14.8 đổi tài khoản xóa cache/nháp | [v] | `authContext.tsx` `queryClient.clear()`; nháp khóa theo userId |
| 14.9 thiếu `VITE_API_BASE_URL` | [X] | Build vẫn đạt, lỗi chỉ lộ lúc gọi API (S3) |
| 14.10 bundle | [v] | Chunk lớn nhất 455 kB, trang bản đồ đã lazy-load |
| D17 hard-code quốc gia | [v] sau sửa | `RagIndexPage`, `FeedbackQueuePage` lấy danh sách từ `countriesApi` (test) |
| H-14.a 2 tab | [*] | Không lắng nghe sự kiện `storage` --> tab 2 chỉ phát hiện khi gọi API bị 401 (S4) |
| H-14.b `<img onerror>` | [v] | `markdown.test.ts` "lọc script, event handler" |

### M15 — Contract 3 bên

Ma trận (sau QA-4): mọi fixture được backend **và** ít nhất một client đọc.

| Fixture | backend | mobile | admin |
|---|---|---|---|
| auth.register / login / me, error.validation / unauthorized | [v] | [v] | |
| auth.refresh | [v] QA-4 | [v] | |
| admin.country, admin.legalArticle, error.conflict, error.forbidden | [v] QA-4 | | [v] |
| public.country / legalTopic / legalArticle / legalSearch / supportLocation / incident, trip, favorites | [v] | [v] | |
| public.geoAlert, public.quickPhrase, translate, preferences | [v] | [v] QA-4 | |

| INV | Chấm | Bằng chứng |
|---|---|---|
| 15.1 mỗi fixture backend + 1 client | [v] sau sửa | 5 fixture chưa có test backend + 4 fixture chưa có client --> đã bổ sung. Phát hiện lệch thật: QA4-M15-01 |
| 15.2 mọi endpoint có fixture | [X] | Chat, feedback, admin locations/incidents/quick-phrases/geo-alerts/audit/analytics/rag chưa có fixture (S3 QA4-M15-02) |
| 15.3 fixture là response thật | [v] sau sửa | `admin.country`/`admin.legalArticle` thiếu `__v`, `titleNorm`, `summaryNorm` mà admin API thật trả --> cập nhật fixture |
| 15.4 fixture lỗi khớp HTTP + code | [v] | error.validation/unauthorized/forbidden/conflict đều có test backend với status thật |
| 15.5 `docs/API.md` vs contracts | [*] | Chưa đối chiếu từng dòng (để QA-5) |

## 4. DANH SÁCH LỖI / NGHI VẤN

### 4.1. Đã sửa trong QA-1 (mỗi lỗi có test đỏ trước, xanh sau)

| ID | Mức | Mô tả | Sửa | Test |
|---|---|---|---|---|
| QA-D04-A | S1 | `docs/PROGRESS.md` (repo public) liệt kê 3 email tài khoản thật + mật khẩu admin mặc định | Thay bằng mô tả trung tính. **Lịch sử git vẫn còn** — rewrite history là việc của người | D04 grep sạch |
| QA-D04-B | S1 | `env.js` mặc định `SEED_ADMIN_PASSWORD="Matkhau123"`, `.env.example` ghi cùng giá trị --> mọi môi trường quên đổi đều dùng mật khẩu ai cũng biết | Bỏ giá trị mặc định (chuỗi rỗng = không khai); tách `ensureSeedAdmin` trong `seed-content.js`, thiếu mật khẩu thì bỏ qua tạo admin | `qa.core` "D04 seed khong tao admin voi mat khau mac dinh..." |
| QA-M01-01 | S3 | Mọi lỗi E11000 ngoài email/phone bị báo "Username đã được sử dụng" (trùng mã quốc gia, slug chủ đề...) | `domainErrors.js`: bảng nhãn tường minh, còn lại trả "Dữ liệu bị trùng với bản ghi đã có" | `qa.core` INV-01.5 |
| QA-M02-01 | S3 | Đăng nhập tài khoản bị khóa trả 403 "đã bị vô hiệu hóa" **trước** khi kiểm mật khẩu --> dò được tài khoản tồn tại/bị khóa, và chênh thời gian (không chạy bcrypt) | `auth.service.js#loginUser`: kiểm mật khẩu trước, chỉ báo bị khóa khi mật khẩu đúng | `qa.core` INV-02.12 |
| QA-M04-02 | S2 | Xóa Country/Topic đang có bài luật (hoặc chủ đề) tham chiếu --> bài mồ côi | `country.service`/`legalTopic.service`: kiểm tham chiếu --> 409 CONFLICT; admin `CountriesPage`/`TopicsPage` hiện lỗi xóa (trước đó mutation xóa **không có** `onError`, lỗi bị nuốt) | `qa.core` INV-04.10 |

**Đã sửa trong QA-2:**

| ID | Mức | Mô tả | Sửa | Test |
|---|---|---|---|---|
| QA2-M06-01 | **S1** | Guard bỏ sót 5 dạng tuyên bố định lượng không nguồn: `₩3,000,000`, `$500`, "bị phạt tù 1 năm", "tù đến 3 năm", "ba triệu won". Dạng "phạt tù đến 1 năm" có ngay trong nguồn KR (fixture) --> LLM chép sai con số mà không marker vẫn hiện cho người dùng | `guard.js`: thêm ký hiệu tiền đứng trước, "phạt tù", "tù (đến) N", "triệu/nghìn/tỷ + đơn vị tiền"; trích số từ dạng `₩N` để đối chiếu nguồn | `qa.content-rag` H-06.b x2; golden 26/26 và H-06.c (không từ chối oan) vẫn xanh |
| QA2-M06-07 | **S1** | Test không bảo vệ bất biến: bỏ hẳn guard khỏi `sendMessage` mà toàn bộ test baseline vẫn xanh (mutation 1) | Thêm test end-to-end LLM bịa qua pipeline thật | `qa.content-rag` H-06.a |
| QA2-M06-08 | **S1** | Test không bảo vệ bất biến: bỏ `isCurrent` ở lớp phòng thủ thứ hai mà test vẫn xanh (mutation 3) | Thêm test bài published nhưng không hiện hành | `qa.content-rag` INV-06.2 |
| QA2-M06-02 | S2 | Chunk của embedding model khác (đổi model chưa re-index hết) vẫn được tính cosine và làm bằng chứng; vector truy vấn sai số chiều bị cắt âm thầm (`cosineSimilarity` dùng `Math.min` độ dài) | `retrieval.js`: bỏ vector hit khác `embeddingModel` của provider hiện tại (2 driver trả thêm `embeddingModel`); sai số chiều --> lỗi `EMBEDDING_DIMS_MISMATCH` --> fallback PROVIDER_ERROR | `qa.content-rag` INV-06.17 |
| QA2-M06-03 | S3 | Fixture `hardening.test.js` ghi chunk `embeddingModel:"mock"` khác provider `"mock-embedding"` | Dùng `createMockEmbeddingProvider().model`; nếu không, test "chunk cũ không lọt RAG" xanh vô nghĩa sau QA2-M06-02 | chính các test đó |
| QA2-M05-01 | S2 | Tìm kiếm không dấu không khớp `đ`: "dai su quan" không ra "Đại sứ quán" (NFD không tách `đ`). Ảnh hưởng cả keyword search RAG của memory driver | So khớp phía truy vấn `[dđ]` (`toDStrokeInsensitivePattern`) và gập `đ` khi so ở memory driver. **Không** đổi `normalizeVi` --> không phải migrate `titleNorm`/`textNorm` trên Atlas, không đổi vector mock của golden | `qa.content-rag` INV-05.5 |
| QA2-M05-02 | S3 | `q` không giới hạn độ dài (mỗi từ thành một `$regex`) | Zod `max(200)` + mobile cắt `q` về 200 ký tự ở `lib/api/content.ts` (không sửa màn hình) | `qa.content-rag` INV-05.5; mobile `search.test.ts` |
| QA2-M05-03 | S2 | Bài luật công khai (`/legal/articles`, `/legal/articles/:c/:s`) lộ `reviewNote` (ghi chú nội bộ reviewer), `indexState.error` (lỗi provider), `createdBy/updatedBy/reviewedBy`, `titleNorm/summaryNorm`, `__v`. Chính fixture hợp đồng đã ghi nhận các trường này | Contract trước: bỏ khỏi `public.legalArticle.json` + ghi chú `contracts/README.md`; service `.select()` loại trường nội bộ. Mobile không dùng trường nào trong số này (grep) | `qa.content-rag` INV-05.8; `contracts.test.js` (backend) + `adapters.test.ts`/`savedArticles.test.ts` (mobile) vẫn xanh với fixture mới |
| QA2-M07-01 | S2 | Mobile chat cho gửi câu mới (nút gửi + câu gợi ý) khi câu trước chưa trả lời. `getLastChatMessageId()` đọc id lượt vừa xong --> 2 lượt song song gán nhầm id, "Báo sai"/thumbs rơi vào tin nhắn khác. Comment `lib/api/chat.ts` khẳng định "input bị khóa trong lúc chờ" nhưng code không khóa | `chat/index.tsx`: khóa bằng ref (chặn 2 lần bấm cùng frame) + làm mờ nút khi đang chờ | `ChatScreen.test.tsx` |
| QA2-M07-02 | S2 | Backend trả `needsOfficialHelp` (quy tắc 6 prompt: bị bắt, tai nạn, mất giấy tờ) nhưng mobile bỏ qua --> câu trả lời khẩn cấp không có lối tắt tới SOS | `ChatAnswer` thêm `needsOfficialHelp?` (optional, mock không đổi), adapter truyền xuống, `AnswerCard` hiện nút "Liên hệ hỗ trợ khẩn cấp" đầu thẻ | `AnswerCard.test.tsx` |

**Đã sửa trong QA-3:**

| ID | Mức | Mô tả | Sửa | Test |
|---|---|---|---|---|
| QA3-M08-01 | **S1** | Mở app khi mất mạng: danh sách quốc gia (nguồn số khẩn cấp + Đại sứ quán) không có cache --> SOS Hub `return null`, màn hình trắng, không nút quay lại | `lib/api/content.ts#fetchCountries` lưu bản tải thành công gần nhất (`StorageKeys.countriesCache`) và dùng khi lỗi mạng; `sos/index.tsx` hiện màn dự phòng (hướng dẫn, "Thử lại", nút quay lại) thay vì `null` | mobile `countriesOffline.test.ts`, `SosHubScreen.test.tsx` |
| QA3-M10-01 | S2 | `/api/translate`: `from`/`to` không giới hạn độ dài, chèn thẳng vào prompt LLM --> vượt trần 500 ký tự (chi phí AI), prompt injection dài | `translate.validator.js` giới hạn 40 ký tự | `qa.support` INV-10.2 |
| QA3-M12-01 | S2 | `GET /users/favorites` trả nguyên document bài luật hiện hành (lộ `reviewNote`, `indexState`...) — cùng lỗi QA2-M05-03 qua đường bookmark | Dùng chung `INTERNAL_ARTICLE_FIELDS` của `publicContent.service.js` | `qa.support` INV-12.3 |
| QA3-M12-02 | S3 | Backend cho tạo/sửa trip tới quốc gia `coming_soon` hoặc mã không tồn tại (chỉ UI chặn) | `trip.service.js` kiểm Country `active` khi tạo và khi **đổi** quốc gia (trip cũ tới nước sau này bị đóng vẫn sửa ngày được) | `qa.support` INV-12.5 |

**Đã sửa trong QA-4:**

| ID | Mức | Mô tả | Sửa | Test |
|---|---|---|---|---|
| QA4-M13-01 | S2 | Không có ErrorBoundary cấp route: lỗi render một màn hình làm sập toàn app, người đang gặp sự cố không tới được SOS | `components/common/RouteErrorFallback.tsx` (Thử lại + Mở SOS, không lộ `error.message`) export làm `ErrorBoundary` ở `app/_layout.tsx` | `RouteErrorFallback.test.tsx` |
| QA4-M14-01 | S2 | Admin "Xác minh đã chọn" (đưa điểm lên SOS cho người dùng) và "Re-index" không có xác nhận | `window.confirm` với nội dung nêu hậu quả | `DangerousActions.test.tsx` |
| QA4-M15-01 | S3 | `/auth/refresh` trả thêm cờ nội bộ `rotated` ngoài hợp đồng; fixture admin lệch response thật (`__v`, `titleNorm`, `summaryNorm`) | `authTransport.js` bỏ `rotated` trước khi trả; cập nhật 2 fixture admin | `contracts.test.js` 3 test mới |
| QA4-M13-02 | S3 | 7 chỗ gọi điện/mở link không bắt lỗi, số không chuẩn hóa | `lib/openExternal.ts` dùng chung | `openExternal.test.ts` |
| QA-D17 | S2 | Admin hard-code `['KR','JP','TH','SG']` | Lấy từ `countriesApi` | `DangerousActions.test.tsx` |
| QA-D25 | S3 | 11 màn `import type` từ `@/mocks/schemas` | Re-export type qua `@/lib/data` | `tsc` + grep rỗng |

### 4.2. Cần người quyết định (không tự sửa — CLAUDE.md Phần 8: chạm logic nghiệp vụ)

| ID | Mức | Vấn đề | Phương án |
|---|---|---|---|
| QA-D13 | S0 theo 07 / đã chốt khác ở B6 | API SOS công khai trả cả điểm `verified:false` (PROGRESS mục 45, contracts §SOS: "verified ưu tiên"). Mobile chỉ gắn huy hiệu cho điểm đã xác minh, **không** gắn nhãn "chưa xác minh". Mâu thuẫn với D13/INV-08.1 và với favorites (không cho lưu điểm chưa verified) | (A) Chỉ trả `verified:true` — an toàn nhất, nhưng hiện Atlas chưa có điểm nào verified --> bản đồ trống, chỉ còn số khẩn cấp quốc gia. (B) Giữ nguyên, thêm nhãn "Chưa xác minh" rõ ràng ở mobile + contract. (C) Mặc định verified-only, cho client xin thêm `includeUnverified=true` khi không có kết quả. **Đề xuất: A hoặc C** |
| QA-M04-01 | S2 | Không có đồ thị chuyển trạng thái bài luật; mọi chuyển đều hợp lệ | (A) Chốt đồ thị tối thiểu: `draft<->pending_review`, `pending_review-->published`, `published-->archived|draft`, cấm `superseded-->published` (khôi phục bản cũ phải qua `new-version`). (B) Giữ tự do, ghi rõ trong contract. **Đề xuất A** |
| QA2-M06-04 | S2 | Chặn câu hỏi nước khác chỉ khớp **tên đầy đủ** (`Country.name`). Đã tái hiện: "Ở Nhật vượt đèn đỏ...", "Đi Tokyo...", "In Japan...", "Sang Thái..." đều lọt --> RAG trả lời bằng luật **Hàn Quốc** kèm trích dẫn như thể áp dụng cho nước được hỏi | (A) Thêm `Country.aliases[]` (admin nhập: "nhật", "japan", "tokyo"...) + khớp cả `nameEn` — cần đổi model + nhập liệu. (B) Chỉ thêm khớp `nameEn` (rẻ, không đổi dữ liệu, vẫn lọt "Nhật"/"Tokyo"). **Đề xuất A** |
| QA2-M06-05 | S3 | Câu trả lời không có số liệu mà **không có marker hợp lệ nào** vẫn được hiển thị (0 citation), kể cả khi LLM viết marker sai dạng `[S1, S2]`/`[s1]` | Có bắt buộc >=1 citation cho mọi câu `answered` không? (CLAUDE.md 4.2 chỉ bắt buộc với tuyên bố định lượng) |
| QA3-M08-03 | S1 (nếu người dùng cài app lúc không có mạng) | Lần **đầu** mở app mà offline thì chưa có dữ liệu quốc gia nào --> SOS chỉ hiện màn dự phòng, không có số khẩn cấp | (A) Đóng gói sẵn số khẩn cấp + Đại sứ quán của các nước `active` vào app (dữ liệu tĩnh, **người phải xác minh từng số**). (B) Giữ màn dự phòng như hiện tại. **Đề xuất A** — 07 yêu cầu hỏi người trước khi thêm dữ liệu tĩnh |
| QA3-M09-01 | S2 | Tiến độ incident lưu theo `step.order`; admin đổi thứ tự bước (giữ số bước) --> tick của người dùng gắn sai bước (đã tái hiện bằng test `todo`) | (A) Thêm id ổn định cho từng bước (`stepId`), progress lưu `stepId` — đổi schema + migrate progress hiện có. (B) Khi admin đổi thứ tự thì xóa progress của workflow đó. **Đề xuất A** |
| QA4-M11-01 | S2 (quyền riêng tư) | `locationConsent` **mặc định `true`** ở cả backend (`User.js`) lẫn mobile (`DEFAULT_PREFERENCES`) — "đồng ý chia sẻ vị trí" được bật sẵn thay vì người dùng chủ động chọn. Hiện GPS vẫn cần quyền hệ điều hành (chỉ xin kèm giải thích ở SOS) nên chưa đọc vị trí ngầm | (A) Mặc định `false`, hỏi đồng ý lần đầu khi bật cảnh báo vị trí (user cũ giữ nguyên giá trị đã lưu). (B) Giữ `true`, ghi rõ trong chính sách riêng tư. **Đề xuất A** |
| QA-M04-03 | S2 | Tính duy nhất `isCurrent` phụ thuộc hoàn toàn vào partial unique index; publish không chạy trong transaction (siblings bị supersede trước, nếu `save()` lỗi vì lý do khác thì 0 bản hiện hành) | (A) Dùng transaction Mongo (Atlas M0 hỗ trợ replica set). (B) Chấp nhận, thêm kiểm tra khởi động `LegalArticle.syncIndexes()`/cảnh báo nếu thiếu index. **Cần người xác nhận index đã tồn tại trên Atlas** |

### 4.3. Còn tồn đọng (ghi nợ, chưa sửa)

| ID | Mức | Mô tả | Đề xuất |
|---|---|---|---|
| ~~QA-D17~~ | — | **Đã sửa ở QA-4** (xem 4.1) | — |
| QA-M02-02 | S3 | `resend-reset-otp` không có cooldown theo email (chỉ rate limit IP gộp 8/15 phút) --> spam email nạn nhân từ nhiều IP | Cooldown 60s theo bản ghi `PasswordReset.createdAt` |
| QA-M02-03 | S3 | `PASSWORD_LOGIN_UNAVAILABLE` (tài khoản chỉ có Google) trả trước khi kiểm mật khẩu --> dò được email đã đăng ký Google | Quyết định UX: giữ thông báo hữu ích hay gộp vào INVALID_CREDENTIALS |
| QA-M02-04 | S3 | `forgot-password` với email tồn tại + SMTP lỗi trả 502, email không tồn tại trả 200 --> dò tài khoản khi SMTP hỏng | Luôn trả 200, log lỗi SMTP phía server |
| QA-M02-05 | S4 | `utils/token.js` đọc `process.env` trực tiếp thay vì `env` đã validate; `JWT_ACCESS_EXPIRES || "15m"` lặp default | Dùng `env` |
| QA-M02-06 | S3 | Không có provider email mock: test/dev gọi `forgot-password` với email thật sẽ gửi SMTP thật | Thêm `EMAIL_PROVIDER=mock` cho test |
| QA-M01-02 | S4 | Payload > 2mb trả 400 thay vì 413 | Chấp nhận (INV cho phép), hoặc map `entity.too.large` --> 413 cần mã mới (enum đóng --> không làm) |
| QA-M03-01 | S4 | Sweep RBAC chỉ đọc `layer.route`, không đi vào `router.use` con | Duyệt đệ quy `layer.handle.stack` |
| QA-M03-02 | S3 | `reindex-country` không chống bấm liên tục, không khử trùng job | Bỏ qua bài đã có job `reindex_article` pending/running |
| QA-M03-03 | S3 | `reindex-country` không ghi audit log | Thêm `recordAuditLog` action `REINDEX` |
| QA-M04-04 | S3 | Bài luật hết `effectiveTo` vẫn hiển thị/được RAG dùng; validator bài luật không kiểm `effectiveTo >= effectiveFrom` | Chốt nghiệp vụ trước (hiện "Hết hiệu lực" hay ẩn) |
| QA-M04-05 | S3 | PATCH Country `code` / Topic `slug` đang có bài tham chiếu vẫn làm bài mồ côi (cùng loại QA-M04-02, đường sửa thay vì xóa); `findByIdAndUpdate` không `runValidators` | Chặn đổi khóa khi có tham chiếu |
| ~~QA-D25~~ | — | **Đã sửa ở QA-4** (xem 4.1) | — |
| QA-D30 | S3 | Emoji: `README.md` U+2705, UI `trips/new.tsx` U+2713, U+2605 trong comment/contracts | Thay `[v]`, icon `lucide`; gom sửa QA-5 |
| QA-D03 | S3 | Host cluster thật còn trong `docs/04_Repo_Audit.md:183` và lịch sử git | Thay bằng `<cluster-host>`; lịch sử git: người quyết định |
| BASE-01/02 | S4 | Format backend (28 file) + CRLF Windows | Commit format riêng ở QA-5 |
| QA2-M06-06 | S4 | Cache hit vẫn trừ quota (quota trừ trước khi tra cache); câu hỏi bị từ chối (dưới ngưỡng/nước khác) cũng trừ lượt. Chưa ghi trong `contracts/README.md` | Ghi rõ quyết định vào contract |
| QA2-M07-03 | S3 | Feedback admin đổi trạng thái tự do (không có đồ thị) | Chốt cùng QA-M04-01 |
| QA2-M07-04 | S3 | `GET /chat/sessions` và `/sessions/:id/messages` không phân trang | Thêm `limit`/cursor khi dữ liệu lớn |
| QA2-M06-09 | S4 | Chunking không cắt một câu đơn dài hơn 1.200 ký tự | Cắt cứng theo ký tự khi câu vượt ngưỡng |
| QA2-M13-01 | S4 | Comment lỗi thời `mobile/src/lib/api/adapters.ts:269` ("quick-phrases vẫn 100% mock tới B7") | Xóa khi làm QA-4 |
| QA3-M08-02 | S3 | Bulk import SOS không có khóa chống trùng: import lại cùng CSV tạo bản ghi trùng | Định nghĩa khóa trùng (vd `countryCode+name+tọa độ làm tròn`) — cần người chốt tiêu chí |
| QA3-M09-02 | S3 | PATCH incident không bắt buộc `updatedAt` (client cũ không được bảo vệ ghi đè) | Bắt buộc `updatedAt` như bài luật (admin hiện đã luôn gửi) |
| ~~QA3-M09-03~~ | — | **Đã sửa ở QA-4** (QA4-M13-02, helper `openExternal`) | — |
| QA3-M12-03 | S3 | Lọc "Đã lưu" ở Explore gọi chi tiết từng bài (N+1 request) | Endpoint batch theo danh sách id — đổi contract, để sau |
| QA3-M10-02 | S4 | `translate.service.js` log nguyên văn phản hồi provider (`rawText`) khi JSON hỏng — có thể chứa nội dung người dùng dịch | Chỉ log độ dài/loại lỗi |
| QA4-M13-03 | S3 | Hầu hết màn hình lỗi không có nút "Thử lại" (INV-13.2) | Thêm nút gọi `refetch()` ở khối lỗi |
| QA4-M13-04 | S3 | Màn Dịch: danh sách mẫu câu không có loading/rỗng/lỗi; mọi lỗi dịch đều báo "kiểm tra kết nối mạng" | Hiển thị theo `phrasesQuery` và `ApiError.code` |
| QA4-M13-05 | S4 | Favorites hiện đồng thời thông báo lỗi và trạng thái rỗng | Thêm `!isError` cho khối rỗng |
| QA4-M13-06 | S3 | Settings: lỗi tải preferences --> hiện giá trị mặc định như dữ liệu thật, không báo lỗi | Khóa công tắc + báo lỗi khi `preferencesQuery.isError` |
| QA4-M13-07 | S3 | `queryKey ['alerts']` không gồm quốc gia/tài khoản | Thêm `countryCode`, `owner` vào key |
| QA4-M13-08 | S4 | Route `_dev/design-system` có trong bản production | Chặn khi `!__DEV__` |
| QA4-M13-09 | S3 | Font lỗi --> `useFonts` không bao giờ `loaded` --> kẹt splash | Dùng giá trị `error` của `useFonts`, vẫn render khi lỗi |
| QA4-M13-10 | S3 | Chat không có `KeyboardAvoidingView` — nghi ô nhập bị bàn phím che trên iOS | **Người xác nhận trên thiết bị** trước khi sửa |
| QA4-M14-03 | S3 | Admin Locations/Countries `limit: 100`, không phân trang | Dùng `Pagination` như FeedbackQueue |
| QA4-M15-02 | S3 | Nhiều endpoint (chat, feedback, admin CRUD B6-B8, audit, analytics, rag) chưa có fixture | Bổ sung dần, ưu tiên chat (mobile phụ thuộc) |
| QA4-M15-03 | S3 | API công khai alerts/quick-phrases/support-locations/incidents trả `createdBy`/`updatedBy` (ID admin) | Projection chung như bài luật |
| QA2-M05-04 | S4 | `memory.driver.js` đã lệch Prettier từ baseline, lần này sửa logic nhưng không format (tránh trộn commit) | Gộp vào commit format BASE-01 |
| - | S4 | `admin/ArticleEditorPage.tsx`: sau `changeStatus` thành công, refetch `article` chạy lại `setForm` --> ghi đè nội dung đang gõ chưa lưu | Kiểm ở QA-4 (INV-14.3) |
| - | S4 | CLAUDE.md Phần 9 nhắc `npm run reindex` nhưng `backend/package.json` không có script này | Sửa tài liệu hoặc thêm script |

---

## 5. PHỤ LỤC

**BASE-01 — 28 file lệch Prettier (bỏ qua khác biệt CRLF):**
`src/controllers/{favorites,incidentProgress,trips}.controller.js`, `src/models/{ChatMessage,LegalChunk,Trip}.js`,
`src/rag/search/{index,memory.driver}.js`, `src/routes/{admin,chat,public}.routes.js`,
`src/services/{analytics,auth,feedback,publicContent,quickPhrase,translate,trip}.service.js`,
`src/validators/translate.validator.js`, `test/{contracts,feedback,golden,profile,publicContent,rbac.sweep,supportLocation,translate,trips}.test.js`.
(`scripts/` không nằm trong `format:check`; `scripts/seed-content.js` cũng lệch từ trước.)

**Kết quả sau sửa (QA-1):**

| Workspace | Lint | Type | Test | Build |
|---|---|---|---|---|
| backend | [v] | n/a | **174/174** (151 + 23 mới) · golden 26/26 | n/a |
| mobile | [v] | [v] | **95/95** (21 suite) | không đổi mã runtime |
| admin | [v] | [v] | 9/9 | [v] |

**Kết quả sau sửa (QA-2):**

| Workspace | Lint | Type | Test | Build |
|---|---|---|---|---|
| backend | [v] | n/a | **198/198** (174 + 24 mới) · golden 26/26 | n/a |
| mobile | [v] | [v] | **99/99** (23 suite) | — |
| admin | [v] | [v] | 9/9 | [v] |

**Kết quả sau sửa (QA-3):**

| Workspace | Lint | Type | Test | Build |
|---|---|---|---|---|
| backend | [v] | n/a | **211/211** + 1 `todo` (H-09.a, nợ đã biết) · golden 26/26 | n/a |
| mobile | [v] | [v] | **102/102** (25 suite) | — |
| admin | [v] | [v] | 9/9 | [v] |

**Kết quả sau sửa (QA-4):**

| Workspace | Lint | Type | Test | Build |
|---|---|---|---|---|
| backend | [v] | n/a | **214/214** + 1 `todo` · golden 26/26 | n/a |
| mobile | [v] | [v] | **111/111** (28 suite) | — |
| admin | [v] | [v] | **11/11** | [v] |

---

## 6. CHẤM MỤC TIÊU G1-G12 (sau QA-3)

| # | Chấm | Ghi chú |
|---|---|---|
| G1 | Đạt một phần | Bài luật (list/detail/search/đếm/RAG/favorites), incidents, alerts đều có test chặn trạng thái ẩn. QuickPhrase không có bản nháp. **Chưa đạt ở SOS**: API trả điểm `verified:false` — QA-D13 chờ người chốt |
| G2 | **Đạt** (có điều kiện) | Golden 26/26; guard chặn marker bịa + 9 dạng định lượng; spy LLM = 0 khi dưới ngưỡng; lỗi provider --> fallback. Mutation 1 và 3 từng sống sót --> đã thêm test. Điều kiện: QA2-M06-04 (câu hỏi nhắc nước khác bằng tên ngắn vẫn được trả lời bằng luật KR) cần chốt |
| G3 | **Đạt** | Sweep RBAC + test mới cho token xấu, khóa/hạ quyền, refresh xoay vòng/ân hạn/reuse/đồng thời |
| G4 | **Đạt** | Chat (5 thao tác), trips (xem/sửa/xóa/đặt current), favorites (xóa/list), progress (theo user), preferences (chỉ của mình) — đều có test |
| G5 | Đạt một phần | Mọi fixture hiện có được backend + ít nhất một client đối chiếu (QA-4); đã sửa 2 lệch thật (`rotated`, fixture admin). Còn nhiều endpoint chưa có fixture (QA4-M15-02) |
| G6 | **Đạt** | Chat: quota user + global nguyên tử (test đồng thời), không trừ khi validate lỗi, cache không trả bằng chứng cũ. Dịch: rate limit + giới hạn độ dài cả `text`/`from`/`to` (QA3-M10-01); không quota DB — quyết định B7 có ghi lý do |
| G7 | Đạt một phần | Backend không log/lưu tọa độ (không có logger request); `usePollAlerts` chỉ đọc GPS khi có consent + quyền, không chạy nền, last-known ≤5 phút (có test). Còn kiểm màn hình xin quyền ở QA-4 và trên thiết bị thật |
| G8 | Đạt một phần | Optimistic concurrency bài luật + incident có test; toàn vẹn tham chiếu Country/Topic đã sửa; dữ liệu local theo tài khoản có test. Còn: QA-M04-03 (phụ thuộc index), QA3-M09-01 (tick sai bước khi đổi thứ tự) |
| G9 | Đạt một phần | Có ErrorBoundary cấp route (QA-4), SOS không còn màn trắng khi offline (QA-3), refresh lỗi mạng không đăng xuất, không vòng lặp refresh. Thiếu nút "Thử lại" ở phần lớn màn lỗi (QA4-M13-03); font lỗi có thể kẹt splash (QA4-M13-09) |
| G10 | Đạt một phần | Build admin + export iOS/Android đạt; khởi động với `.env.example` ở QA-5 |
| G11 | Đạt một phần | Đã gỡ PII/mật khẩu khỏi tài liệu hiện hành; còn lịch sử git + host trong `04_Repo_Audit.md` |
| G12 | Đạt một phần | lint/typecheck sạch 3 workspace; còn format backend (BASE-01) và emoji (QA-D30) |

---

## 7. VIỆC NGƯỜI PHẢI LÀM

1. **[S0] Đổi ngay mật khẩu tài khoản admin đã seed trên Atlas** — mật khẩu mặc định cũ vẫn nằm trong
   lịch sử git public. Nếu `backend/.env` đang khai `SEED_ADMIN_PASSWORD` bằng giá trị cũ, đổi luôn.
2. Quyết định có rewrite lịch sử git để xóa email/mật khẩu/host cluster đã từng commit hay không
   (thao tác phá hủy, ảnh hưởng mọi clone).
3. Chốt các mục ở 4.2 (mỗi mục có phương án): QA-D13 (SOS chỉ trả điểm đã xác minh?), QA-M04-01 (đồ thị
   trạng thái), QA-M04-03 (transaction hay chấp nhận index), **QA2-M06-04 (bí danh quốc gia để chặn câu hỏi
   nước khác — ưu tiên cao, ảnh hưởng G2)**, QA2-M06-05 (bắt buộc citation cho mọi câu trả lời).
4. Xác nhận partial unique index `{countryCode, slug}` `isCurrent:true` đã tồn tại trên Atlas.
5. Bổ sung PHAN 6-12 cho `docs/07_QA_BugHunt.md` trước phiên QA-5.
6. (QA-2) Nếu từng đổi `EMBEDDING_MODEL` trên môi trường thật mà chưa re-index toàn bộ: sau bản sửa
   QA2-M06-02, chunk của model cũ không còn được dùng --> chạy "Reindex quốc gia" ở Admin A04 để AI trả lời lại được.

7. (QA-3) Chốt QA3-M08-03 (đóng gói sẵn số khẩn cấp đã xác minh cho lần mở app đầu tiên khi offline) và
   QA3-M09-01 (id ổn định cho bước incident).
8. (QA-4) Chốt QA4-M11-01 (mặc định đồng ý vị trí) và xác nhận trên iPhone thật QA4-M13-10 (bàn phím che ô chat).

## 8. PHIÊN TIẾP THEO

**QA-5: M16-M17 + Pha 3 + Pha 4 + báo cáo tổng** — đang chạy liên tục theo yêu cầu người dùng. PHAN 6-12 của 07
thiếu --> Pha 3/Pha 4 dùng kịch bản tự đề xuất (ghi rõ trong báo cáo).
