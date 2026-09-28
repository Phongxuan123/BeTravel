# QA_REPORT — Đợt QA / bug hunt Be.Travel

> Đặc tả: `docs/07_QA_BugHunt.md`. Báo cáo này cập nhật dần theo từng phiên (QA-1 --> QA-5).
> Rule 12: không emoji, chỉ dùng `[v] [X] [!] [*] --> ---`.
> Chú giải chấm INV: `[v]` có test cụ thể chứng minh · `[*]` đã đọc code, chưa có test ·
> `[X]` sai / chưa đạt · `[!]` cần người quyết định.

| Phiên | Phạm vi | Trạng thái | Ngày |
|---|---|---|---|
| QA-1 | Pha 0 + Pha 1 (D01-D40) + M01-M04 | xong | 28/09/2026 |
| QA-2 | M05-M07 | chưa làm | |
| QA-3 | M08-M12 | chưa làm | |
| QA-4 | M13-M15 | chưa làm | |
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

## 4. DANH SÁCH LỖI / NGHI VẤN

### 4.1. Đã sửa trong QA-1 (mỗi lỗi có test đỏ trước, xanh sau)

| ID | Mức | Mô tả | Sửa | Test |
|---|---|---|---|---|
| QA-D04-A | S1 | `docs/PROGRESS.md` (repo public) liệt kê 3 email tài khoản thật + mật khẩu admin mặc định | Thay bằng mô tả trung tính. **Lịch sử git vẫn còn** — rewrite history là việc của người | D04 grep sạch |
| QA-D04-B | S1 | `env.js` mặc định `SEED_ADMIN_PASSWORD="Matkhau123"`, `.env.example` ghi cùng giá trị --> mọi môi trường quên đổi đều dùng mật khẩu ai cũng biết | Bỏ giá trị mặc định (chuỗi rỗng = không khai); tách `ensureSeedAdmin` trong `seed-content.js`, thiếu mật khẩu thì bỏ qua tạo admin | `qa.core` "D04 seed khong tao admin voi mat khau mac dinh..." |
| QA-M01-01 | S3 | Mọi lỗi E11000 ngoài email/phone bị báo "Username đã được sử dụng" (trùng mã quốc gia, slug chủ đề...) | `domainErrors.js`: bảng nhãn tường minh, còn lại trả "Dữ liệu bị trùng với bản ghi đã có" | `qa.core` INV-01.5 |
| QA-M02-01 | S3 | Đăng nhập tài khoản bị khóa trả 403 "đã bị vô hiệu hóa" **trước** khi kiểm mật khẩu --> dò được tài khoản tồn tại/bị khóa, và chênh thời gian (không chạy bcrypt) | `auth.service.js#loginUser`: kiểm mật khẩu trước, chỉ báo bị khóa khi mật khẩu đúng | `qa.core` INV-02.12 |
| QA-M04-02 | S2 | Xóa Country/Topic đang có bài luật (hoặc chủ đề) tham chiếu --> bài mồ côi | `country.service`/`legalTopic.service`: kiểm tham chiếu --> 409 CONFLICT; admin `CountriesPage`/`TopicsPage` hiện lỗi xóa (trước đó mutation xóa **không có** `onError`, lỗi bị nuốt) | `qa.core` INV-04.10 |

### 4.2. Cần người quyết định (không tự sửa — CLAUDE.md Phần 8: chạm logic nghiệp vụ)

| ID | Mức | Vấn đề | Phương án |
|---|---|---|---|
| QA-D13 | S0 theo 07 / đã chốt khác ở B6 | API SOS công khai trả cả điểm `verified:false` (PROGRESS mục 45, contracts §SOS: "verified ưu tiên"). Mobile chỉ gắn huy hiệu cho điểm đã xác minh, **không** gắn nhãn "chưa xác minh". Mâu thuẫn với D13/INV-08.1 và với favorites (không cho lưu điểm chưa verified) | (A) Chỉ trả `verified:true` — an toàn nhất, nhưng hiện Atlas chưa có điểm nào verified --> bản đồ trống, chỉ còn số khẩn cấp quốc gia. (B) Giữ nguyên, thêm nhãn "Chưa xác minh" rõ ràng ở mobile + contract. (C) Mặc định verified-only, cho client xin thêm `includeUnverified=true` khi không có kết quả. **Đề xuất: A hoặc C** |
| QA-M04-01 | S2 | Không có đồ thị chuyển trạng thái bài luật; mọi chuyển đều hợp lệ | (A) Chốt đồ thị tối thiểu: `draft<->pending_review`, `pending_review-->published`, `published-->archived|draft`, cấm `superseded-->published` (khôi phục bản cũ phải qua `new-version`). (B) Giữ tự do, ghi rõ trong contract. **Đề xuất A** |
| QA-M04-03 | S2 | Tính duy nhất `isCurrent` phụ thuộc hoàn toàn vào partial unique index; publish không chạy trong transaction (siblings bị supersede trước, nếu `save()` lỗi vì lý do khác thì 0 bản hiện hành) | (A) Dùng transaction Mongo (Atlas M0 hỗ trợ replica set). (B) Chấp nhận, thêm kiểm tra khởi động `LegalArticle.syncIndexes()`/cảnh báo nếu thiếu index. **Cần người xác nhận index đã tồn tại trên Atlas** |

