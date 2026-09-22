# TIEN DO BE.TRAVEL

Cập nhật lần cuối: 2026-09-22 · Phiên: B2 — Content backbone + Admin Portal

| Batch | Trạng thái | Ngày | Ghi chú |
|---|---|---|---|
| B1 Auth thật            | xong | 2026-09-22 | Envelope {ok,data}, auth thật nối mobile, refresh xoay vòng + ân hạn |
| B2 Content + Admin      | xong | 2026-09-22 | Models + admin API + máy trạng thái + admin SPA (Vite/React/TS/Tailwind) |
| B3 Public content       | chưa làm | | |
| B4 RAG + guardrails     | chưa làm | | |
| B5 Chat + feedback      | chưa làm | | |
| B6 SOS                  | chưa làm | | |
| B7 Incidents + dịch     | chưa làm | | |
| B8 Alerts + profile     | chưa làm | | |
| B9 Hardening            | chưa làm | | |

Trạng thái hợp lệ: `chưa làm` · `đang làm` · `xong` · `xong một phần`

## Quyết định phát sinh

1. **[DA CHOT theo phan hoi nguoi dung] Phone bắt buộc khi đăng ký.** Bản đầu
   B1 tự ý đổi thành optional vì UI thiếu ô nhập — người dùng yêu cầu giữ bắt
   buộc và bổ sung UI thay vì nới lỏng backend. Đã khôi phục
   `phone: vietnamPhoneSchema` (bắt buộc) ở `auth.validator.js`, khôi phục
   kiểm trùng phone vô điều kiện ở `auth.service.js`. Thêm ô "Số điện thoại"
   vào `register.tsx` (giữa Email và Mật khẩu), validate cùng định dạng với
   backend (`^(0|\+84)[0-9]{9}$`). Chữ ký `register()` trong `AuthContextValue`
   đổi thành `(name, email, password, phone)`.
2. **[DA CHOT theo phan hoi nguoi dung] `login-phone.tsx` đổi thành màn hình
   chặn tĩnh** "Tính năng đang phát triển" với nút "Đăng nhập bằng email" thay
   vì giữ luồng nhập SĐT + OTP giả. Không còn gọi `loginWithPhone` — hàm này đã
   bị XOÁ khỏi `AuthContextValue` (không còn nơi nào dùng, dọn theo Rule 10).
   Lý do gốc không đổi: OTP SMS thật ngoài phạm vi MVP. Lưu ý: màn hình hiện
   hướng người dùng dùng "email" (không phải nút "Đăng nhập Google" — mobile
   CHƯA có UI cho Google Sign-In, dù backend đã hỗ trợ `/auth/google`). Nếu
   muốn hướng đúng nghĩa "dùng Google", cần làm thêm một hạng mục riêng: tích
   hợp `expo-auth-session` + OAuth client ID cho iOS/Android (cần thêm thông
   tin từ Google Cloud Console) — chưa làm ở B1, đề xuất cân nhắc ở batch sau
   nếu cần.
3. **`EXPO_PUBLIC_USE_MOCKS=true` cũng làm auth chạy giả** (không chỉ nội
   dung). `lib/auth.tsx` tách thành `useMockAuthValue` / `useRealAuthValue`
   theo đúng flag — đây là đường lùi khi demo lỗi, phải bao trùm toàn bộ app
   kể cả đăng nhập, không riêng nội dung.
4. **Test backend dùng `mongodb-memory-server`** thay vì Atlas thật. Atlas
   bắt buộc cho Vector Search (từ B4) nhưng auth/CRUD thường không cần —
   test nhanh, chạy offline, không tốn kết nối Atlas M0 vốn đã eo hẹp.
5. **Rate limit middleware `skip` trong `NODE_ENV=test`.** Test gọi
   `/register`/`/login` hàng chục lần trong một tiến trình, dùng chung state
   rate-limit theo IP — không tắt thì các test chạy sau bị 429 giả.
6. **`REFRESH_ROTATION_GRACE_SECONDS` mặc định trong môi trường test là 1
   giây** (không phải 10 giây như production) vì `core/env.js` đóng băng giá
   trị này lúc import đầu tiên — test không đổi được giữa chừng bằng cách gán
   lại `process.env`. Test "ngoài cửa sổ ân hạn" chờ hơn 1 giây thay vì đổi env.

