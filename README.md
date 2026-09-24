# Be.Travel

Ứng dụng di động hỗ trợ pháp lý cho người Việt du lịch/lao động nước ngoài. Thị trường đầu tiên: **Hàn Quốc (KR)**.

Bốn lớp sản phẩm:

1. **Kho tri thức pháp lý đã kiểm chứng** — có nguồn, có version, có ngày hiệu lực.
2. **Trợ lý AI dùng RAG** — luôn trích dẫn nguồn, **từ chối trả lời khi không đủ dữ liệu** thay vì suy đoán.
3. **Hỗ trợ tại chỗ (SOS)** — bản đồ đại sứ quán/bệnh viện/công an, gọi khẩn cấp, chỉ đường.
4. **Admin Portal** — nơi đội nội dung duy trì và kiểm duyệt dữ liệu của lớp 1.

## Kiến trúc

Ba workspace độc lập (không dùng npm workspaces — Metro bundler của Expo cộng monorepo là nguồn lỗi lớn):

```
BeTravel/
├─ contracts/   nguồn sự thật duy nhất về hình dạng API (README.md + fixtures/*.json)
├─ backend/     Express 5 · Mongoose 9 · Zod 4 · JavaScript ESM
├─ mobile/      Expo 57 · expo-router · NativeWind · TypeScript
├─ admin/       Vite · React · TypeScript · Tailwind
└─ docs/        kiến trúc, tiến độ, quy ước code, hướng dẫn vận hành
```

Backend dùng MongoDB Atlas (bắt buộc, kể cả lúc dev — Atlas Search/Vector Search không có ở MongoDB local). Trợ lý AI dùng Google Gemini (embedding + LLM), có provider giả lập (`mock`) để chạy test/CI không tốn chi phí.

## Bắt đầu

Yêu cầu: Node.js 20+, một cluster MongoDB Atlas (free tier M0 là đủ), Expo Go trên điện thoại (hoặc simulator) để chạy mobile.

### Backend

```bash
cd backend
npm install
cp .env.example .env   # điền MONGODB_URI, JWT secret, GEMINI_API_KEY...
npm run dev
```

Lệnh hữu ích khác: `npm run test` (unit + integration), `npm run test:golden` (kiểm tra chất lượng RAG bằng bộ câu hỏi cố định), `npm run seed` (nạp dữ liệu mẫu 4 quốc gia + nội dung pháp lý KR), `npm run create-admin` (tạo tài khoản admin đầu tiên).

### Mobile

```bash
cd mobile
npx expo install   # KHÔNG dùng npm install cho mobile
cp .env.example .env
npx expo start
```

Quét mã QR bằng Expo Go. Backend chạy trên máy dev thì app tự suy ra IP LAN từ Metro — không cần sửa `.env` mỗi khi đổi mạng. Muốn chạy nhanh không cần backend: đặt `EXPO_PUBLIC_USE_MOCKS=true` để dùng dữ liệu giả lập sẵn có trong `src/mocks/`.

### Admin Portal

```bash
cd admin
npm install
cp .env.example .env
npm run dev
```

## Tài liệu

- [`CLAUDE.md`](CLAUDE.md) — quy trình vận hành, lộ trình batch, 13 quy tắc viết code. Đọc trước khi đóng góp.
- [`docs/00_BeTravel_MasterPlan_v2.md`](docs/00_BeTravel_MasterPlan_v2.md) — kiến trúc, mô hình dữ liệu, rủi ro đã lường trước.
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — sổ tiến độ theo batch, quyết định kỹ thuật, việc còn vướng.
- [`docs/OPTIMIZATION_REPORT.md`](docs/OPTIMIZATION_REPORT.md) — sổ tối ưu, bug đã sửa theo từng batch.
- [`contracts/README.md`](contracts/README.md) — đặc tả toàn bộ API (path, request, response, mã lỗi).

## Tiến độ

| Batch | Nội dung | Trạng thái |
|---|---|---|
| B1 | Auth thật (đăng ký/đăng nhập/refresh token) | ✅ |
| B2 | Content backbone + Admin Portal | ✅ |
| B3 | API công khai (countries/legal/trips) + nối mobile | ✅ |
| B4 | RAG engine + guardrail chống ảo giác | ✅ |
| B5 | Chat mobile + feedback | ✅ |
| B6 | SOS: bản đồ + điểm hỗ trợ | ✅ (chờ dữ liệu thật đã xác minh) |
| B7 | Incidents + dịch khẩn cấp | chưa làm |
| B8 | Cảnh báo vị trí + hồ sơ cá nhân | chưa làm |
| B9 | Hardening, seed, build, demo | chưa làm |

Chi tiết từng quyết định kỹ thuật và việc còn tồn đọng: xem [`docs/PROGRESS.md`](docs/PROGRESS.md).
