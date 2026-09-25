# TRIỂN KHAI BE.TRAVEL — TỪ ZERO

Hướng dẫn này giả định chưa có gì ngoài source code. Thứ tự bắt buộc:
**Atlas → backend (Render) → admin (Vercel) → mobile (EAS)**, vì admin và
mobile đều cần `EXPO_PUBLIC_API_URL`/`VITE_API_URL` trỏ tới backend đã chạy.

> [!] Không có bước nào ở đây được tự động hoá bởi AI — cần tài khoản thật
> (MongoDB Atlas, Render, Vercel, Expo/EAS, Google Cloud cho Gemini + Maps)
> và người có quyền truy cập các dịch vụ đó thực hiện. Tài liệu này là bản
> hướng dẫn từng bước, không phải nhật ký đã thực thi.

## 1. MongoDB Atlas

1. Tạo cluster free tier (M0) tại [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Database Access** → tạo user riêng cho backend (không dùng tài khoản Atlas chính), quyền `readWrite` trên database dự án.
3. **Network Access** → thêm `0.0.0.0/0` (Render dùng IP động) hoặc dải IP tĩnh nếu Render cung cấp.
4. Lấy connection string dạng `mongodb+srv://<user>:<password>@<cluster-host>/<database>`.
5. **Atlas Search + Vector Search** (bắt buộc cho RAG B4, không có trên MongoDB local/self-host): làm theo **`docs/atlas-indexes.md`** — tạo `vec_idx` (Vector Search) và `txt_idx` (Atlas Search) trên collection `legal_chunks`. **Chờ cả hai ở trạng thái `ACTIVE`** trước khi reindex (đôi khi mất vài phút, xem mục 3 của tài liệu đó).
6. Ngân sách 3 index/M0: đã dùng 2 (`vec_idx` + `txt_idx`), còn 1 dự phòng — không tạo thêm ở collection khác (CLAUDE.md mục 4.1).

## 2. Backend lên Render

1. Đăng nhập [render.com](https://render.com), **New → Web Service**, kết nối repo GitHub.
2. Render đọc **`backend/render.yaml`** (Blueprint) — hoặc cấu hình thủ công:
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check path: `/api/health`
3. **Environment** tab — khai các biến sau (không có trong `render.yaml`, phải nhập tay vì là bí mật):
   | Biến | Giá trị |
   |---|---|
   | `MONGODB_URI` | connection string ở bước 1 |
   | `JWT_ACCESS_SECRET` | chuỗi ngẫu nhiên dài, KHÁC với secret dùng lúc dev |
   | `GEMINI_API_KEY` | API key thật từ Google AI Studio |
   | `CORS_ORIGINS` | domain admin thật trên Vercel (vd `https://betravel-admin.vercel.app`), phân cách dấu phẩy nếu nhiều origin |
   | `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | tài khoản admin đầu tiên — **đổi mật khẩu ngay** sau khi đăng nhập lần đầu |
4. Deploy. Xác nhận `GET https://<service>.onrender.com/api/health` trả `{"ok":true,"data":{"db":"connected",...}}`.
5. SSH/Shell vào service (Render Dashboard → Shell) hoặc chạy cục bộ với `MONGODB_URI` trỏ tới Atlas thật:
   ```bash
   npm run seed        # hoặc npm run seed:demo (seed + reindex bài đã published)
   ```
6. **Chống Render free tier ngủ**: repo đã có `.github/workflows/keepalive.yml` (cron `*/10 * * * *` ping `/api/health`). Vào **Settings → Secrets and variables → Actions** của repo GitHub, thêm secret `BACKEND_HEALTH_URL = https://<service>.onrender.com/api/health`. Vào tab **Actions**, chạy thử workflow bằng nút "Run workflow" để xác nhận ping thành công trước khi tin vào lịch cron.

## 3. Admin Portal lên Vercel

1. [vercel.com](https://vercel.com) → **New Project** → import repo, chọn root directory `admin`.
2. Build command: `npm run build` (mặc định Vercel tự nhận Vite). Output directory: `dist`.
3. **Environment Variables**: `VITE_API_URL = https://<service>.onrender.com/api`.
4. Deploy. Đăng nhập bằng tài khoản admin đã tạo ở bước 2.5.
5. Quay lại Render, cập nhật `CORS_ORIGINS` thành đúng domain Vercel vừa có (vd `https://betravel-admin.vercel.app`), redeploy backend.

## 4. Mobile — build bằng EAS

1. Cài `eas-cli`: `npm install -g eas-cli`, đăng nhập `eas login` bằng tài khoản Expo.
2. `mobile/app.json` cần `android.config.googleMaps.apiKey` là **key Google Maps thật** (hiện đang là placeholder `REPLACE_WITH_REAL_ANDROID_MAPS_API_KEY`) — tạo tại Google Cloud Console, bật **Maps SDK for Android**, và **đặt quota cap** cho key này (CLAUDE.md Phần 6 "Cạm bẫy đã biết" — hoá đơn bất ngờ nếu không giới hạn).
3. `mobile/eas.json` đã có profile `preview` (APK nội bộ) và `production` — sửa `EXPO_PUBLIC_API_URL` trong cả hai profile thành domain Render thật (hiện đang là placeholder).
4. Build APK để nộp bài / demo:
   ```bash
   cd mobile
   eas build --platform android --profile preview
   ```
   Build chạy trên máy chủ Expo (không cần máy có Android SDK), xong sẽ có link tải `.apk` trực tiếp.
5. iOS cần tài khoản Apple Developer (99 USD/năm) để build/ký thật — nếu không có, dùng Expo Go quét QR code với `npx expo start` để demo trên iOS thay vì build.

## 5. Kiểm tra sau triển khai

```
□ GET /api/health trả db:"connected"
□ Admin đăng nhập được, đổi mật khẩu mặc định
□ Mobile (build APK hoặc Expo Go) trỏ đúng EXPO_PUBLIC_API_URL, KHÔNG dùng mock
□ Atlas Search 2 index đều ACTIVE, npm run seed:demo reindex không lỗi
□ Keepalive workflow đã chạy ít nhất 1 lần thành công (tab Actions)
□ CORS_ORIGINS khớp đúng domain admin thật -- không còn localhost trong prod
```

## 6. Phương án dự phòng khi demo

- Atlas Search trục trặc giữa buổi demo: đặt `SEARCH_DRIVER=memory` trên Render, redeploy — RAG chuyển sang driver không phụ thuộc Atlas Search (vẫn cần Atlas cho dữ liệu thường, chỉ tắt riêng Search).
- Backend Render chưa "thức dậy" kịp: mở `/api/health` vài lần trước khi demo 5-10 phút.
- Mạng demo yếu / API lỗi: đặt `EXPO_PUBLIC_USE_MOCKS=true` trong build mobile dự phòng, app chạy lại bằng dữ liệu giả lập.