### B2

7. **Publish thiếu điều kiện trả `409 CONFLICT`, không phải `422` như văn bản
   prompt B2 nói.** `ErrorCode` là enum đóng 10 giá trị (CLAUDE.md Phần 4.1),
   không có mã nào ánh xạ sang HTTP 422. Dùng `CONFLICT` (409) — đúng ngữ
   nghĩa hơn "422 Unprocessable Entity" cho một xung đột trạng thái nghiệp vụ,
   và giữ đúng enum đã chốt. Theo luật "prompt vs CLAUDE.md, CLAUDE.md thắng".
8. **AuditLog ghi tường minh ở cuối mỗi controller admin, KHÔNG dùng Express
   middleware "bắt" response chung.** Lý do: middleware chung không biết chính
   xác before/after của từng loại entity mà không đọc lại DB (thêm round-trip
   và vẫn có thể sai nếu response không phải JSON thuần). Gọi tường minh ở
   đúng nơi đã có before/after là cách chắc chắn nhất để "không bao giờ bị bỏ
   sót" — xem comment trong `services/auditLog.service.js`.
9. **Countries/Topics/Locations dùng chung một factory CRUD**
   (`core/adminCrudController.js` phía backend, `lib/resource.ts` phía admin)
   — ba resource có cùng khuôn list/get/create/update/remove + audit log,
   gom lại theo Rule 3 (DRY) thay vì lặp lại 3 lần gần như giống hệt nhau.
   `LegalArticle` KHÔNG dùng factory vì có logic riêng (máy trạng thái,
   optimistic concurrency, versioning).
10. **Admin SPA dùng Tailwind v4** (`@tailwindcss/vite`, không phải v3 +
    postcss.config) — dự án mới, không có ràng buộc tương thích ngược, cấu
    hình v4 đơn giản hơn nhiều.
11. **Admin SPA giữ nguyên `oxlint`** (linter mặc định của Vite scaffold mới)
    thay vì đổi sang ESLint như backend/mobile — dự án admin là mới hoàn
    toàn, không có "convention có sẵn" để tuân thủ (Rule 5 chỉ áp dụng khi
    project đã có config), và oxlint chạy nhanh hơn, đủ dùng cho quy mô này.
12. **Refresh token phía admin lưu ở `localStorage`**, không phải
    `httpOnly cookie` riêng và cũng không dùng `expo-secure-store` như mobile.
    Chấp nhận rủi ro XSS thấp hơn mức cần thiết cho app công khai vì đây là
    công cụ nội bộ, chỉ admin dùng — nhưng `apiClient.ts` vẫn gửi
    `credentials:'include'` nên nếu backend bật `AUTH_TRANSPORT=cookie` thì
    cookie httpOnly cũng hoạt động song song, không cần đổi code.

## Đang vướng

- **`backend/.env` đã được điền** (MONGODB_URI Atlas thật) và đã SMOKE TEST
  THÀNH CÔNG bằng `curl` thật: register → login → `/me` → refresh xoay vòng →
  replay trong cửa sổ ân hạn, cả 5 bước đều đúng kỳ vọng trên Atlas thật (dữ
  liệu test đã được dọn sạch khỏi DB sau khi xong). Vẫn CHƯA chạy qua Expo Go
  trên thiết bị/emulator thật (cần `EXPO_PUBLIC_API_URL` trỏ IP LAN từ máy
  chạy Expo) — người cần tự kiểm bước cuối này.
- **[!] `MONGODB_URI` trong `.env` hiện không có tên database trong URI**
  (`.../` thay vì `.../WDPPROJECT01`) → Mongoose tự nối vào database mặc định
  tên **`test`**, không phải `WDPPROJECT01` như tài liệu mô tả
  (`docs/00_BeTravel_MasterPlan_v2.md` Phần F). Không tự sửa vì đây có thể là
  chủ đích (ví dụ đang dùng chung cluster cho môi trường dev/test khác) — cần
  người xác nhận: nếu muốn đúng `WDPPROJECT01`, thêm `/WDPPROJECT01` vào cuối
  URI trước dấu `?`.
