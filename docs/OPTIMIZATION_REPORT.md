# BAO CAO TOI UU CODE — BE.TRAVEL

Phiên bản : v0.2.0 --> v0.3.0
Cập nhật  : 22/09/2026
Thực hiện : Claude Code

## 1. TONG QUAN
- Tổng số file rà soát   : 34 (24 backend, 10 mobile, trong phạm vi B1)
- Tổng số file chỉnh sửa : 27
- Tổng số thay đổi       : envelope thống nhất, auth thật, refresh xoay vòng, contracts/, 6 fixture, 15 file mới
- Tổng số warning xử lý  : 2 (ESLint `preserve-caught-error`, rate-limit gây 429 giả trong test)
- Tổng số bug fix        : 0 bug cũ (backend chưa có test trước B1 nên chưa từng chạy CI để lộ bug)

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
| backend/src/services/auth.service.js | 1, 6, 7 | — | — | Phone optional khi đăng ký, dùng issueRefreshToken dùng chung |
| backend/src/services/passwordReset.service.js | 7, 10 | 1 (preserve-caught-error) | — | Thêm `cause`, xoá return value không ai dùng |
| backend/src/models/RefreshToken.js | 1 | — | — | Thêm family, revokedAt, revokedReason, replacedByHash |
| backend/src/middleware/error.middleware.js | 7 | — | — | ZodError/AppError/còn lại --> envelope đúng ErrorCode |
| backend/src/middleware/auth.middleware.js | 7 | — | — | Dùng envelope fail() thay vì res.json thủ công |
| backend/src/middleware/rateLimit.middleware.js | 6, 7 | 1 (429 giả trong test) | — | Thêm `skip` khi NODE_ENV=test |
| backend/src/utils/cookie.js, authTransport.js | 1, 4, 11 | — | — | Đọc refresh token từ cookie HOẶC body |
| backend/src/config/db.js | 6 | — | — | maxPoolSize từ env, bỏ kiểm tra URI trùng với env.js |
| backend/src/app.js, server.js | 6, 9 | — | — | CORS_ORIGINS từ env, /health trả searchDriver |
| backend/README.md | — | — | — | Xoá cluster host thật, thay `<cluster-host>` |
| mobile/src/lib/api/http.ts, auth.ts, tokenStore.ts, authSchemas.ts | 1, 2, 4, 7, 11 | — | — | Mới — fetch wrapper, auto-refresh hàng đợi |
| mobile/src/lib/auth.tsx | 1, 2, 9 | — | — | Viết lại: nhánh mock/real theo EXPO_PUBLIC_USE_MOCKS |
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

## 5. VAN DE CON TON DONG

- `loginWithPhone` chỉ là placeholder ("đang phát triển") — chưa có backend OTP SMS thật. Lý do chưa fix: cần chọn nhà cung cấp SMS, nằm ngoài phạm vi B1 và MVP (CLAUDE.md Phần 4.4). Đề xuất: quyết định ở cấp sản phẩm trước khi làm, không tự mở rộng scope.
- Google login / quên mật khẩu chưa có test tích hợp (chỉ đổi envelope bọc ngoài, logic giữ nguyên). Lý do chưa fix: thiếu `GOOGLE_CLIENT_ID`/SMTP thật để test đầu-cuối trong phiên này. Đề xuất: bổ sung test khi có `.env` thật hoặc mock provider.
- `backend/.env` chưa tồn tại trên máy — toàn bộ DoD "chạy thật" (`npm run dev`, đăng ký qua Expo Go) chưa tự kiểm chứng được, chỉ kiểm chứng qua test tích hợp với `mongodb-memory-server`.

## 6. DE XUAT CHO LAN CAP NHAT TIEP THEO

- B2 nên tận dụng `core/envelope.js`, `core/errors.js`, `core/env.js` đã có sẵn — không viết lại.
- Khi thêm entity mới (`LegalArticle`, `Job`, ...), theo đúng mẫu `domainErrors.js` cho lỗi nghiệp vụ thay vì rẽ nhánh `error.message` trong controller.
- Cân nhắc thêm `mongodb-memory-server` vào CI pipeline (nếu dự án dựng CI) để test backend chạy được không cần Atlas thật.

## 7. LICH SU CAP NHAT
| Phiên bản | Ngày | Batch | Nội dung chính |
|-----------|------|-------|----------------|
| v0.2.0    |      | —     | Trạng thái ban đầu |
| v0.3.0    | 22/09/2026 | B1 | contracts/, envelope {ok,data}, auth thật (mobile + backend), refresh xoay vòng + ân hạn, prettier/eslint backend |
