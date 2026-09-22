# TIEN DO BE.TRAVEL

Cập nhật lần cuối: 2026-09-22 · Phiên: B1 — Hợp nhất contract & nối auth thật

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

1. **Phone không còn bắt buộc ở đăng ký** (khác với comment cũ trong
   `auth.validator.js`). Màn hình `register.tsx` của mobile không có ô nhập số
   điện thoại và không được sửa (luật "không sửa màn hình khi nối API"). Bắt
   buộc phone ở validator sẽ chặn mọi lượt đăng ký thật từ app. Đổi
   `phone: vietnamPhoneSchema` thành `.optional()`, và bỏ kiểm trùng khi phone
   rỗng ở `auth.service.js`. Khi UI thêm ô số điện thoại (B8 profile?), giá trị
   gửi lên vẫn được validate đúng định dạng.
2. **`loginWithPhone` là placeholder "đang phát triển"**, không nối API thật.
   Lý do: OTP qua SMS cần dịch vụ SMS ngoài, nằm ngoài ngân sách/phạm vi MVP
   (CLAUDE.md Phần 4.4 liệt kê "dịch giọng nói/OCR..." tương tự, và không có
   nhà cung cấp SMS nào được cấu hình trong `.env`). Màn hình `login-phone.tsx`
   giữ nguyên, chỉ đổi hành vi khi bấm xác nhận thành thông báo lỗi rõ ràng
   thay vì tạo phiên giả.
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

- **Thiếu `backend/.env`** — chưa có `MONGODB_URI` Atlas thật, `JWT_ACCESS_SECRET`,
  `GOOGLE_CLIENT_ID`, SMTP. Toàn bộ code + test đã chạy được với
  `mongodb-memory-server` (không cần Atlas cho B1), nhưng CHẠY THẬT
  (`npm run dev`) cần người điền `.env` theo `backend/.env.example`.
- **Chưa xác minh trên thiết bị/emulator thật**: "đăng nhập → đóng app → mở
  lại → vẫn đăng nhập" chỉ được xác minh bằng test tích hợp backend (xoay
  vòng + ân hạn + reuse detection đều xanh), CHƯA chạy trên Expo Go thật vì
  cần `backend/.env` + `EXPO_PUBLIC_API_URL` trỏ IP LAN. Người cần tự kiểm khi
  có môi trường.
- **Google Client ID / SMTP chưa cấu hình** — các luồng Google login và quên
  mật khẩu giữ nguyên logic cũ (không đổi ở B1 ngoài đổi envelope), nhưng
  không test được đầu-cuối nếu thiếu các key này.

## Nợ kỹ thuật

- `loginWithPhone` là placeholder, chưa có backend OTP SMS thật — nợ này chỉ
  trả khi có quyết định dùng dịch vụ SMS nào (nằm ngoài MVP theo CLAUDE.md).
- `mobile/src/lib/data.ts` hiện tái xuất 100% từ mock cho mọi thứ ngoài auth.
  Từ B3 trở đi, từng hàm sẽ đổi dần sang mẫu
  `USE_MOCKS ? mock.fn : real.fn` khi backend có endpoint tương ứng.
- Google login (`googleLogin`, `linkGoogle`) và quên mật khẩu chưa có test
  tích hợp — B1 chỉ đổi envelope bọc ngoài, logic nghiệp vụ giữ nguyên từ
  trước, rủi ro thấp nhưng nên bổ sung test khi có `GOOGLE_CLIENT_ID`/SMTP thật.
