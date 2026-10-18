# QA_REPORT — Đợt QA / bug hunt Be.Travel

> Cập nhật 05/10/2026: bản vá 05/10 (PATCH_2026_10_05, đã gỡ, còn trong lịch sử git) là kết quả hiện hành. Bản vá đã giải quyết các lỗi quốc gia/bí danh, SOS chưa verified, mặc định consent, đồ thị trạng thái, transaction publish, ID bước ổn định và một số nợ kỹ thuật. Các mục bên dưới là lịch sử rà soát trước bản vá; danh sách chưa hoàn thành được tổng hợp trong báo cáo mới.


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
| QA-5 | M16-M17 + Pha 3 + Pha 4 + báo cáo tổng | xong | 28/09/2026 |

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

## 2-3. Nhật ký chi tiết Pha 1 và các module M01-M17

Nhật ký từng detector (D01-D40) và từng module QA đã gỡ ngày 19/10/2026 để gọn tài liệu; kết luận nằm ở mục 4 (danh sách lỗi), 6 (mục tiêu) và 7 (việc người phải làm). Bản đầy đủ còn trong lịch sử git.

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

**Đã sửa trong QA-5:**

| ID | Mức | Mô tả | Sửa | Test |
|---|---|---|---|---|
| QA5-E2E-01 | S2 | Zod 4 `.partial()` vẫn áp `.default([])`: PATCH incident không gửi `steps` --> **xóa sạch các bước**; PATCH geo-alert không gửi `behaviorsToAvoid` --> xóa danh sách. Admin UI hiện luôn gửi đủ nên chưa dính, nhưng mọi client/API khác thì dính | `incidentUpdateSchema`/`geoAlertUpdateSchema` khai lại 2 field không default | `qa.support` QA5-E2E; `qa.e2e` E2E-Q4 |
| QA5-M16-01 | S2 | Production chạy được với provider mock (mặc định) và JWT secret ngắn | `env.js`: `parseEnv` + ràng buộc production | `qa.config` INV-16.1 |
| QA5-M16-02 | S3 | Không test nào bắt lỗi import của `server.js` (BUG-H01) | Smoke test module + đường dẫn | `qa.config` H-16.a |
| QA5-M17-01 | S3 | Emoji còn trong README/contracts/src/UI; host cluster thật trong `04_Repo_Audit.md`; README nói sai về seed admin | Thay bằng ký hiệu Rule 12 / icon; ẩn host; sửa README | D30 grep sạch (ngoài docs 00-04) |
| BASE-01 | S4 | 28 file backend lệch Prettier | Commit **format riêng** `style(QA-5)` sau commit logic | `npm run format:check` |

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
| QA5-M16-05 | S2 (chặn phát hành) | `app.json` thiếu `ios.bundleIdentifier`, `android.package` | Người chọn định danh vĩnh viễn (vd `vn.betravel.app`) trước lần build store đầu tiên |
| QA5-CI | S2 | Không có CI chạy test khi push/PR | Đồng ý để thêm `.github/workflows/ci.yml` (lint + test + build, không secret) |
| BASE-02 | S4 | Windows `core.autocrlf=true` + Prettier `endOfLine: lf` --> `format:check` báo 147 file trên máy Windows | Thêm `.gitattributes` `* text=auto eol=lf` (đụng line ending mọi file — cần đồng ý) |
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
| ~~BASE-01~~ | — | **Đã format ở QA-5** (commit riêng). BASE-02 chuyển sang 4.2 | — |
| QA5-M16-03 | S3 | Backend không khai `engines`; `render.yaml` không đặt `SEARCH_DRIVER=atlas` | Thêm `"engines": {"node": ">=22.13"}` và biến trên Render khi index Atlas đã ACTIVE |
| QA5-M16-04 | S3 | `server.js` không xử lý SIGTERM (đóng kết nối, dừng worker) | `process.on('SIGTERM', ...)` gọi `stopJobWorker` + `mongoose.disconnect` |
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

## 6. CHẤM MỤC TIÊU G1-G12 (cuối đợt)

