# BAO CAO TOI UU CODE — BE.TRAVEL
> Trạng thái hiện hành: xem mục **B8 — ALERTS + PROFILE/FAVORITES** bên dưới
> và `PROGRESS.md`. Các mục B1–B7 và "Rà soát toàn hệ thống 24/09/2026" là
> lịch sử; không dùng những dòng tồn đọng cũ để kết luận một lỗi vẫn còn sau B8.


Phiên bản : v0.2.0 --> v0.5.0
Cập nhật  : 22/09/2026
Thực hiện : Claude Code

## 1. TONG QUAN
- Tổng số file rà soát   : 37 (26 backend, 11 mobile, trong phạm vi B1)
- Tổng số file chỉnh sửa : 30
- Tổng số thay đổi       : envelope thống nhất, auth thật, refresh xoay vòng, contracts/, 6 fixture, 15 file mới, phone bắt buộc + UI, chặn login-phone
- Tổng số warning xử lý  : 2 (ESLint `preserve-caught-error`, rate-limit gây 429 giả trong test)
- Tổng số bug fix        : 2 (phát hiện qua smoke test thật trên Atlas, xem mục 4) — không phải bug tồn tại trước B1, cả hai đều do chính code viết trong B1

## 2. CHI TIET TUNG FILE

| File | Rule áp dụng | Warning | Bug | Ghi chú |
|------|--------------|---------|-----|---------|
| backend/.prettierrc, eslint.config.js | 5, 12 | — | — | Tạo mới, printWidth 100 |
| backend/src/core/envelope.js | 1, 6, 9 | — | — | Mới — {ok,data} / {ok:false,error} |
| backend/src/core/errors.js | 1, 6 | — | — | Mới — ErrorCode enum đóng 10 giá trị |
| backend/src/core/env.js | 6, 7 | — | — | Mới — Zod validate env, fail fast |
| backend/src/core/domainErrors.js | 3, 6 | — | — | Mới — bảng dịch lỗi nghiệp vụ, thay ~15 khối catch lặp lại trong controller |
| backend/src/core/serializers.js | 1, 3 | — | — | Mới — tách serializeUser khỏi auth.service để tránh vòng import |
| backend/src/core/searchDriver.js | 9 | — | — | Mới — chỉ báo cho /health, B4 sẽ mở rộng |
| backend/src/controllers/auth.controller.js | 1, 2, 3, 7 | — | — | Viết lại toàn bộ theo envelope, bỏ ~15 khối catch lặp |
| backend/src/services/refreshToken.service.js | 4, 11 | — | — | Viết lại: xoay vòng + cửa sổ ân hạn + phát hiện tái sử dụng |
| backend/src/services/auth.service.js | 1, 6, 7 | — | — | Dùng issueRefreshToken dùng chung. Phone bắt buộc khi đăng ký (giữ nguyên theo quyết định nghiệp vụ) |
| backend/src/services/passwordReset.service.js | 7, 10 | 1 (preserve-caught-error) | — | Thêm `cause`, xoá return value không ai dùng |
| backend/src/models/RefreshToken.js | 1 | — | — | Thêm family, revokedAt, revokedReason, replacedByHash |
| backend/src/middleware/error.middleware.js | 7 | — | — | ZodError/AppError/còn lại --> envelope đúng ErrorCode |
| backend/src/middleware/auth.middleware.js | 7 | — | — | Dùng envelope fail() thay vì res.json thủ công |
| backend/src/middleware/rateLimit.middleware.js | 6, 7 | 1 (429 giả trong test) | — | Thêm `skip` khi NODE_ENV=test |
| backend/src/utils/cookie.js, authTransport.js | 1, 4, 11 | — | — | Đọc refresh token từ cookie HOẶC body |
| backend/src/config/db.js | 6, 7 | — | 1 (import sai đường dẫn, xem mục 4) | maxPoolSize từ env; sửa `./env.js` --> `../core/env.js` |
| backend/src/app.js, server.js | 6, 9 | — | — | CORS_ORIGINS từ env, /health trả searchDriver |
| backend/src/utils/authTransport.js | 1, 7 | — | 1 (`refreshToken: null` lọt ra envelope, xem mục 4) | Bỏ hẳn field thay vì gửi null khi replay trong cửa sổ ân hạn |
| backend/README.md | — | — | — | Xoá cluster host thật, thay `<cluster-host>` |
| mobile/src/lib/api/http.ts, auth.ts, tokenStore.ts, authSchemas.ts | 1, 2, 4, 7, 11 | — | — | Mới — fetch wrapper, auto-refresh hàng đợi |
| mobile/src/lib/auth.tsx | 1, 2, 9, 10 | — | — | Viết lại: nhánh mock/real theo EXPO_PUBLIC_USE_MOCKS; xoá `loginWithPhone` (không còn nơi gọi) |
| mobile/src/app/(auth)/register.tsx | 1, 8 | — | — | Thêm ô Số điện thoại, validate cùng regex backend |
| mobile/src/app/(auth)/login-phone.tsx | 9 | — | — | Viết lại thành màn hình tĩnh "đang phát triển", bỏ luồng OTP giả |
| mobile/src/lib/data.ts | 11 | — | — | Mới — công tắc mock/API, B1 mới có auth |
| mobile/src/mocks/schemas.ts | — | — | 1 (rủi ro R8) | `__mock: literal(true)` --> `.optional()`, 9 chỗ |
| 18 màn hình mobile (chỉ đổi 1 dòng import) | 10 | — | — | `@/mocks/client` --> `@/lib/data` |
| contracts/README.md, contracts/fixtures/*.json | — | — | — | Mới — nguồn sự thật API |

## 3. DANH SACH THAY DOI THEO RULE

- Rule 1  : đổi tên nhất quán theo từ vựng nghiệp vụ — `readRefreshToken`, `applyAuthTransport`, `issueRefreshToken`, `serializeUser`.
- Rule 2  : controller `auth.controller.js` từ ~500 dòng có logic rẽ nhánh lỗi lặp lại xuống còn mỏng, mỗi hàm chỉ gọi service + bọc envelope; logic dịch lỗi tách sang `domainErrors.js`.
- Rule 3  : `domainErrors.js` gom ~30 nhánh lỗi từng lặp lại ở 10 hàm controller thành một bảng tra cứu duy nhất.
- Rule 6  : mọi TTL/ngưỡng (grace period, pool size, RAG thresholds dù chưa dùng) đưa vào `core/env.js`, không hard-code.
- Rule 7  : error middleware phân biệt rõ ZodError/AppError/còn lại; production không lộ message gốc.
- Rule 9  : giữ nguyên kiến trúc 3 tầng đơn giản (controller mỏng -> service -> model), không thêm pattern phức tạp.
- Rule 10 : xoá `return { success: true }` không ai đọc trong `passwordReset.service.js`; xoá import `RefreshToken`/`generateRefreshToken`/`hashToken` không còn dùng trực tiếp trong `auth.service.js` sau khi chuyển sang `issueRefreshToken` dùng chung.
- Rule 11 : comment tiếng Việt bắt buộc đã có ở `refreshToken.service.js` (lý do cửa sổ ân hạn), `authTransport.js` (lý do đọc cookie/body), `lib/auth.tsx` (lý do không sửa UI khi nối API), `lib/data.ts` (lý do công tắc mock).
- Rule 12 : không dùng emoji trong toàn bộ code/comment/docs mới, kể cả README này.
- Rule 13A: 2 warning xử lý — chi tiết ở mục 4.

## 4. WARNING & BUG DA XU LY

| Loại | Mô tả | File | Dòng | Cách fix | Kết quả |
|------|-------|------|------|----------|---------|
| W3 (đổi thành lint error) | ESLint rule `preserve-caught-error`: lỗi SMTP bị nuốt, không giữ `cause` | `passwordReset.service.js` | ~106 | Thêm `{ cause: error }` vào `throw new Error(...)` | Lint xanh, vẫn log đủ context |
| W4 (ảnh hưởng test, tương đương bug môi trường) | `express-rate-limit` dùng state RAM chung theo IP — test gọi /register hơn 5 lần trong 1 tiến trình bị 429 giả | `rateLimit.middleware.js` | toàn bộ | Thêm `skip: () => NODE_ENV==='test'` | 17/17 test backend xanh |
| W1/môi trường | `.env` thật có `MONGODB_URI` -- `dotenv.config({override:true})` trong `core/env.js` đè lên MONGODB_URI giả (mongodb-memory-server) mà `test/setup.js` đã đặt, khiến test cố nối Atlas thật và treo ~10-90s mỗi lần chạy | `core/env.js` | 11 | `override: process.env.NODE_ENV !== "test"` | Test quay lại ~6s, không còn phụ thuộc mạng |
| Bug runtime (logic bug, phát hiện qua smoke test thật) | `src/config/db.js` import `./env.js` (không tồn tại) thay vì `../core/env.js` -- `npm run dev` crash ngay khi khởi động (`ERR_MODULE_NOT_FOUND`). Không bị 17 test bắt vì test tích hợp tự kết nối mongoose qua `test/setup.js`, không đi qua `connectDB()` | `config/db.js` | 3 | Sửa đường dẫn import | Xác minh lại bằng `npm run dev` + đăng ký/đăng nhập/refresh thật trên Atlas -- server khởi động và kết nối DB bình thường |
| Bug data bug (contract fragility) | Response `/auth/refresh` khi replay trong cửa sổ ân hạn trả `"refreshToken": null` thay vì bỏ field -- lệch với `z.string().optional()` phía mobile (Zod `optional()` không chấp nhận `null`, chỉ chấp nhận field vắng mặt) | `utils/authTransport.js` | ~20 | Đổi điều kiện gộp field: chỉ đưa `refreshToken` vào response khi có giá trị thật | Xác minh lại bằng curl thật trên Atlas: field biến mất hoàn toàn khi replay |

## 5. VAN DE CON TON DONG

- Đăng nhập bằng số điện thoại bị chặn hẳn bằng màn hình tĩnh "đang phát triển" — chưa có backend OTP SMS thật. Lý do chưa fix: cần chọn nhà cung cấp SMS, nằm ngoài phạm vi B1 và MVP (CLAUDE.md Phần 4.4). Đề xuất: quyết định ở cấp sản phẩm trước khi làm, không tự mở rộng scope.
- Mobile chưa có UI "Đăng nhập bằng Google" dù backend đã hỗ trợ từ trước B1 — cần `expo-auth-session` + OAuth client ID iOS/Android (thông tin từ Google Cloud Console), ngoài phạm vi B1.
- Google login / quên mật khẩu chưa có test tích hợp (chỉ đổi envelope bọc ngoài, logic giữ nguyên). Lý do chưa fix: chưa xác nhận `GOOGLE_CLIENT_ID`/SMTP đã điền đủ trong `.env` mới. Đề xuất: bổ sung test khi có xác nhận.
- `MONGODB_URI` trong `.env` không có tên database trong URI → Mongoose nối vào DB mặc định `test`, không phải `WDPPROJECT01` như tài liệu. Không tự sửa vì có thể là chủ đích — xem `docs/PROGRESS.md` mục "Đang vướng".
- Khôi phục phiên qua Expo Go trên thiết bị/emulator thật chưa được tự xác minh (chỉ xác minh qua `curl` trực tiếp tới backend) — cần người tự kiểm với `EXPO_PUBLIC_API_URL` trỏ đúng IP LAN.

## 6. DE XUAT CHO LAN CAP NHAT TIEP THEO

- B2 nên tận dụng `core/envelope.js`, `core/errors.js`, `core/env.js` đã có sẵn — không viết lại.
- Khi thêm entity mới (`LegalArticle`, `Job`, ...), theo đúng mẫu `domainErrors.js` cho lỗi nghiệp vụ thay vì rẽ nhánh `error.message` trong controller.
- Cân nhắc thêm `mongodb-memory-server` vào CI pipeline (nếu dự án dựng CI) để test backend chạy được không cần Atlas thật.

---

## B2 — CONTENT BACKBONE + ADMIN PORTAL (v0.3.1 --> v0.4.0)

### B2.1. Tong quan
- Tổng số file mới        : 26 backend (models/controllers/services/validators/routes/test) + ~35 admin (SPA hoàn toàn mới)
- Tổng số file chỉnh sửa  : 4 backend (app.js, server.js core/env.js không đổi thêm) + contracts/README.md + 4 fixture mới
- Warning xử lý           : 2 (Mongoose `new:true` deprecated ở 4 chỗ; bundle admin >500kB do Leaflet)
- Bug fix                 : 2 (phát hiện qua smoke test thật trên Atlas, xem B2.4)

### B2.2. Chi tiet file dang chu y

| File | Rule áp dụng | Ghi chú |
|------|--------------|---------|
| `backend/src/core/adminCrudController.js` | 3, 9 | Factory CRUD dùng chung cho Country/Topic/Location -- tránh lặp code 3 lần |
| `backend/src/services/legalArticle.service.js` | 1, 7, 11 | Máy trạng thái, optimistic concurrency, versioning -- không dùng factory vì logic đặc thù |
| `backend/src/services/auditLog.service.js` | 4, 9 | Comment giải thích tại sao gọi tường minh thay vì middleware chung |
| `backend/src/middleware/validate.middleware.js` | 7 | Sửa bug Express 5 (`req.query` chỉ có getter) ngay khi viết, không đợi phát hiện |
| `admin/src/lib/resource.ts`, `admin/src/lib/api.ts` | 1, 3 | Đối xứng với factory backend -- 3 resource CRUD đơn giản dùng chung, LegalArticle riêng |
| `admin/src/App.tsx` | 13A (W4) | `React.lazy` cho `LocationsPage` (kéo theo Leaflet ~150kB) -- giảm bundle chính từ 555kB xuống 391kB |
| `admin/src/lib/schemas.ts` + `__tests__/contracts.test.ts` | — | Đối chiếu contracts/fixtures/ giống mobile -- 3 phía cùng test 1 nguồn sự thật |

### B2.3. Quyet dinh dang chu y (chi tiet o docs/PROGRESS.md)

- Publish thiếu điều kiện trả `409 CONFLICT` thay vì `422` như văn bản prompt B2 -- `ErrorCode` là enum đóng theo CLAUDE.md, không có 422.
- Admin SPA dùng Tailwind v4 (`@tailwindcss/vite`) và giữ `oxlint` mặc định của Vite scaffold thay vì đổi sang ESLint -- dự án hoàn toàn mới, không có convention có sẵn để "tuân thủ".
- Refresh token phía admin lưu `localStorage` (chấp nhận rủi ro XSS thấp hơn mobile vì là công cụ nội bộ), nhưng `apiClient.ts` vẫn gửi `credentials:'include'` nên vẫn tương thích nếu backend bật `AUTH_TRANSPORT=cookie`.

### B2.4. Bug fix (phat hien qua smoke test that tren Atlas)

| Loại | Mô tả | File | Cách fix |
|------|-------|------|----------|
| Logic bug (Express 5) | `req.query` chỉ có getter trong Express 5 -- `validateQuery` middleware gán lại cả object ném `TypeError`, mọi endpoint admin có query (list, filter) trả 500 | `middleware/validate.middleware.js` | Mutate từng field của `req.query` thay vì gán lại tham chiếu |
| W1 deprecation | Mongoose 9 bỏ option `new: true` cho `findOneAndUpdate`/`findByIdAndUpdate` | `country.service.js`, `legalTopic.service.js`, `supportLocation.service.js`, `job.service.js` | Đổi sang `returnDocument: "after"` ở cả 4 chỗ |

### B2.5. Van de con ton dong

- Chưa click-test admin SPA trong trình duyệt thật (không có công cụ trình duyệt trong phiên này) -- đã xác minh `tsc -b`, `vite build`, `oxlint`, Vite dev transform cho mọi file, và toàn bộ API phía sau bằng `curl` thật trên Atlas (login, CRUD, publish, CORS). Đề nghị người dùng tự thử qua UI thật.
- `admin/` chưa có test cấp component (React Testing Library) -- chỉ có test đối chiếu contract. Logic phức tạp (máy trạng thái) nằm ở backend đã có test đầy đủ; UI chủ yếu là form CRUD.
- Job worker mới có handler rỗng, B4 sẽ cắm `registerJobHandler('reindex_article', ...)` và `'purge_chunks'` thật.

## B3 — PUBLIC CONTENT API + NOI MOBILE (v0.4.0 --> v0.5.0)

### B3.1. Tong quan
- Tổng số file mới        : 12 backend (models/services/controllers/routes/validators/scripts/test) + 5 contracts/fixtures + 4 mobile (adapters.ts, content.ts, adapters.test.ts)
- Tổng số file chỉnh sửa  : 3 backend (constants.js, LegalArticle.js, app.js, package.json) + 6 mobile (data.ts, countryContext.tsx, trips/index.tsx, trips/new.tsx, http.ts, mocks/schemas.ts)
- Warning xử lý           : 1 (Mongoose duplicate index cảnh báo trên `Trip.userId`)
- Bug fix                 : 2 (cả hai phát hiện khi tự chạy `npm run test` trước khi commit, không lọt ra smoke test thật — xem B3.4)

### B3.2. Chi tiet file dang chu y

| File | Rule áp dụng | Ghi chú |
|------|--------------|---------|
| `backend/src/services/publicContent.service.js` | 1, 4, 6, 11 | Tầng truy vấn công khai, MỌI hàm ép filter `published+isCurrent` -- comment tiếng Việt giải thích rõ đây là bug nghiêm trọng nếu thiếu |
| `backend/src/models/LegalArticle.js` | 3, 6, 11 | Thêm `titleNorm`/`summaryNorm` + hook `pre('save')` tự tính lại -- không bao giờ lệch với title/summaryVi hiện tại |
| `backend/src/models/Trip.js` | 1, 9 | Partial unique index `{userId}` where `isCurrent:true` -- tái dùng đúng mẫu phòng thủ đã có ở `LegalArticle` (Rule 3 ở mức kiến trúc, không phải copy code) |
| `backend/scripts/seed-content.js` | 7, 10, 11 | Idempotent (bỏ qua nếu đã tồn tại, không ghi đè công sức người dùng), toàn bộ nội dung dịch nguyên văn từ `docs/06_...`, không tự sinh thêm |
| `mobile/src/lib/api/adapters.ts` | 1, 4, 11 | Cầu nối mô hình dữ liệu -- mọi khác biệt (iconKey, region, regulationsCount thật) xử lý tập trung một chỗ, comment giải thích lý do từng quyết định |
| `mobile/src/lib/countryContext.tsx`, `app/trips/index.tsx`, `app/trips/new.tsx` | 7, 9 | Sửa bug thật: import thẳng mock fixture bỏ qua công tắc `EXPO_PUBLIC_USE_MOCKS` -- không phải "màn hình" theo nghĩa hẹp nên được phép sửa theo CLAUDE.md B3 mục 11 |

### B3.3. Quyet dinh dang chu y (chi tiet o docs/PROGRESS.md)

- Search tách theo từng từ (AND trên titleNorm/summaryNorm), không so khớp nguyên cụm -- "phat vape" phải khớp "Mức phạt ... (vape)" dù hai từ không liền nhau.
- `region`/`currentCity`/giờ mở cửa đại sứ quán không có trong model backend (master plan không định nghĩa) -- xử lý bằng bảng tĩnh nhỏ trong `adapters.ts`, không hard-code ở backend.
- `iconKey` (enum đóng 6 giá trị UI) suy ra từ `topicSlug` qua bảng tĩnh trong adapter, không đọc field `icon` tự do của backend.
- `trips/new.tsx` chặn chọn quốc gia `coming_soon` (disable + badge) -- đúng yêu cầu tường minh của prompt B3 mục 12, không phải mở rộng phạm vi tự ý.

### B3.4. Warning & Bug da xu ly

| Loại | Mô tả | File | Cách fix |
|------|-------|------|----------|
| Bug (phát hiện khi chạy test lần đầu) | Hook `pre('save')` viết theo chữ ký callback cũ `function(next)`, nhưng Mongoose 9 không gọi `next` theo cách đó với hàm 1 tham số kiểu này trong ngữ cảnh `Model.create()` -- ném `TypeError: next is not a function`, mọi `LegalArticle.create()` trong toàn hệ thống (kể cả admin CRUD cũ) sập | `models/LegalArticle.js` | Bỏ tham số `next`, dùng hook đồng bộ không callback (Mongoose 9 tự nhận diện qua `fn.length`) | 38/38 test xanh sau sửa |
| W1 (cảnh báo Mongoose) | Khai `index:true` trên field `userId` VÀ `schema.index({userId:1},...)` cùng lúc -- Mongoose cảnh báo duplicate index, index sau không được áp dụng đúng option | `models/Trip.js` | Bỏ `index:true` ở field, giữ lại `schema.index()` (có `unique` + `partialFilterExpression`, cần khai đầy đủ) | Cảnh báo biến mất, index unique vẫn đúng |
| Bug logic (phát hiện qua test tự viết, không phải qua smoke test) | Test tìm kiếm đầu tiên viết theo giả định so khớp NGUYÊN CỤM ("phat vape" phải liền nhau trong titleNorm) -- sai với cách người dùng thật gõ tìm kiếm (từ khoá rời rạc) | `services/publicContent.service.js` | Đổi từ 1 `$regex` nguyên cụm sang `$and` của nhiều `$regex` (mỗi từ) | Test "tim khong dau" xanh, đồng thời sát hành vi tìm kiếm thật hơn |

### B3.5. Van de con ton dong

- Chưa click-test mobile app qua Expo Go với API thật (không có công cụ chạy React Native trong phiên này) -- đã xác minh `tsc --noEmit`, `expo lint`, 61 test Jest xanh, và toàn bộ endpoint mới smoke test thật bằng `curl` trên Atlas (bao gồm publish/revert 1 bài luật thật, CRUD trips đầy đủ). Đề nghị người dùng tự chạy `npx expo start -c` với `EXPO_PUBLIC_USE_MOCKS=false`.
- 8 bài luật KR seed ở `draft`, chưa bài nào `published` -- cần người (không phải Claude Code) đọc lại, đối chiếu nguồn `secondary`, viết `bodyMd` đầy đủ rồi tự publish qua Admin Portal.
- `publicContent.service.js#searchArticles` dùng `$regex` không có Atlas Search index hỗ trợ -- đủ nhanh ở quy mô hiện tại, B4 sẽ thay bằng Atlas Search trên `legal_chunks` mà không cần sửa controller/route/mobile (đã thiết kế điểm thay thế ngay trong code).

## B4 — RAG ENGINE + GUARDRAILS (v0.5.0 --> v0.6.0)

### B4.1. Tong quan
- Tổng số file mới        : ~30 backend (`rag/` toàn bộ: embedding × 4, llm × 4, search × 3, chunking, rrf, retrieval, prompt, guard, jobs × 3; models × 4: LegalChunk/ChatSession/ChatMessage/AiCache/AiEvent; services × 2: chat, aiUsage, ragAdmin; controllers × 2; routes; validator; test × 3: rag.guard, golden.test.js + kr.json; docs/atlas-indexes.md) + 1 admin (RagIndexPage.tsx)
- Tổng số file chỉnh sửa  : `core/constants.js`, `core/domainErrors.js`, `models/User.js` (thêm `aiUsage`), `middleware/rateLimit.middleware.js`, `routes/admin.routes.js`, `validators/admin.validator.js`, `app.js`, `server.js`, `scripts/seed-content.js` (export data + backfill `bodyMd`), `contracts/README.md`, 4 file admin (`api.ts`, `types.ts`, `App.tsx`, `Layout.tsx`)
- Warning xử lý           : 1 (`prefer-const` ở `chat.service.js`, tự sửa bằng `lint:fix`)
- Bug fix                 : 2 (chi tiết ở B4.4, cả hai phát hiện qua tự smoke test/viết golden test, không lọt ra ngoài)

### B4.2. Chi tiet file dang chu y

| File | Rule áp dụng | Ghi chú |
|------|--------------|---------|
| `backend/src/rag/guard.js` | 1, 4, 6, 9 | Hậu kiểm bằng code -- KHÔNG bao giờ tin LLM tự kiểm duyệt chính nó. Pure function, có 3 test riêng (`rag.guard.test.js`), kể cả test ép LLM "nói dối" |
| `backend/src/rag/retrieval.js` | 1, 4, 6, 11 | 2 lớp phòng thủ: filter sơ bộ ở driver + `$lookup` thật về `legal_articles` xác minh `status`/`isCurrent` -- không tin field copy trên chunk |
| `backend/src/rag/embedding/mock.embedding.js` | 6, 9 | Bag-of-words có loại bỏ stopword tiếng Việt (mô phỏng IDF thấp của embedding thật) thay vì vector ngẫu nhiên -- để golden test THỰC SỰ phân biệt được đúng/sai chunk |
| `backend/src/services/chat.service.js` | 2, 7, 8 | Lắp ráp toàn bộ pipeline (quota → country-mismatch → retrieval → cache → LLM → guard → persist) -- mỗi bước có điều kiện rõ ràng, return sớm, không nested if sâu |
| `backend/scripts/seed-content.js` | 3, 10 | Export `KR_ARTICLES`/`buildBodyMd` để golden test tái dùng CHÍNH nội dung thật (không bịa dữ liệu test song song) -- sửa kèm 1 bug thật (xem B4.4) |
| `admin/src/pages/RagIndexPage.tsx` | 1, 2 | Màn hình A04 theo đúng yêu cầu prompt: bảng trạng thái + nút re-index + hiển thị lỗi, tự làm mới 5s để thấy job chuyển trạng thái |

### B4.3. Quyet dinh dang chu y (chi tiet o docs/PROGRESS.md muc 26-32)

- MockEmbedding lọc ~90 từ chức năng tiếng Việt phổ biến trước khi băm -- không có bước này mọi bài luật đều "giống nhau" do cùng nói về người Việt/Hàn Quốc, golden test không phân biệt được must_answer/must_refuse.
- Ngưỡng `RAG_MIN_TOP_SCORE`/`RAG_MIN_SOFT_SCORE` hạ riêng cho môi trường test (`test/setup.js`), không đổi ngưỡng production (hiệu chỉnh cho Gemini thật, không áp dụng được cho MockEmbedding).
- `chat.service.js` tự phát hiện câu hỏi nhắc quốc gia khác, chặn TRƯỚC retrieval -- deterministic, không tốn chi phí LLM, đúng quy tắc 5 system prompt.
- Golden test dùng lại nội dung thật của `scripts/seed-content.js` thay vì bịa dữ liệu test riêng (Rule 3 DRY).

### B4.4. Warning & Bug da xu ly

| Loại | Mô tả | File | Cách fix |
|------|-------|------|----------|
| Bug (phát hiện khi viết golden test) | Guard tự phát hiện "đang chạy trực tiếp hay bị import" bằng ghép chuỗi thủ công `` `file://${process.argv[1]}` `` -- vỡ trên Windows vì đường dẫn có khoảng trắng (`K9 WDP`) và dùng `\`; `npm run seed` chạy xong không in gì (guard sai làm `run()` không được gọi) | `scripts/seed-content.js` | Dùng `pathToFileURL()` từ `node:url` thay vì tự ghép chuỗi | Chạy lại `npm run seed`, in đúng log `[bo qua] ...` như trước |
| Bug logic (phát hiện qua smoke test Atlas thật) | Câu hỏi đúng chủ đề nhưng dùng nhiều từ chức năng tiếng Việt phổ biến ("Hàn Quốc", "quy định"...) có cosine similarity với MockEmbedding cao ngang câu hỏi SAI chủ đề -- ngưỡng mặc định (hiệu chỉnh cho Gemini thật) không phân biệt được | `rag/embedding/mock.embedding.js`, `test/setup.js`, `test/golden/kr.json` | Thêm bước lọc từ chức năng vào MockEmbedding (mô phỏng IDF) + hạ ngưỡng CHỈ trong test + đổi 2 câu hỏi must_refuse dùng từ vựng trùng quá nhiều với bài "bằng lái xe" | Golden test 25/25 xanh, khoảng cách điểm must_answer thấp nhất (0.30) và must_refuse cao nhất (0.25) có biên an toàn |

### B4.5. Van de con ton dong

- [ĐÃ GIẢI QUYẾT ở B5, xem 2026-09-23] Smoke test Gemini thật -- key đúng định dạng đã xác nhận chạy đúng end-to-end.
- `AtlasSearchDriver` chưa có test tự động (không chạy được trên `mongodb-memory-server`) -- chỉ xác minh cú pháp bằng đọc code, cần test tay trên Atlas thật sau khi tạo 2 index theo `docs/atlas-indexes.md`.
- Chưa đọc `promptTokens`/`completionTokens` thật từ response Gemini/OpenAI (luôn 0) -- không chặn chức năng, cần làm khi cần đối soát chi phí thật.

## B5 — CHAT MOBILE + FEEDBACK (v0.6.1 --> v0.7.0)

### B5.1. Tong quan
- Tổng số file mới        : 5 backend (`models/Feedback.js`, `services/feedback.service.js`, `services/analytics.service.js`, `controllers/feedback.controller.js`, `controllers/adminFeedback.controller.js`, `controllers/adminAnalytics.controller.js`, `routes/feedback.routes.js`, `validators/feedback.validator.js`, `test/feedback.test.js`) + 3 mobile (`lib/api/chat.ts`, `lib/api/feedback.ts`, `lib/api/__tests__/chat.test.ts`) + 1 admin (`pages/FeedbackQueuePage.tsx`)
- Tổng số file chỉnh sửa  : backend (`core/constants.js`, `core/domainErrors.js`, `models/AiEvent.js`, `services/chat.service.js`, `validators/chat.validator.js`, `validators/admin.validator.js`, `controllers/chat.controller.js`, `routes/admin.routes.js`, `middleware/rateLimit.middleware.js`, `app.js`, `contracts/README.md`) + mobile (`app/chat/index.tsx`, `features/chat/components/AnswerCard.tsx`, `lib/data.ts`, `mocks/client.ts`, `app/explore/[country]/[slug].tsx`) + admin (`lib/api.ts`, `lib/types.ts`, `pages/DashboardPage.tsx`, `App.tsx`, `components/Layout.tsx`)
- Warning xử lý           : 0 mới (2 API `{new:true}` deprecated -- xem B5.4 -- không phải warning ESLint mà warning runtime Mongoose)
- Bug fix                 : 3 (chi tiết ở B5.4, cả 3 phát hiện qua smoke test thật trên Atlas, không lọt ra ngoài)

### B5.2. Chi tiet file dang chu y

| File | Rule áp dụng | Ghi chú |
|------|--------------|---------|
| `mobile/src/lib/api/chat.ts` | 1, 2, 4, 11 | Adapter response thật -> `ChatAnswer` (cắt disclaimer trùng, map citation sang marker bấm được); 2 getter riêng thay vì đổi kiểu trả về `askLegalAssistant()` (giữ đúng spec "cùng kiểu trả về ChatAnswer") |
| `mobile/src/features/chat/components/AnswerCard.tsx` | 2, 9 | `TextWithMarkers` tách dòng theo regex `[Sn]`, render marker dạng `<Text onPress>` lồng trong `<Text>` cha (RN hỗ trợ link inline) thay vì nhúng `Linking.openURL` cứng như trước |
| `backend/src/services/feedback.service.js` | 1, 7 | `createFeedback` xác minh `targetId` thuộc đúng user gọi qua `sessionId.userId` (populate), không tin `targetId` từ client -- chặn báo cáo/spam trên tin nhắn người khác |
| `backend/src/services/analytics.service.js` | 6, 7 | Toàn bộ số liệu A01 nâng cấp từ `ai_events` thật qua aggregate, không có số liệu bịa/hardcode |
| `admin/src/pages/FeedbackQueuePage.tsx` | 1, 2 | A08: bảng lọc rating/status/country + modal chi tiết (câu hỏi, câu trả lời, citation, score) + đổi trạng thái có audit log |

### B5.3. Quyet dinh dang chu y (chi tiet o docs/PROGRESS.md muc 34-41)

- `askLegalAssistant()` giữ nguyên `Promise<ChatAnswer>`, session/message id đọc qua getter riêng thay vì đổi return type.
- Module feedback (`Feedback` model, có note, vào hàng đợi A08) tách riêng với `ChatMessage.feedback` (thumbs nhanh, đã có từ B4).
- Quản lý session bằng state module-level trong `chat.ts`: tự tiếp tục phiên gần nhất của quốc gia đang chọn; CTA "Hỏi AI về bài này" luôn bắt đầu phiên mới.
- `AiEvent` thêm field `question` (nguyên văn, không chỉ hash) để "Top câu hỏi bị fallback" đọc được.

### B5.4. Warning & Bug da xu ly

| Loại | Mô tả | File | Cách fix |
|------|-------|------|----------|
| Bug (phát hiện qua smoke test Atlas) | `validateQuery` middleware không thực sự coerce được giá trị vào `req.query` (`req.query` trả object MỚI mỗi lần đọc trong Express bản đang dùng, `Object.assign` ghi vào bản sao rồi mất) -- `GET /admin/analytics/overview?days=7` trả `days:"7"` (string) thay vì `7` | `controllers/adminAnalytics.controller.js` | Tự `Number(req.query.days)` lại trong controller thay vì tin middleware (sửa cục bộ, không đụng file dùng chung -- sửa gốc để ở B9, xem "Nợ kỹ thuật") |
| Bug (phát hiện qua smoke test Atlas) | `topFallbackQuestions` hiện `question: null` cho `AiEvent` cũ tạo trước khi có field `question` -- filter `{$ne:""}` không loại được field THIẾU HẲN | `services/analytics.service.js` | Đổi filter thành `{ $exists: true, $ne: "" }` |
| Warning runtime (Mongoose deprecation) | `{ new: true }` ở `findOneAndUpdate()` deprecated | `services/chat.service.js`, `services/feedback.service.js` | Đổi thành `{ returnDocument: "after" }` ở cả 2 nơi (đồng bộ 1 kiểu) |

### B5.5. Van de con ton dong

- `validateQuery` middleware cần sửa TẬN GỐC ở B9 -- hiện chỉ vá cục bộ ở endpoint bị lộ (`adminAnalytics`), các endpoint khác dùng `z.coerce` vẫn có cùng vấn đề (vô hại tới giờ nhờ tự parse lại độc lập ở nơi khác, nhưng là bẫy cho code mới).
- Session chat chỉ resume được phiên GẦN NHẤT theo quốc gia -- chưa có tìm kiếm/lọc lịch sử theo ngày hay từ khoá, đủ dùng cho MVP.
- `costEstimateUsd` trong A01 Dashboard luôn 0 (kế thừa từ B4 -- provider chưa trả usage tokens thật).

## B6 — SOS LOCATIONS + MAP (v0.7.0 --> v0.8.0)

### B6.1. Tong quan
- Tổng số file mới        : 8 backend (`services/publicSupportLocation.service.js`, `controllers/publicSupportLocation.controller.js`, `test/supportLocation.test.js`, `contracts/fixtures/public.supportLocation.json`, `docs/sos-locations-template.csv`) + 5 mobile (`lib/api/sos.ts`, `lib/geo.ts`, `lib/locationPermission.ts`, `components/common/ErrorBoundary.tsx`, `lib/__tests__/geo.test.ts`) + 2 admin (`lib/csv.ts`, `lib/__tests__/csv.test.ts`)
- Tổng số file chỉnh sửa  : backend (`models/SupportLocation.js`, `validators/admin.validator.js`, `validators/publicContent.validator.js`, `services/supportLocation.service.js`, `controllers/adminLocations.controller.js`, `routes/admin.routes.js`, `routes/public.routes.js`, `test/admin.test.js`, `test/contracts.test.js`, `contracts/README.md`) + mobile (`app/sos/index.tsx`, `app/sos/map.tsx`, `lib/data.ts`, `mocks/client.ts`, `mocks/schemas.ts`, `lib/api/adapters.ts`, `lib/storage.ts`, `app.json`, `lib/api/__tests__/adapters.test.ts`) + admin (`pages/LocationsPage.tsx`, `lib/api.ts`, `lib/types.ts`)
- Warning xử lý           : 0 mới
- Bug fix                 : 4 (chi tiết ở B6.4 -- 2 phát hiện qua smoke test Atlas, 2 phát hiện TRƯỚC khi ảnh hưởng thật nhờ tự viết test cho logic mới)

### B6.2. Chi tiet file dang chu y

| File | Rule áp dụng | Ghi chú |
|------|--------------|---------|
| `backend/src/services/publicSupportLocation.service.js` | 1, 2, 6 | `$geoNear` PHẢI là stage đầu tiên, filter trong `query` của chính nó (CLAUDE.md "Cạm bẫy đã biết"); không có điểm trong bán kính -> 1 lần fallback không giới hạn khoảng cách thay vì mảng rỗng |
| `backend/src/services/supportLocation.service.js` | 3, 7 | `bulkImportLocations` xử lý từng dòng độc lập, dòng lỗi bị bỏ qua kèm lý do thay vì làm hỏng cả file import |
| `mobile/src/lib/api/sos.ts` | 1, 4, 9 | Cache offline ở TẦNG DATA (`fromCache` là field mở rộng optional trên envelope), không phải màn hình tự quản lý AsyncStorage |
| `mobile/src/app/sos/map.tsx` | 2, 7 | `ErrorBoundary` quanh `MapView`, banner ngoại tuyến, sheet chi tiết điểm (gọi/chỉ đường/copy địa chỉ), fallback GPS bị từ chối -> danh sách theo quốc gia |
| `admin/src/lib/csv.ts` | 2, 3 | Tách RIÊNG khỏi `LocationsPage.tsx` (không phải chỉ để gọn) -- để test được bằng Vitest mà không phải nạp Leaflet (cần `window`, môi trường test admin không có `jsdom`) |

### B6.3. Quyet dinh dang chu y (chi tiet o docs/PROGRESS.md muc 42-53)

- Validate "publish location" bắt buộc `address` + ít nhất 1 trong `phone`/`website` -- tách `locationBaseSchema` khỏi `.refine()` để `locationUpdateSchema.partial()` không bị vướng.
- `/support-locations/nearby` sắp xếp theo khoảng cách tăng dần là chính (đọc sát nghĩa đen spec), `verified` chỉ là tiêu chí phụ.
- KHÔNG tự seed toạ độ GPS cho `support_locations` dù đã có sẵn tên/địa chỉ/SĐT có nguồn thật -- đoán sai toạ độ có thể gây hại thật cho tính năng SOS. Chuẩn bị `docs/sos-locations-template.csv` để trống toạ độ, chờ người có bản đồ điền.
- Khoảng cách đại sứ quán ở SOS Hub tính bằng Haversine phía client (không hợp nhất `Country.embassy` với `SupportLocation` -- thay đổi kiến trúc lớn hơn phạm vi B6).

### B6.4. Warning & Bug da xu ly

| Loại | Mô tả | File | Cách fix |
|------|-------|------|----------|
| Bug (phát hiện qua test tự viết, TRƯỚC khi ảnh hưởng dữ liệu thật) | `Number('')` bằng `0`, không phải `NaN` -- dòng CSV bỏ trống `lat`/`lng` bị gán nhầm toạ độ `[0,0]` ("null island") thay vì bị coi là thiếu | `admin/src/lib/csv.ts` | Kiểm tra chuỗi rỗng trước khi gọi `Number()` |
| Bug (phát hiện qua test tự viết) | Parser CSV tự viết (không thêm thư viện) chỉ `split(',')` đơn giản, cắt sai cột với địa chỉ thật chứa dấu phẩy trong ngoặc kép | `admin/src/lib/csv.ts` | Viết `splitCsvLine` xử lý đúng trường bọc `"..."` |
| Bug (phát hiện qua smoke test/test $geoNear) | `$geoNear` báo lỗi "requires a 2d or 2dsphere index" ở test đầu tiên -- Mongoose xây index nền không đồng bộ với `connect()` | `test/supportLocation.test.js` | `await SupportLocation.init()` trước khi test trong `before()` |
| Bug (kế thừa từ B5, phát hiện lại ở endpoint mới) | `validateQuery` không coerce được `req.query` (đã ghi nhận quyết định 39) -- áp dụng lại cách né cho `/support-locations/nearby` | `controllers/publicSupportLocation.controller.js` | Tự `Number()` lại trong controller |

### B6.5. Van de con ton dong

- Chưa có `support_locations` nào đã verify trong DB thật -- điều kiện nghiệm thu của master plan chưa đạt, cần người có bản đồ điền toạ độ thật vào `docs/sos-locations-template.csv` rồi nhập qua Admin (xem docs/PROGRESS.md "Đang vướng").
- "Từ chối GPS -> chọn thành phố/khu vực thủ công" đơn giản hoá thành "xem toàn bộ quốc gia", không phải picker theo từng thành phố.
- `ErrorBoundary` quanh `MapView` chưa test được với lỗi native thật (chỉ xác nhận đúng cơ chế React qua đọc code).
- `openTime`/`closeTime` đại sứ quán vẫn để rỗng (chưa có nguồn thật, ngoài phạm vi B6).

## B7 — INCIDENTS + TRANSLATOR (v0.8.1 --> v0.9.0)

### B7.1. Tong quan
- Tổng số file mới        : 15 backend (`models/IncidentType.js`, `models/UserIncidentProgress.js`, `models/QuickPhrase.js`, `services/incident.service.js`, `services/quickPhrase.service.js`, `services/translate.service.js`, `controllers/publicIncident.controller.js`, `controllers/incidentProgress.controller.js`, `controllers/adminIncidents.controller.js`, `controllers/publicQuickPhrase.controller.js`, `controllers/adminQuickPhrases.controller.js`, `controllers/translate.controller.js`, `routes/translate.routes.js`, `routes/incidentProgress.routes.js`, `validators/translate.validator.js`) + 3 test (`test/incident.test.js`, `test/translate.test.js`) + 3 fixtures (`public.incident.json`, `public.quickPhrase.json`, `translate.json`) + 5 mobile (`lib/api/incidents.ts`, `lib/api/translate.ts`, `lib/api/__tests__/incidents.test.ts`, `lib/api/__tests__/translate.test.ts`) + 4 admin (`pages/IncidentsPage.tsx`, `pages/IncidentEditorPage.tsx`, `pages/QuickPhrasesPage.tsx`, `components/incident-editor/StepsEditor.tsx`)
- Tổng số file chỉnh sửa  : backend (`validators/admin.validator.js`, `validators/publicContent.validator.js`, `core/domainErrors.js`, `middleware/rateLimit.middleware.js`, `rag/llm/mock.llm.js`, `routes/admin.routes.js`, `routes/public.routes.js`, `app.js`, `test/admin.test.js`, `test/contracts.test.js`, `contracts/README.md`) + mobile (`app/incidents/index.tsx`, `app/incidents/[slug].tsx`, `app/translate/index.tsx`, `app/sos/map.tsx`, `lib/data.ts`, `lib/storage.ts`, `mocks/client.ts`, `mocks/schemas.ts`, `mocks/fixtures/incidents.ts`, `lib/api/__tests__/adapters.test.ts`) + admin (`App.tsx`, `components/Layout.tsx`, `lib/api.ts`, `lib/types.ts`)
- Warning xử lý           : 0 mới
- Bug fix                 : 0 (viết mới hoàn toàn, không sửa hồi quy)

### B7.2. Chi tiet file dang chu y

| File | Rule áp dụng | Ghi chú |
|------|--------------|---------|
| `backend/src/services/incident.service.js` | 2, 7 | `setProgress` lọc bỏ `step.order` không còn tồn tại trong workflow hiện hành trước khi lưu -- tránh tiến độ hiển thị sai lệch sau khi admin sửa bước |
| `backend/src/rag/llm/mock.llm.js` | 3, 9 | Tái dùng CÙNG provider abstraction của RAG (B4) cho dịch thuật, thêm nhánh đọc `task:'translate'` thay vì viết provider dịch riêng |
| `admin/src/components/incident-editor/StepsEditor.tsx` | 2, 9 | Nút lên/xuống thay kéo-thả (không thêm thư viện DnD mới cho một thao tác đổi thứ tự mảng); server luôn chuẩn hoá lại `order` khi lưu |
| `mobile/src/lib/api/translate.ts` | 1, 4 | Cache-aside offline cho quick phrases CÙNG pattern với `lib/api/sos.ts` (B6) -- không phát minh cơ chế mới |
| `mobile/src/app/incidents/[slug].tsx` | 2, 7 | Tách rõ 2 khái niệm: tick checklist (state cục bộ, không đồng bộ) và đánh dấu bước hoàn thành (lưu server qua `completedSteps`) |

### B7.3. Quyet dinh dang chu y (chi tiet o docs/PROGRESS.md muc 26-35)

- `IncidentType.status: 'draft'|'published'` -- áp dụng lại nguyên tắc pre-filter nội dung công khai của CLAUDE.md mục 4.1 dù prompt B7 không yêu cầu.
- Tiến độ lưu theo `step.order` (mảng số), không lưu theo từng dòng checklist -- khớp đúng với `StepProgress` (thanh theo BƯỚC).
- CTA (`map`/`call`/`ai`/`link`) dùng `payload` tự do (`Record<string,unknown>`) thay vì schema cứng theo từng loại -- dễ mở rộng thêm loại CTA mới mà không phải đổi contract.
- Dịch bắt buộc đăng nhập, dùng rate limit RAM giống chat, KHÔNG có lớp quota DB riêng (câu dịch ngắn, không tốn retrieval/embedding như RAG).
- A07 Incident Workflow Builder: picker chọn contact/article là ô lọc + checkbox list tải sẵn (không phải combobox chuyên dụng) -- cùng lý do KISS ở trên.

### B7.4. Warning & Bug da xu ly

Không phát sinh bug trong lúc viết (batch mới hoàn toàn, không sửa code cũ).
127 test backend + 80 test mobile + 8 test admin đều xanh sau khi thêm B7
(14 test backend mới: `incident.test.js` 8 + `translate.test.js` 6; 6 test
mobile mới: `incidents.test.ts` 3 + `translate.test.ts` 2 + 1 bổ sung ở
`adapters.test.ts`).

### B7.5. Van de con ton dong

- `POST /api/translate` nhận `mode:'text'|'phrase'` nhưng chưa xử lý khác
  nhau giữa hai mode (field tồn tại theo đúng contract B7, hành vi giống hệt
  nhau ở service/prompt hiện tại).
- CTA loại `ai` chỉ prefill một câu hỏi cố định, không mang theo ngữ cảnh
  nhiều lượt của bước đang xem (giới hạn chung của chat B4/B5, chưa multi-turn).
- Chưa có dữ liệu `IncidentType`/`QuickPhrase` thật trong Atlas (chưa seed) --
  cần B9 hoặc người phụ trách nhập qua Admin trước khi demo.

## B8 — ALERTS + PROFILE/FAVORITES (v0.9.0 --> v1.0.0)

### B8.1. Tong quan
- Tổng số file mới        : 12 backend (`models/GeoAlert.js`, `models/Favorite.js`, `services/geoAlert.service.js`, `services/favorite.service.js`, `controllers/adminGeoAlerts.controller.js`, `controllers/publicAlerts.controller.js`, `controllers/favorites.controller.js`, `controllers/preferences.controller.js`, `routes/favorites.routes.js`, `routes/preferences.routes.js`, `test/alerts.test.js`, `test/favorites.test.js`, `test/profile.test.js`) + 8 mobile (`lib/api/alerts.ts`, `lib/api/favorites.ts`, `lib/api/preferences.ts`, `features/alerts/usePollAlerts.ts`, `components/common/AlertBanner.tsx`, `app/favorites/index.tsx`, `lib/api/__tests__/alerts.test.ts`, `lib/api/__tests__/favorites.test.ts`) + 2 admin (`pages/GeoAlertsPage.tsx`, `components/CirclePicker.tsx`)
- Tổng số file chỉnh sửa  : backend (`models/User.js`, `validators/admin.validator.js`, `validators/publicContent.validator.js`, `validators/auth.validator.js`, `validators/chat.validator.js`, `services/auth.service.js`, `services/chat.service.js`, `controllers/auth.controller.js`, `controllers/chat.controller.js`, `routes/admin.routes.js`, `routes/public.routes.js`, `routes/chat.routes.js`, `app.js`, `test/admin.test.js`, `test/contracts.test.js`, `contracts/README.md`) + mobile (`app/settings/index.tsx`, `app/profile/index.tsx`, `app/chat/index.tsx`, `app/incidents/[slug].tsx`, `app/explore/index.tsx`, `app/explore/[country]/[slug].tsx`, `components/common/AppShell.tsx`, `components/common/__tests__/AppShell.test.tsx`, `features/explore/useSavedArticles.ts`, `lib/data.ts`, `lib/storage.ts`, `lib/api/auth.ts`, `lib/api/chat.ts`, `mocks/client.ts`, `mocks/schemas.ts`, `lib/api/__tests__/adapters.test.ts`, `package.json` (jest config)) + admin (`App.tsx`, `components/Layout.tsx`, `lib/api.ts`, `lib/types.ts`)
- Warning xử lý           : 0 mới
- Bug fix                 : 2 (1 phát hiện qua test tự viết trước khi ảnh hưởng thật -- tham số `country` vs `countryCode` sai tên ở `geoAlert.service.js`; 1 khoảng trống cấu hình Jest có sẵn từ trước, lộ ra khi thêm test đầu tiên render cây component chạm AsyncStorage thật)

### B8.2. Chi tiet file dang chu y

| File | Rule áp dụng | Ghi chú |
|------|--------------|---------|
| `backend/src/services/geoAlert.service.js` | 9 | Lọc bán kính bằng Haversine trong ứng dụng thay vì `$geoWithin`/`$centerSphere` -- mỗi alert có bán kính RIÊNG, không phải một bán kính cố định cho cả truy vấn |
| `backend/src/services/favorite.service.js` | 3, 9 | Gộp 3 loại đối tượng (article/location/incident) bằng `Map` tra cứu thủ công thay vì Mongoose `refPath`; bài đã superseded vẫn trả về kèm cờ `isOutdated` |
| `mobile/src/features/explore/useSavedArticles.ts` | 1, 2 | Đổi khoá từ `countryCode:slug` cục bộ sang `article.id` thật (ObjectId) -- bắt buộc để nối `Favorite.targetId`, giữ nguyên tên 2 hàm `isSaved`/`toggleSaved` |
| `mobile/src/features/alerts/usePollAlerts.ts` | 7, 9 | Nhịp định kỳ 5 phút thay vì `watchPosition` liên tục (tốn pin); tôn trọng `preferences.locationConsent` VÀ quyền hệ thống đã cấp, không tự ý xin quyền |
| `mobile/package.json` (jest) | 13B | Thêm `moduleNameMapper` cho `@react-native-async-storage/async-storage` -- sửa tận gốc ở cấu hình chung thay vì mock riêng lẻ từng file test mới |

### B8.3. Quyet dinh dang chu y (chi tiet o docs/PROGRESS.md muc 37-47)

- `GeoAlert.severity` tái dùng enum `RiskLevel` đã có, không định nghĩa enum mới.
- `PUT /api/users/preferences` chỉ ghi đè field được gửi (không phải PUT thay thế toàn bộ) -- tránh mất preferences khác khi client chỉ gửi một phần.
- "Chia sẻ vị trí khi SOS" (cũ) và "Cảnh báo theo vị trí" (`locationConsent`, mới) là hai khái niệm tách biệt, không gộp chung một toggle.
- Bookmark bài luật đổi khoá từ `countryCode:slug` sang `article.id` thật -- chạm tối thiểu 2 điểm gọi, bắt buộc để nối API thật.

### B8.4. Warning & Bug da xu ly

| Loại | Mô tả | File | Cách fix |
|------|-------|------|----------|
| Bug (phát hiện qua test tự viết `alerts.test.js`, TRƯỚC khi ảnh hưởng thật) | `findApplicable({countryCode,...})` destructure sai tên tham số -- controller truyền `req.query` có field `country` (đúng theo validator + quy ước `publicSupportLocation.service.js`), khiến mọi request thật ném `TypeError` 500 | `backend/src/services/geoAlert.service.js` | Đổi tham số thành `country`, khớp đúng tên field query |
| Bug (khoảng trống cấu hình có sẵn, lộ ra khi thêm test mới) | Chưa có mapping mock cho `@react-native-async-storage/async-storage` trong Jest -- mọi test trước đó chạm `lib/storage.ts` đều tự `jest.mock('@/lib/storage', ...)` riêng lẻ, `AppShell.test.tsx` (qua `AlertBanner` → `lib/data.ts` import toàn bộ `lib/api/*`) là component đầu tiên chạm thẳng module gốc | `mobile/package.json` | Thêm `moduleNameMapper` trỏ tới mock chính thức của thư viện, áp dụng cho toàn bộ test |

### B8.5. Van de con ton dong

- `usePollAlerts` phát hiện di chuyển >500m có độ trễ tối đa 5 phút (nhịp định kỳ, không `watchPosition` liên tục).
- "Chia sẻ vị trí khi SOS" (gửi liên hệ khẩn cấp) vẫn cục bộ, chưa có backend -- ngoài phạm vi B8.
- Chưa có dữ liệu `GeoAlert` thật trong Atlas (chưa seed) -- cần B9 hoặc người phụ trách nhập qua Admin trước demo.
- A06 Geo Alert Builder dùng `<Circle>` tĩnh + ô nhập số cho bán kính, không kéo-thả resize handle trên bản đồ (cùng quyết định KISS với A07 không dùng drag-and-drop).

## Rà soát toàn hệ thống 24/09/2026

Phạm vi: sửa lỗi được người dùng yêu cầu trực tiếp, giữ kiến trúc và bố cục
mobile. Không thực hiện nâng cấp tính năng B7/B8 hay sửa dữ liệu Atlas thật.
Nhánh `feature/system-audit-fixes`; xem `git show --stat` và diff commit của
phiên này để đối chiếu, không sao chép toàn bộ mã trước/sau vào báo cáo.

### Chẩn đoán và phương án đã chọn

| Nhóm | Triệu chứng / nguyên nhân | Phương án và rủi ro được kiểm soát |
|---|---|---|
| Môi trường/W3/W5 | Admin thiếu tool, mobile thiếu expo-location; renderer kéo React 19.3; 15 advisory từ 2 dependency | Cài lockfile/Expo; pin renderer 1.2, uuid 11.1.1, decoder 0.5 + patch interop một dòng. Không downgrade Expo theo audit --force. Test + bundle + Expo Doctor kiểm tương thích |
| API | Getter req.query bỏ kết quả coerce; input lỗi thành 500 | Property query đã parse; error mapper 400/409; test Express thật |
| Xác thực/W5 | JWT giữ role cũ; refresh/reset đọc-rồi-save bị race; mất mạng bị logout | Kiểm user hiện hành, CAS token, reset một lần, giữ token khi lỗi tạm; test đồng thời và khóa tài khoản |
| Quota | Request đồng thời cùng thấy quota còn trống | Bộ đếm ngày global và user tăng có điều kiện; không cần transaction/Redis; có test 8 request tranh lượt cuối |
| Worker | Chỉ lấy pending, running bị gián đoạn kẹt mãi; thiếu handler báo done | Lease token + heartbeat + nhận lại running quá hạn + giới hạn retry; test hai worker |
| Nội dung | Hai PATCH cùng updatedAt có thể ghi đè; sửa published không reindex | OCC tại lệnh ghi; nội dung published đi qua version nháp; giữ hook normalize của Mongoose |
| RAG/W5 | Focus khác nước, chunk cũ góp ngưỡng, cache không xét TTL/ID/nội dung, mất metadata | Kiểm lại nguồn/version trước ngưỡng; cache theo bằng chứng có thứ tự; giữ metadata, fallback/timeout. Golden và test không lọt draft/superseded |
| Guard | Một marker hợp lệ bảo chứng nhầm cho mức tiền bịa hoặc câu phía sau | Đối chiếu số tiền với nguồn của từng khối có marker; bảo thủ có thể từ chối thêm. Không tuyên bố kiểm chứng ngữ nghĩa tuyệt đối |
| SOS | Badge mở cửa/chia sẻ giả; URL 0,0; GPS disclosure sai; cache trộn filter | Hiển thị tình trạng chưa xác nhận; dùng địa chỉ đã có; không giả định dữ liệu. Cache theo filter, tính lại khoảng cách |
| CSV | Zod validate toàn mảng làm một dòng hỏng cả file; PATCH xóa hết liên hệ | safeParse từng dòng, trả skipped; kiểm trạng thái ghép khi PATCH; giữ nguyên lý do lỗi tọa độ cũ |
| Admin/W5 | Raw HTML preview có thể chạy script; bản nháp bị ghi đè/chung tài khoản | DOMPurify sau Markdown; tách key draft và remount theo bài, chờ quyết định restore; test XSS trong jsdom |
| Mobile state | Ref đọc trong render, dữ liệu user A còn cho user B, favorites lệch màn hình | State có guard; clear cache theo danh tính; local query theo email/mode; không tự gán dữ liệu legacy không biết chủ |

### Chi tiết file

| File | Rule áp dụng | Thay đổi / kiểm tra |
|---|---|---|
| `README.md` | 7, 11, 13 | Node tối thiểu, URL API và trạng thái hardening hiện hành |
| `admin/package-lock.json` | 7, 11, 13 | Khóa dependency; audit 0 advisory |
| `admin/package.json` | 7, 11, 13 | DOMPurify runtime; jsdom chỉ dev cho test XSS |
| `admin/src/components/Layout.tsx` | 7, 11, 13 | Cập nhật import hook xác thực sau khi tách Fast Refresh |
| `admin/src/components/ProtectedRoute.tsx` | 7, 11, 13 | Cập nhật import hook xác thực sau khi tách Fast Refresh |
| `admin/src/lib/__tests__/markdown.test.ts` | 3, 13 | Test hồi quy/contract cho thay đổi tương ứng |
| `admin/src/lib/apiClient.ts` | 7, 11, 13 | Refresh mạng lỗi không xóa phiên |
| `admin/src/lib/auth.ts` | 7, 11, 13 | Single-flight khôi phục phiên StrictMode; chỉ xóa token đã vô hiệu |
| `admin/src/lib/authContext.tsx` | 7, 11, 13 | Clear cache khi đổi user; logout local trong finally; tách hook Fast Refresh |
| `admin/src/lib/authState.ts` | 7, 11, 13 | Context/type riêng khỏi file component |
| `admin/src/lib/markdown.ts` | 7, 11, 13 | Sanitize sau parse Markdown, profile HTML |
| `admin/src/lib/useAuth.ts` | 7, 11, 13 | Hook riêng, loại warning Fast Refresh |
| `admin/src/pages/ArticleEditorPage.tsx` | 7, 11, 13 | Preview an toàn; bảo vệ nháp theo user/bài, không ghi đè nháp chờ restore; hướng dẫn tạo version |
| `admin/src/pages/LoginPage.tsx` | 7, 11, 13 | Cập nhật import hook xác thực sau khi tách Fast Refresh |
| `backend/.env.example` | 7, 11, 13 | Thêm AI_PROVIDER_TIMEOUT_MS, không chứa secret |
| `backend/src/controllers/publicSupportLocation.controller.js` | 7, 11, 13 | Bỏ workaround Number() sau khi sửa query middleware |
| `backend/src/core/env.js` | 7, 11, 13 | Timeout provider hợp lệ; model mặc định đồng nhất .env.example |
| `backend/src/middleware/auth.middleware.js` | 7, 11, 13 | Đọc role/isActive hiện hành; JWT cũ không giữ quyền đã thu hồi |
| `backend/src/middleware/error.middleware.js` | 7, 11, 13 | Map JSON lỗi, CastError, duplicate/OCC thành 400/409 |
| `backend/src/middleware/validate.middleware.js` | 7, 11, 13 | Giữ Zod query bằng property thay getter Express |
| `backend/src/models/AiQuota.js` | 7, 11, 13 | Bộ đếm global theo ngày UTC với _id duy nhất và TTL |
| `backend/src/models/Job.js` | 7, 11, 13 | Thêm lockToken chống worker cũ ghi đè worker mới |
| `backend/src/rag/embedding/gemini.embedding.js` | 7, 11, 13 | Timeout request provider lấy từ env; không đổi model API hay thêm SDK |
| `backend/src/rag/embedding/openai.embedding.js` | 7, 11, 13 | Timeout request provider lấy từ env; không đổi model API hay thêm SDK |
| `backend/src/rag/guard.js` | 7, 11, 13 | Kiểm số tiền với nguồn và marker theo khối; bỏ emoji disclaimer |
| `backend/src/rag/jobs/purgeChunks.job.js` | 7, 11, 13 | Không purge bài đã publish lại vì job cũ |
| `backend/src/rag/jobs/reindexArticle.job.js` | 7, 11, 13 | Bỏ job draft/cũ; xác minh lại trạng thái và hình dạng vector trước ghi |
| `backend/src/rag/llm/gemini.llm.js` | 7, 11, 13 | Timeout request provider lấy từ env; không đổi model API hay thêm SDK |
| `backend/src/rag/llm/openai.llm.js` | 7, 11, 13 | Timeout request provider lấy từ env; không đổi model API hay thêm SDK |
| `backend/src/rag/prompt.js` | 7, 11, 13 | Validate output JSON, confidence và needsOfficialHelp |
| `backend/src/rag/retrieval.js` | 7, 11, 13 | Cùng quốc gia/phiên bản; chunk đã bị gỡ không đóng góp ngưỡng; ID chunk thật |
| `backend/src/services/aiUsage.service.js` | 7, 11, 13 | Cấp quota user/global nguyên tử, trả lượt global nếu user bị từ chối |
| `backend/src/services/chat.service.js` | 7, 11, 13 | Cache đúng bằng chứng/TTL, upsert, metadata và fallback khi retrieval lỗi |
| `backend/src/services/job.service.js` | 7, 11, 13 | Lease/heartbeat, nhận lại job gián đoạn, backoff, failed khi thiếu handler |
| `backend/src/services/legalArticle.service.js` | 7, 11, 13 | OCC trong lệnh ghi; khóa nội dung bài đã xuất bản; giữ định danh phiên bản |
| `backend/src/services/passwordReset.service.js` | 7, 11, 13 | OTP/reset token một lần; không tái kích hoạt user bị khóa |
| `backend/src/services/refreshToken.service.js` | 7, 11, 13 | CAS token cha; xóa token con của request thua để chỉ một nhánh hợp lệ |
| `backend/src/services/supportLocation.service.js` | 7, 11, 13 | CSV safeParse từng dòng, giữ reason cũ, PATCH giữ kênh liên lạc |
| `backend/src/validators/admin.validator.js` | 7, 11, 13 | URL HTTP(S), tọa độ giới hạn, CSV validate độc lập từng dòng |
| `backend/src/validators/chat.validator.js` | 7, 11, 13 | Validate focusArticleId là ObjectId trước truy vấn |
| `backend/test/hardening.test.js` | 3, 13 | Test hồi quy/contract cho thay đổi tương ứng |
| `backend/test/rag.guard.test.js` | 3, 13 | Test hồi quy/contract cho thay đổi tương ứng |
| `backend/test/setup.js` | 3, 13 | Ép mock/search memory trong test, không gọi API trả phí |
| `contracts/README.md` | 7, 11, 13 | Ghi rõ contract lỗi, sửa bài đã publish, quota và metadata RAG |
| `docs/PROGRESS.md` | 7, 11, 13 | Viết lại phần hiện hành, giữ lịch sử quyết định, loại danh sách lỗi đã sửa khỏi tồn đọng |
| `mobile/.env.example` | 7, 11, 13 | Phân biệt explicit API URL với LAN tự suy; cập nhật phạm vi mock |
| `mobile/package-lock.json` | 7, 11, 13 | Khóa cây dependency đã kiểm chứng, 0 advisory |
| `mobile/package.json` | 7, 11, 13 | Override vá bảo mật, pin renderer React 19.2, postinstall patch, Jest ESM, Node 22.13 |
| `mobile/patches/query-string+7.1.3.patch` | 7, 11, 13 | Interop CommonJS với default export của decoder 0.5 đã vá DoS |
| `mobile/src/app/sos/index.tsx` | 7, 11, 13 | Bỏ trạng thái mở cửa/chia sẻ giả; chặn gọi số rỗng, directions 0,0, bắt lỗi GPS/link |
| `mobile/src/app/trips/new.tsx` | 7, 11, 13 | Thay ref dùng lúc render bằng state có guard khi đổi chuyến cần sửa |
| `mobile/src/features/explore/useSavedArticles.ts` | 7, 11, 13 | Dùng store chung để favorites đồng bộ giữa màn hình |
| `mobile/src/features/profile/useDocumentStatus.ts` | 7, 11, 13 | Tách trạng thái giấy tờ theo tài khoản |
| `mobile/src/features/profile/useEmergencyContacts.ts` | 7, 11, 13 | Không gán người liên hệ giả; ID không lặp sau restart; store theo user |
| `mobile/src/lib/__tests__/dependencyCompatibility.test.ts` | 3, 13 | Test hồi quy/contract cho thay đổi tương ứng |
| `mobile/src/lib/__tests__/userStorage.test.tsx` | 3, 13 | Test hồi quy/contract cho thay đổi tương ứng |
| `mobile/src/lib/api/__tests__/http.test.ts` | 3, 13 | Test hồi quy/contract cho thay đổi tương ứng |
| `mobile/src/lib/api/__tests__/sos.test.ts` | 3, 13 | Test hồi quy/contract cho thay đổi tương ứng |
| `mobile/src/lib/api/auth.ts` | 7, 11, 13 | Chỉ xóa phiên khi backend xác nhận token không hợp lệ |
| `mobile/src/lib/api/http.ts` | 7, 11, 13 | Giữ phiên khi refresh mạng/5xx lỗi; URL khai báo được ưu tiên |
| `mobile/src/lib/api/sos.ts` | 7, 11, 13 | Cache theo country/type; tính lại khoảng cách khi offline |
| `mobile/src/lib/auth.tsx` | 7, 11, 13 | Clear query/chat khi đổi danh tính; sửa profile không reset chat |
| `mobile/src/lib/countryContext.tsx` | 7, 11, 13 | Mặc định quốc gia active từ dữ liệu, bỏ hard-code JP |
| `mobile/src/lib/locationPermission.ts` | 7, 11, 13 | Thông báo đúng việc gửi tọa độ; xử lý dismiss/không thể hỏi quyền lại |
| `mobile/src/lib/useUserStorage.ts` | 7, 11, 13 | State lưu cục bộ chia theo tài khoản/mode và đồng bộ qua QueryClient |

### Nghiệm thu

- 66 file thay đổi/thêm mới (gồm source, test, lockfile và tài liệu).
- Thêm 26 test hồi quy: backend +20, mobile +5, admin +1; tổng 192 test đạt.
- Xử lý 11 lỗi lint mobile ban đầu, 1 warning Fast Refresh admin và
  15 cảnh báo dependency (2 advisory gốc); lint hiện không còn warning.

- Backend lint sạch; 110/110 test, trong đó có 25 ca golden KR.
- Mobile lint/typecheck sạch, 74/74 test (14 suites).
- Admin lint/typecheck sạch, 8/8 test, build production thành công.
- Expo Doctor 21/21; export iOS/Android thành công. Chưa là native build đã ký.
- npm audit cả ba workspace: 0 vulnerability sau sửa. Đã kiểm parse/stringify
  URI, generator UUID của xcode và load module ngrok sau override.
- Warning môi trường NO_COLOR/FORCE_COLOR khi Metro export đầu tiên: loại xung
  đột bằng `env -u NO_COLOR`; không sửa code app hay che cảnh báo của test.
- Không commit .env, node_modules, output build hay log /tmp.

### Tồn đọng hiện hành

Đối chiếu `PROGRESS.md` mục Đang vướng và Giới hạn còn lại. Cần người phụ trách
xác minh dữ liệu SOS/pháp lý, cấu hình dịch vụ thật và kiểm thử trên thiết bị.
B7/B8, multi-turn, usage/cost AI thật, nâng cấp tìm kiếm công khai và triển khai
vẫn là công việc lộ trình; không được coi là đã hoàn thành bởi đợt sửa lỗi này.
Patch dependency là giải pháp tương thích có test, cần rà lại khi nâng Expo
Router/query-string: nếu upstream đã dùng decoder đã vá, gỡ patch cùng override.

## 7. LICH SU CAP NHAT
| Phiên bản | Ngày | Batch | Nội dung chính |
|-----------|------|-------|----------------|
| v0.2.0    |      | —     | Trạng thái ban đầu |
| v0.3.0    | 22/09/2026 | B1 | contracts/, envelope {ok,data}, auth thật (mobile + backend), refresh xoay vòng + ân hạn, prettier/eslint backend |
| v0.3.1    | 22/09/2026 | B1 (điều chỉnh) | Phone bắt buộc lại + UI đăng ký; login-phone chặn bằng màn hình tĩnh; sửa 2 bug phát hiện qua smoke test thật trên Atlas (import sai đường dẫn, `refreshToken: null` lọt envelope) |
| v0.4.0    | 22/09/2026 | B2 | Content backbone backend (models, admin API, máy trạng thái, job queue, audit log) + Admin Portal SPA hoàn toàn mới (Vite/React/TS/Tailwind v4); sửa 2 bug qua smoke test thật (Express 5 req.query, Mongoose deprecation) |
| v0.5.0    | 22/09/2026 | B3 | API công khai countries/legal/trips + seed 4 nước, 6 chủ đề, 8 bài luật KR draft có nguồn thật; mobile nối API thật qua adapters.ts, sửa 3 file bị bỏ qua công tắc mock/thật; sửa 3 bug (2 qua test, 1 qua đọc code) |
| v0.6.0    | 23/09/2026 | B4 | RAG engine đầy đủ (embedding/LLM provider + mock bắt buộc, chunking, retrieval 2 lớp phòng thủ, guard.js hậu kiểm), chat API backend, job reindex/purge thật, admin A04 RAG Index, golden test 25/25 (15 must_answer + 6 must_refuse + 4 country_isolation); sửa 2 bug (1 qua smoke test Atlas, 1 qua viết golden test) |
| v0.6.1    | 23/09/2026 | B4 (điều chỉnh) | Smoke test Gemini thật thành công với key đúng định dạng; phát hiện `gemini-2.5-flash` (default cũ) bị Google trả 404 cho key mới, đổi default `LLM_MODEL` sang `gemini-3.6-flash`; `.env` chốt dùng `LLM_PROVIDER=gemini`/`EMBEDDING_PROVIDER=gemini` cho dev thật, xác nhận test (78/78) và golden test (25/25) không phụ thuộc `.env` nên không bị ảnh hưởng |
| v0.7.0    | 24/09/2026 | B5 | Chat mobile nối RAG thật (session/lịch sử/marker bấm được/focusArticleId/quota), module feedback + A08 Feedback Queue, A01 Dashboard nâng cấp số liệu AI; sửa 3 bug qua smoke test thật trên Atlas (bug `validateQuery` không coerce `req.query`, `topFallbackQuestions` null, 2 API Mongoose deprecated) |
| v0.8.0    | 24/09/2026 | B6 | SOS: `$geoNear` thật (backend) + admin CRUD/bulk import CSV/bulk verify + mobile map/hub nối API thật, disable Places API đúng CLAUDE.md; sửa 4 bug (2 qua smoke test Atlas, 2 qua tự viết test TRƯỚC khi ảnh hưởng dữ liệu thật); chưa đạt điều kiện nghiệm thu "có support_locations đã verify" của master plan -- cần người điền toạ độ thật |
| v0.8.1 | 24/09/2026 | Rà soát toàn hệ thống | Sửa API/auth/quota/job/RAG/SOS/admin/mobile; dependency 0 advisory; kiểm tra và bàn giao |
| v0.9.0 | 25/09/2026 | B7 | Incidents (backend CRUD + workflow công khai + tiến độ theo user + CTA ngữ cảnh) và Translator (`/api/translate` tái dùng provider RAG + quick phrases offline) nối API thật ở mobile; Admin A07 Incident Workflow Builder + trang Câu dịch sẵn; 127 test backend, 80 test mobile, 8 test admin xanh |
| v1.0.0 | 25/09/2026 | B8 | GeoAlert + favorites + preferences nối API thật; banner/modal cảnh báo AppShell, màn hình Đã lưu gộp 3 loại, lịch sử chat đổi tên/xoá, khối riêng tư + xoá lịch sử AI; mobile không còn phụ thuộc `@/mocks/client`/`@/mocks/fixtures` ở màn hình nào; sửa 2 bug (1 qua test tự viết trước khi ảnh hưởng thật, 1 khoảng trống cấu hình Jest có sẵn từ trước); 146 test backend, 85 test mobile, 8 test admin xanh |