- **Google Client ID / SMTP**: chưa rõ đã điền hay chưa trong `.env` mới — các
  luồng Google login và quên mật khẩu giữ nguyên logic cũ (B1 chỉ đổi envelope
  bọc ngoài), chưa có test tích hợp riêng cho hai luồng này.
- **B2: chưa click-test admin SPA trong trình duyệt thật.** Không có công cụ
  trình duyệt (headless hay có giao diện) trong phiên làm việc này. Đã xác
  minh: `tsc -b` sạch, `vite build` thành công, `oxlint` sạch (1 warning chấp
  nhận được), mọi file `.tsx` compile qua Vite dev transform không lỗi cú
  pháp/import, và toàn bộ API phía sau (login, CRUD, publish, CORS với origin
  `localhost:5173`) đã smoke test thật bằng `curl` trên Atlas. Nhưng hành vi
  React runtime thực tế (state, re-render, form UX, bản đồ Leaflet hiển thị
  đúng vị trí click...) **chưa được người dùng hoặc công cụ trình duyệt xác
  nhận trực tiếp**. Đề nghị người dùng tự chạy `cd admin && npm run dev` và
  thử qua ít nhất luồng: đăng nhập → tạo quốc gia → tạo chủ đề → soạn bài
  luật → thêm nguồn → xuất bản → xem lại nhật ký.
- **Nhập thử 1 bài luật KR thật từ đầu đến publish (DoD B2 dòng cuối)**: cơ
  chế đã được smoke test bằng dữ liệu giả và chạy trong vài giây (rất nhanh
  hơn 15 phút yêu cầu), nhưng đây là quy trình con người thao tác qua UI thật
  với **nội dung pháp lý KR có nguồn thật** — nằm ngoài khả năng tôi tự làm
  (không có nguồn pháp lý KR đã kiểm chứng, xem "Đường găng thật" ở
  `docs/00_BeTravel_MasterPlan_v2.md` Phần A.3). Việc của nhóm nội dung, bắt
  đầu song song từ bây giờ theo đúng lộ trình.

## Nợ kỹ thuật

- **[BUG DA SUA]** `src/config/db.js` import sai đường dẫn (`./env.js` thay vì
  `../core/env.js`) khiến `npm run dev` crash ngay khi khởi động — không bị
  test bắt vì test tích hợp kết nối DB trực tiếp qua `test/setup.js`, không đi
  qua `connectDB()`. Phát hiện khi chạy smoke test thật, đã sửa và xác minh
  lại bằng `npm run dev` + curl thật.
- Mobile CHƯA có UI "Đăng nhập bằng Google" (backend đã hỗ trợ `/auth/google`
  từ trước B1). Nếu muốn `login-phone.tsx` thật sự hướng người dùng sang
  Google (không chỉ email), cần thêm hạng mục tích hợp `expo-auth-session` +
  OAuth client ID cho iOS/Android — ngoài phạm vi B1, cần thông tin từ Google
  Cloud Console.
- `mobile/src/lib/data.ts` hiện tái xuất 100% từ mock cho mọi thứ ngoài auth.
  Từ B3 trở đi, từng hàm sẽ đổi dần sang mẫu
  `USE_MOCKS ? mock.fn : real.fn` khi backend có endpoint tương ứng.
- **B2**: job worker (`services/job.service.js`) mới có handler rỗng (log +
  đánh dấu `done`) — B4 phải cắm handler thật cho `reindex_article` và
  `purge_chunks` qua `registerJobHandler()`, không cần sửa lại phần lock/retry.
- **B2**: `admin/` chưa có test cho từng trang React (chỉ có test đối chiếu
  contract ở `lib/schemas.ts`). Với quy mô B2 (form CRUD, không có logic phức
  tạp phía client — máy trạng thái thật nằm ở backend đã có test), chấp nhận
  đánh đổi này để không kéo dài batch quá mức; nên bổ sung test component
  (React Testing Library) nếu về sau `admin/` có thêm logic phía client.
- Google login (`googleLogin`, `linkGoogle`) và quên mật khẩu chưa có test
  tích hợp — B1 chỉ đổi envelope bọc ngoài, logic nghiệp vụ giữ nguyên từ
  trước, rủi ro thấp nhưng nên bổ sung test khi có `GOOGLE_CLIENT_ID`/SMTP thật.