| # | Chấm | Ghi chú |
|---|---|---|
| G1 | Đạt một phần | Bài luật (list/detail/search/đếm/RAG/favorites), incidents, alerts đều có test chặn trạng thái ẩn. QuickPhrase không có bản nháp. **Chưa đạt ở SOS**: API trả điểm `verified:false` — QA-D13 chờ người chốt |
| G2 | **Đạt** (có điều kiện) | Golden 26/26; guard chặn marker bịa + 9 dạng định lượng; spy LLM = 0 khi dưới ngưỡng; lỗi provider --> fallback. Mutation 1 và 3 từng sống sót --> đã thêm test. Điều kiện: QA2-M06-04 (câu hỏi nhắc nước khác bằng tên ngắn vẫn được trả lời bằng luật KR) cần chốt |
| G3 | **Đạt** | Sweep RBAC + test mới cho token xấu, khóa/hạ quyền, refresh xoay vòng/ân hạn/reuse/đồng thời |
| G4 | **Đạt** | Chat (5 thao tác), trips (xem/sửa/xóa/đặt current), favorites (xóa/list), progress (theo user), preferences (chỉ của mình) — đều có test |
| G5 | Đạt một phần | Mọi fixture hiện có được backend + ít nhất một client đối chiếu (QA-4); đã sửa 2 lệch thật (`rotated`, fixture admin). Còn nhiều endpoint chưa có fixture (QA4-M15-02) |
| G6 | **Đạt** | Chat: quota user + global nguyên tử (test đồng thời), không trừ khi validate lỗi, cache không trả bằng chứng cũ. Dịch: rate limit + giới hạn độ dài cả `text`/`from`/`to` (QA3-M10-01); không quota DB — quyết định B7 có ghi lý do |
| G7 | Đạt một phần | Backend không log/lưu tọa độ; `usePollAlerts` chỉ đọc GPS khi có consent + quyền, không chạy nền, last-known ≤5 phút (có test); lời xin quyền đúng sự thật. [!] `locationConsent` mặc định `true` (QA4-M11-01) cần chốt; kiểm trên thiết bị thật |
| G8 | Đạt một phần | Optimistic concurrency bài luật + incident có test; toàn vẹn tham chiếu Country/Topic; PATCH không còn xóa `steps`/`behaviorsToAvoid` (QA5-E2E-01); dữ liệu local theo tài khoản có test. Còn: QA-M04-03 (phụ thuộc index), QA3-M09-01 (tick sai bước khi đổi thứ tự) |
| G9 | Đạt một phần | ErrorBoundary cấp route, SOS không trắng khi offline, gọi điện/link không crash, refresh lỗi mạng không đăng xuất, không vòng lặp refresh. Thiếu nút "Thử lại" ở phần lớn màn lỗi (QA4-M13-03); font lỗi có thể kẹt splash (QA4-M13-09) |
| G10 | Đạt một phần | Admin build + Expo export iOS/Android đạt (QA-5); production fail fast khi thiếu cấu hình AI (QA5-M16-01); `render.yaml` khớp script. **Chưa đạt để phát hành store**: thiếu `bundleIdentifier`/`package` (QA5-M16-05); triển khai thật chưa kiểm được |
| G11 | Đạt một phần | Tài liệu hiện hành sạch PII/mật khẩu/host thật (QA-1, QA-5). Còn lịch sử git (người quyết định) |
| G12 | **Đạt** | lint/typecheck sạch 3 workspace, backend `format:check` sạch sau commit format, không emoji trong mã nguồn/README/contracts, không import `@/mocks` ở màn hình, không hard-code quốc gia ở admin |

Tóm tắt: **Đạt 5** (G2 có điều kiện, G3, G4, G6, G12) · **Đạt một phần 7** (G1, G5, G7, G8, G9, G10, G11) · Không đạt 0.

---

## 7. TỔNG HỢP CUỐI ĐỢT — VIỆC NGƯỜI PHẢI LÀM (một danh sách duy nhất, theo ưu tiên)

### Ưu tiên 1 — làm ngay (bảo mật)

1. **Đổi mật khẩu tài khoản admin đã seed trên Atlas** (INV-17.4, S0). Mật khẩu mặc định cũ vẫn nằm trong lịch sử
   git public. Nếu `backend/.env` còn khai `SEED_ADMIN_PASSWORD` bằng giá trị cũ, đổi luôn.
