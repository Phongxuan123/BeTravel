# TIEN DO BE.TRAVEL

Cập nhật lần cuối: 2026-09-22 · Phiên: B1 — Hợp nhất contract & nối auth thật (đã điều chỉnh theo phản hồi)

| Batch | Trạng thái | Ngày | Ghi chú |
|---|---|---|---|
| B1 Auth thật            | xong | 2026-09-22 | Envelope {ok,data}, auth thật nối mobile, refresh xoay vòng + ân hạn |
| B2 Content + Admin      | chưa làm | | |
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
- Google login (`googleLogin`, `linkGoogle`) và quên mật khẩu chưa có test
  tích hợp — B1 chỉ đổi envelope bọc ngoài, logic nghiệp vụ giữ nguyên từ
  trước, rủi ro thấp nhưng nên bổ sung test khi có `GOOGLE_CLIENT_ID`/SMTP thật.
