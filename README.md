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

Yêu cầu: Node.js 22.13+, một cluster MongoDB Atlas (free tier M0 là đủ), Expo Go trên điện thoại (hoặc simulator) để chạy mobile.

### Backend

```bash
cd backend
npm install
cp .env.example .env   # điền MONGODB_URI, JWT secret, GEMINI_API_KEY...
npm run dev
```

Lệnh hữu ích khác: `npm run test` (unit + integration), `npm run test:golden` (kiểm tra chất lượng RAG bằng bộ câu hỏi cố định), `npm run seed` (nạp dữ liệu mẫu: 4 quốc gia, 8 bài luật KR có nguồn thật ở trạng thái nháp, 1 admin, 5 hướng dẫn xử lý sự cố, 25 câu dịch sẵn — **không** seed điểm SOS/cảnh báo vị trí, xem `docs/PROGRESS.md`), `npm run seed:demo` (seed + reindex bài đã xuất bản), `npm run create-admin` (tạo/nâng quyền admin theo email tuỳ chỉnh).

### Mobile

```bash
cd mobile
npx expo install   # KHÔNG dùng npm install cho mobile
cp .env.example .env
npx expo start
```

Quét mã QR bằng Expo Go. Khi không khai báo `EXPO_PUBLIC_API_URL`, app dev tự suy ra IP LAN từ Metro. Nếu khai báo, URL này được ưu tiên cả dev và production. Muốn chạy nhanh không cần backend: đặt `EXPO_PUBLIC_USE_MOCKS=true` để dùng dữ liệu giả lập sẵn có trong `src/mocks/`.

### Admin Portal

```bash
cd admin
npm install
cp .env.example .env
npm run dev
```

## Thêm một quốc gia mới

Không hard-code quốc gia vào business logic — mọi thứ đi qua dữ liệu:

1. Admin Portal → **Quốc gia** → thêm bản ghi mới (mã ISO-2, tên, ngôn ngữ, số khẩn cấp, thông tin đại sứ quán). Đặt `status:'coming_soon'` cho tới khi có đủ nội dung.
2. Thêm **Chủ đề** và **Bài luật** (có nguồn thật, xuất bản qua máy trạng thái draft → pending_review → published) cho quốc gia đó.
3. Chạy **RAG Index** → Reindex quốc gia để trợ lý AI có dữ liệu.
4. Nhập **Điểm hỗ trợ** (SOS) qua CSV đã xác minh thật, **Cảnh báo vị trí** nếu cần, **Câu dịch sẵn** cho ngôn ngữ bản địa.
5. Đổi `status` sang `active` khi nội dung đủ dùng — mobile tự nhận quốc gia mới ở màn hình chọn quốc gia, không cần sửa code.

## Tài liệu

- [`CLAUDE.md`](CLAUDE.md) — quy trình vận hành, lộ trình batch, 13 quy tắc viết code. Đọc trước khi đóng góp.
- [`docs/00_BeTravel_MasterPlan_v2.md`](docs/00_BeTravel_MasterPlan_v2.md) — kiến trúc, mô hình dữ liệu, rủi ro đã lường trước.
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — sổ tiến độ theo batch, quyết định kỹ thuật, việc còn vướng.
- [`docs/OPTIMIZATION_REPORT.md`](docs/OPTIMIZATION_REPORT.md) — sổ tối ưu, bug đã sửa theo từng batch.
- [`contracts/README.md`](contracts/README.md) — đặc tả toàn bộ API (path, request, response, mã lỗi).
- [`docs/API.md`](docs/API.md) — bảng tra cứu nhanh mọi endpoint.
- [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md) — đối chiếu AC-01..AC-12 với bằng chứng cụ thể.
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — triển khai từ zero: Atlas → Render → Vercel → EAS.
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — kịch bản demo + checklist trước demo 30 phút.
- [`docs/atlas-indexes.md`](docs/atlas-indexes.md) — tạo 2 Atlas Search index cho RAG.

## Tiến độ

| Batch | Nội dung | Trạng thái |
|---|---|---|
| B1 | Auth thật (đăng ký/đăng nhập/refresh token) | ✅ |
| B2 | Content backbone + Admin Portal | ✅ |
| B3 | API công khai (countries/legal/trips) + nối mobile | ✅ |
| B4 | RAG engine + guardrail chống ảo giác | ✅ |
| B5 | Chat mobile + feedback | ✅ |
| B6 | SOS: bản đồ + điểm hỗ trợ | ✅ (chờ dữ liệu thật đã xác minh) |
| B7 | Incidents + dịch khẩn cấp | ✅ |
| B8 | Cảnh báo vị trí + hồ sơ cá nhân | ✅ |
| B9 | Hardening, seed, build, demo | một phần: mã nguồn/seed/QA/tài liệu bàn giao xong; còn triển khai thật (Render/Vercel/EAS) và kiểm tra thiết bị thật |

Chi tiết từng quyết định kỹ thuật và việc còn tồn đọng: xem [`docs/PROGRESS.md`](docs/PROGRESS.md).

## Rà soát 24/09/2026

Đã sửa các lỗi phát hiện ở API, auth, quota/job/RAG, SOS, admin và mobile.
Kết quả nghiệm thu và những việc cần người phụ trách dữ liệu được ghi ở đầu
[`docs/PROGRESS.md`](docs/PROGRESS.md); nguyên nhân và thay đổi từng file ở
[`docs/OPTIMIZATION_REPORT.md`](docs/OPTIMIZATION_REPORT.md).

Mobile có `patch-package` chạy trong postinstall để giữ Expo Router tương thích
với decoder đã vá bảo mật. Giữ thư mục `mobile/patches/` khi cài đặt lại.