2. **Quyết định rewrite lịch sử git** để xóa email thật, mật khẩu mặc định, host cluster đã từng commit (thao tác
   phá hủy, ảnh hưởng mọi bản clone — tôi không tự làm).

### Ưu tiên 2 — quyết định nghiệp vụ ảnh hưởng an toàn/độ tin cậy (mỗi mục có phương án ở 4.2)

3. **QA2-M06-04** — bí danh quốc gia: "Ở Nhật..."/"Tokyo"/"Japan" hiện vẫn được trả lời bằng **luật Hàn Quốc**.
4. **QA-D13** — SOS có chỉ trả điểm đã xác minh không (hiện trả cả điểm chưa xác minh, không gắn nhãn).
5. **QA3-M08-03** — đóng gói sẵn số khẩn cấp đã xác minh cho lần đầu mở app khi offline (cần người xác minh từng số).
6. **QA4-M11-01** — `locationConsent` mặc định `true` hay `false`.
7. **QA-M04-01** — đồ thị trạng thái bài luật ở backend (đề xuất: áp đúng đồ thị mà Admin UI `StatusBar` đang dùng).
8. **QA3-M09-01** — id ổn định cho bước incident (tick hiện gắn sai bước khi admin đổi thứ tự — đã tái hiện).
9. **QA2-M06-05** — có bắt buộc ≥1 trích dẫn cho mọi câu trả lời AI không.
10. **QA-M04-03** — publish dùng transaction hay chấp nhận dựa vào index; **xác nhận partial unique index
    `{countryCode, slug}` (`isCurrent:true`) đã tồn tại trên Atlas**.

### Ưu tiên 3 — trước khi phát hành

11. **QA5-M16-05** — chọn `ios.bundleIdentifier` / `android.package` (định danh vĩnh viễn trên store).
12. Điền placeholder: `EXPO_PUBLIC_API_URL` trong `mobile/eas.json`, Android Maps key trong `mobile/app.json`
    (đặt quota cap cho key), secret `BACKEND_HEALTH_URL` cho workflow keepalive, biến môi trường trên Render
    (production giờ **bắt buộc** `LLM_PROVIDER`/`EMBEDDING_PROVIDER` khác `mock` + API key + JWT secret ≥32 ký tự).
13. Nếu từng đổi `EMBEDDING_MODEL` trên môi trường thật mà chưa re-index toàn bộ: chạy "Reindex quốc gia" ở
    Admin (sau QA2-M06-02, chunk của model cũ không còn được dùng làm bằng chứng).
14. Kiểm trên **thiết bị thật**: bàn phím che ô chat trên iPhone (QA4-M13-10), bản đồ Android, gọi điện, GPS/từ chối
    quyền, chữ tràn màn 375px, splash khi lỗi font.

### Ưu tiên 4 — đồng ý để tôi làm tiếp (không phá dữ liệu)

15. Thêm CI `.github/workflows/ci.yml` (QA5-CI) · thêm `.gitattributes` LF (BASE-02) · tách lịch sử
    `PROGRESS.md` (INV-17.6) · chốt tiêu chí chống trùng khi import CSV SOS (QA3-M08-02).
16. Bổ sung PHAN 6-12 cho `docs/07_QA_BugHunt.md` nếu muốn chạy lại Pha 3/4 đúng đặc tả gốc.

Các mục S3/S4 còn lại ở 4.3 là nợ kỹ thuật có thể làm dần, không cần quyết định.

## 8. KẾT THÚC ĐỢT

Đợt QA-1..QA-5 hoàn tất trên nhánh `feature/qa-20260928` (mỗi phiên một lần push). Chưa merge `main`.
Tổng cộng **30 mục đã sửa** (QA-1: 5 · QA-2: 10 · QA-3: 4 · QA-4: 6 · QA-5: 5 kể cả commit format BASE-01),
trong đó **6 lỗi mức S1** (QA-1: 2 · QA-2: 3 · QA-3: 1); mọi lỗi mã nguồn đều có test tái hiện đỏ trước khi sửa.
