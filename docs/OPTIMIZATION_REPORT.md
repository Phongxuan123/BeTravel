# BAO CAO TOI UU CODE — BE.TRAVEL

Phiên bản : v0.2.0 --> v0.4.0
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

## 7. LICH SU CAP NHAT
| Phiên bản | Ngày | Batch | Nội dung chính |
|-----------|------|-------|----------------|
| v0.2.0    |      | —     | Trạng thái ban đầu |
| v0.3.0    | 22/09/2026 | B1 | contracts/, envelope {ok,data}, auth thật (mobile + backend), refresh xoay vòng + ân hạn, prettier/eslint backend |
| v0.3.1    | 22/09/2026 | B1 (điều chỉnh) | Phone bắt buộc lại + UI đăng ký; login-phone chặn bằng màn hình tĩnh; sửa 2 bug phát hiện qua smoke test thật trên Atlas (import sai đường dẫn, `refreshToken: null` lọt envelope) |
| v0.4.0    | 22/09/2026 | B2 | Content backbone backend (models, admin API, máy trạng thái, job queue, audit log) + Admin Portal SPA hoàn toàn mới (Vite/React/TS/Tailwind v4); sửa 2 bug qua smoke test thật (Express 5 req.query, Mongoose deprecation) |
