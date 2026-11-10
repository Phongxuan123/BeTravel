# TRIỂN KHAI BE.TRAVEL — TỪ ZERO

Hướng dẫn này giả định chưa có gì ngoài source code. Thứ tự bắt buộc:
**Atlas → backend (Render) → admin (Vercel) → mobile (EAS)**, vì admin và
mobile đều cần `EXPO_PUBLIC_API_URL`/`VITE_API_BASE_URL` trỏ tới backend đã chạy.

> [!] Đã triển khai thật ngày 08/11/2026:
> - Backend: https://betravel-backend.onrender.com (Render, Blueprint `backend/render.yaml`)
> - Admin: https://betravel-admin.vercel.app (Vercel, project `betravel-admin`, root `admin`)
> - Chống ngủ: UptimeRobot ping `/api/health` mỗi 5 phút + workflow `keepalive.yml` dự phòng
> - Mobile: `mobile/eas.json` đã trỏ backend thật; APK build bằng EAS (mục 4)
>
> Các bước dưới đây giữ lại để dựng lại từ đầu khi cần.

## 1. MongoDB Atlas

1. Dự án đang dùng một cluster Atlas M0 chung cho cả nhóm (dữ liệu thật đã có: 25 bài cẩm nang Úc,
   luật liên bang Úc, vùng nguy cơ). Deploy dùng lại cluster này, **không cần seed lại**.
2. **Database Access** → tạo user riêng cho backend production, quyền `readWrite` trên database dự án.
3. **Network Access** → thêm `0.0.0.0/0` (Render dùng IP động).
4. Atlas Search/Vector index **không cần** với cấu hình hiện tại (`RETRIEVAL_MODE=lexical`,
   `SEARCH_DRIVER=memory`): backend nạp các đoạn luật vào RAM lúc khởi động (~175 MB, đo 08/11/2026).

## 2. Backend lên Render