### 4.3. Còn tồn đọng (ghi nợ, chưa sửa)

| ID | Mức | Mô tả | Đề xuất |
|---|---|---|---|
| QA-D17 | S2 | Admin hard-code danh sách quốc gia ở `FeedbackQueuePage.tsx:82`, `RagIndexPage.tsx:14` | Lấy từ `countriesApi.list` (QA-4, M14) |
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
| QA-D25 | S3 | 11 màn hình `import type` từ `@/mocks/schemas` | Re-export type qua `@/lib/data` (QA-4) |
| QA-D30 | S3 | Emoji: `README.md` U+2705, UI `trips/new.tsx` U+2713, U+2605 trong comment/contracts | Thay `[v]`, icon `lucide`; gom sửa QA-5 |
| QA-D03 | S3 | Host cluster thật còn trong `docs/04_Repo_Audit.md:183` và lịch sử git | Thay bằng `<cluster-host>`; lịch sử git: người quyết định |
| BASE-01/02 | S4 | Format backend (28 file) + CRLF Windows | Commit format riêng ở QA-5 |
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

---

## 6. CHẤM MỤC TIÊU G1-G12 (sau QA-1)

| # | Chấm | Ghi chú |
|---|---|---|
| G1 | Chưa kiểm được | QA-2/QA-3. [!] QA-D13 (SOS chưa verified) cần chốt |
| G2 | Chưa kiểm được | QA-2 (golden 26/26 ở baseline; mutation testing H-06.a chưa làm) |
| G3 | **Đạt** | Sweep RBAC + test mới cho token xấu, khóa/hạ quyền, refresh xoay vòng/ân hạn/reuse/đồng thời |
| G4 | Chưa kiểm được | QA-2 (chat) / QA-3 (favorites, trips, progress) |
| G5 | Chưa kiểm được | QA-4 (M15) |
| G6 | Đạt một phần | Quota nguyên tử có test đồng thời; cache/rate limit kiểm ở QA-2 |
| G7 | Chưa kiểm được | QA-3/QA-4 |
| G8 | Đạt một phần | Optimistic concurrency bài luật có test; toàn vẹn tham chiếu Country/Topic đã sửa; QA-M04-03 phụ thuộc index |
| G9 | Chưa kiểm được | QA-4 |
| G10 | Đạt một phần | Build admin + export iOS/Android đạt; khởi động với `.env.example` ở QA-5 |
| G11 | Đạt một phần | Đã gỡ PII/mật khẩu khỏi tài liệu hiện hành; còn lịch sử git + host trong `04_Repo_Audit.md` |
| G12 | Đạt một phần | lint/typecheck sạch 3 workspace; còn format backend (BASE-01) và emoji (QA-D30) |

---

## 7. VIỆC NGƯỜI PHẢI LÀM

1. **[S0] Đổi ngay mật khẩu tài khoản admin đã seed trên Atlas** — mật khẩu mặc định cũ vẫn nằm trong
   lịch sử git public. Nếu `backend/.env` đang khai `SEED_ADMIN_PASSWORD` bằng giá trị cũ, đổi luôn.
2. Quyết định có rewrite lịch sử git để xóa email/mật khẩu/host cluster đã từng commit hay không
   (thao tác phá hủy, ảnh hưởng mọi clone).
3. Chốt QA-D13 (SOS chỉ trả điểm đã xác minh?), QA-M04-01 (đồ thị trạng thái), QA-M04-03 (transaction
   hay chấp nhận index) — mỗi mục có phương án ở 4.2.
4. Xác nhận partial unique index `{countryCode, slug}` `isCurrent:true` đã tồn tại trên Atlas.
5. Bổ sung PHAN 6-12 cho `docs/07_QA_BugHunt.md` trước phiên QA-5.

## 8. PHIÊN TIẾP THEO

**QA-2: M05-M07** (public content, RAG/guard/quota/cache, chat/feedback) — lõi sản phẩm. Đủ điều kiện,
không phụ thuộc quyết định ở mục 7 (trừ QA-D13 thuộc QA-3).