1. [render.com](https://render.com) → **New → Blueprint**, kết nối repo GitHub, chọn file
   **`backend/render.yaml`**. File này đã khai sẵn mọi biến không bí mật (mô hình Gemini, chế độ tìm
   theo từ khoá, trợ lý AI bản 2, giá tính chi phí).
   Production dùng **Gemini** (`LLM_PROVIDER=gemini`, `gemini-3.5-flash-lite`): ngày 09/11/2026 mọi lời
   gọi APIZ từ Render (Singapore) đều hết thời gian chờ dù key đúng, trong khi từ máy local vẫn trả lời
   bình thường. Cấu hình APIZ (`OPENAI_*`) giữ lại để đổi về khi APIZ ổn định.
2. Render sẽ hỏi các biến bí mật (`sync: false`) — nhập tay:

   | Biến | Bắt buộc | Giá trị |
   |---|---|---|
   | `MONGODB_URI` | có | connection string của user production ở bước 1 |
   | `JWT_ACCESS_SECRET` | có | chuỗi ngẫu nhiên **ít nhất 32 ký tự**, KHÁC secret lúc dev (thiếu/ngắn thì backend không khởi động) |
   | `GEMINI_API_KEY` | có | key Gemini: trợ lý AI, bước phụ và dịch (`TRANSLATION_PROVIDER=default` dùng chung nhà cung cấp). Thiếu key thì backend không khởi động |
   | `OPENAI_API_KEY` | tuỳ chọn | key APIZ, chỉ cần khi đổi `LLM_PROVIDER` về `openai` |
   | `CORS_ORIGINS` | có | domain admin trên Vercel, vd `https://betravel-admin.vercel.app` |
   | `CLIENT_URL` | nên có | domain admin, dùng trong link email đặt lại mật khẩu |
   | `GOOGLE_CLIENT_ID` | tuỳ chọn | đăng nhập Google |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | tuỳ chọn | gửi email quên mật khẩu |

3. Deploy. Kiểm tra `GET https://<service>.onrender.com/api/health` trả `db: "connected"`.
   Log khởi động phải có dòng `[search] đã nạp ... chunk vào RAM`.
4. **Chống ngủ** (Render free ngủ sau ~15 phút không có request):
   - Chính: UptimeRobot (gói free) monitor HTTP(s) `https://<service>.onrender.com/api/health`,
     chu kỳ 5 phút. Kèm email báo khi backend sập.
   - Dự phòng: secret GitHub `BACKEND_HEALTH_URL` cho workflow `keepalive.yml`. Lịch cron của GitHub
     thực tế chạy cách nhau 3-7 giờ (đo 06-08/11/2026) nên KHÔNG đủ để giữ backend thức một mình.
   - 750 giờ free/tháng của Render chỉ đủ cho MỘT service chạy liên tục.
5. Tắt nhanh trợ lý AI khi cần: trang Admin → **Trợ lý AI** → công tắc (có hiệu lực ngay), hoặc đặt
   `ASSISTANT_ENABLED=false` trên Render (khoá chính, cần redeploy).

## 3. Admin Portal lên Vercel

1. [vercel.com](https://vercel.com) → **New Project** → import repo, chọn root directory `admin`.
2. Build command: `npm run build` (mặc định Vercel tự nhận Vite). Output directory: `dist`.
3. **Environment Variables**: `VITE_API_BASE_URL = https://<service>.onrender.com/api`.
   `admin/vercel.json` đã chuyển mọi đường dẫn về `index.html` để tải lại trang con không bị 404.
4. Deploy. Đăng nhập bằng tài khoản admin đã tạo ở bước 2.5.
5. Quay lại Render, cập nhật `CORS_ORIGINS` thành đúng domain Vercel vừa có (vd `https://betravel-admin.vercel.app`), redeploy backend.

## 4. Mobile — build bằng EAS

1. Cài `eas-cli`: `npm install -g eas-cli`, đăng nhập `eas login` bằng tài khoản Expo.
2. Bản đồ: `eas.json` ép `EXPO_PUBLIC_MAP_TILES=osm` (Leaflet trong WebView), không cần key Google
   Maps; `EXPO_PUBLIC_MAP_REFERER` là domain admin vì máy chủ ô OSM chặn request không có Referer.
3. `mobile/eas.json` (profile `preview` = APK nội bộ, `production`) đã trỏ
   `EXPO_PUBLIC_API_URL=https://betravel-backend.onrender.com/api`, tắt mock, bật trợ lý AI.
   Mã gói `com.betravel.app` khai trong `app.json` (bản dev local vẫn là `com.betravel.dev`).
4. Gắn project Expo (một lần, TRƯỚC lần build đầu): `cd mobile && eas init` --> ghi
   `extra.eas.projectId` vào `app.json`. Commit + merge thay đổi đó. `app.config.js` tự suy ra
   `updates.url = https://u.expo.dev/<projectId>`, không cần `eas update:configure`.
5. Build APK để nộp bài / demo:
   ```bash
   cd mobile
   eas build --platform android --profile preview
   ```
   Build chạy trên máy chủ Expo (không cần máy có Android SDK), xong sẽ có link tải `.apk` trực tiếp.
   Dự án Expo hiện tại: `@xuanphong123/FE`; keystore ký APK lưu trên máy chủ Expo.
   File `.apk/.aab/.ipa` đã bị chặn trong `.gitignore`, không đưa lên GitHub.
   Cài thử trên LDPlayer 9: bật ADB trong cài đặt máy ảo, rồi `adb install <file>.apk`
   (Git Bash cần `MSYS_NO_PATHCONV=1` để không đổi đường dẫn thiết bị).
6. **Cập nhật không cần cài lại APK (EAS Update)**:
   - Code JS/TS hoặc hình ảnh trong `mobile/` merge vào `main` --> workflow
     `.github/workflows/eas-update.yml` chạy `eas update --channel preview --platform android`
     (app không có bản web). App đã cài tải bản mới
     khi mở, áp dụng ở lần mở kế tiếp.
   - Cần secret GitHub `EXPO_TOKEN` (expo.dev → Account settings → Access tokens). Thiếu secret thì
     workflow bỏ qua, không lỗi.
   - `runtimeVersion` theo `version` trong `app.json`. Đổi phần native (thêm thư viện native, quyền,
     icon, plugin trong `app.json`) --> **tăng `version`** (vd 1.0.0 → 1.1.0)
     rồi build APK mới; APK cũ không nhận bản cập nhật của runtime mới nên không bị vỡ.
   - Biến `EXPO_PUBLIC_*` trong `eas.json` (profile preview) được workflow nạp lại mỗi lần phát, đổi
     chúng không cần build lại.
   - Không tăng `version` khi đổi native là lỗi nặng: APK cũ nhận JS cần mã native nó không có --> crash.
7. iOS cần tài khoản Apple Developer (99 USD/năm) để build/ký thật — nếu không có, dùng Expo Go quét QR code với `npx expo start` để demo trên iOS thay vì build.

## 5. Kiểm tra sau triển khai

```
□ GET /api/health trả db:"connected"
□ Admin đăng nhập được
□ Mobile (build APK hoặc Expo Go) trỏ đúng EXPO_PUBLIC_API_URL, KHÔNG dùng mock
□ Log backend có "[search] đã nạp ... chunk vào RAM"; hỏi thử Trợ lý AI trên app ra nhãn nguồn
□ Trang Admin "Trợ lý AI": công tắc bật, biểu đồ có chi phí
□ UptimeRobot báo Up; keepalive workflow có log trả {"ok":true,...}
□ CORS_ORIGINS khớp đúng domain admin thật -- không còn localhost trong prod
```

## 6. Phương án dự phòng khi demo

- Trợ lý AI trả lời lỗi giữa buổi demo (nhà cung cấp mô hình trục trặc): tắt bằng công tắc trên Admin; tab Trợ lý AI báo tạm ngưng, các phần khác của app vẫn chạy.
- Backend Render chưa "thức dậy" kịp (UptimeRobot tạm dừng/hết giờ free): mở `/api/health` trước khi demo 5-10 phút.
- Mạng demo yếu / API lỗi: đặt `EXPO_PUBLIC_USE_MOCKS=true` trong build mobile dự phòng, app chạy lại bằng dữ liệu giả lập.
