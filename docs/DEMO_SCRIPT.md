# KỊCH BẢN DEMO BE.TRAVEL

Kịch bản này giả định môi trường đã triển khai theo `docs/DEPLOY.md` và đã
chạy `npm run seed:demo`. Nếu chỉ demo cục bộ (chưa deploy), thay các bước
"mở app đã build" bằng `npx expo start` + Expo Go, và backend chạy
`npm run dev` tại chỗ.

## CHECKLIST TRƯỚC DEMO 30 PHÚT

```
□ Warm-up API: mở https://<backend>/api/health trên trình duyệt vài lần,
  chờ đến khi trả về nhanh (Render free tier có thể mất ~50s lần đầu)
□ Kiểm tra quota AI còn lại (Google AI Studio -- Gemini). Chuẩn bị
  GEMINI_API_KEY dự phòng nếu quota gần hết, đổi trên Render + restart
□ Chạy `npm run seed:demo` trên môi trường demo (idempotent, an toàn chạy
  lại) -- đảm bảo dữ liệu mẫu còn nguyên
□ Mở sẵn 1 tab trình duyệt đã đăng nhập Admin Portal (đỡ phải gõ lại
  mật khẩu giữa lúc demo)
□ Chuẩn bị phương án dự phòng SEARCH_DRIVER=memory trên Render nếu Atlas
  Search trục trặc (xem docs/DEPLOY.md mục 6)
□ Điện thoại demo: sạc đầy pin, tắt thông báo, bật chế độ không làm phiền,
  kiểm tra Wi-Fi/4G ổn định
□ Nếu mạng demo không tin cậy: chuẩn bị sẵn 1 build mobile dự phòng với
  EXPO_PUBLIC_USE_MOCKS=true để không bị đứng hình giữa buổi
```

## KỊCH BẢN CHÍNH (ước lượng 12-15 phút)

Mỗi bước ghi: **[Bấm gì]** — *Nói gì*.

### 1. Đăng ký & chọn quốc gia (1 phút)

**[Mở app → Đăng ký]** — *"Be.Travel hỗ trợ pháp lý cho người Việt đi làm/du
lịch nước ngoài, thị trường đầu tiên là Hàn Quốc."*
Điền họ tên, email, số điện thoại, mật khẩu → Đăng ký.
**[Chọn quốc gia Hàn Quốc ở màn hình chính]**.

### 2. Cẩm nang pháp lý — thấy nguồn thật (2 phút)

**[Tab Khám phá → chọn chủ đề "Nhập cảnh"]**
**[Mở bài "Người Việt cần visa để vào Hàn Quốc"]**
*"Mỗi bài đều ghi rõ nguồn (cơ quan nào, link nào) và ngày cập nhật — không
phải nội dung tự AI bịa ra."* — **[Cuộn xuống mục "Nguồn pháp lý"]**, chỉ vào
link + ngày truy cập.

### 3. Tìm kiếm (1 phút)

**[Tab Khám phá → ô tìm kiếm → gõ "quá hạn visa"]**
*"Tìm không dấu vẫn ra kết quả đúng."*

### 4. Hỏi AI — có nguồn (2 phút)

**[Tab AI Legal → hỏi "Ở quá hạn visa Hàn Quốc bị phạt bao nhiêu?"]**
*"AI trả lời kèm marker [S1], [S2] — bấm vào để mở đúng bài luật đã trích
dẫn. Đây là RAG thật, không phải ChatGPT trả lời chung chung."*

### 5. Hỏi câu ngoài dữ liệu — AI biết từ chối (1 phút)

**[Hỏi một câu chắc chắn không có trong kho dữ liệu, vd "Luật ly hôn ở Hàn
Quốc thế nào?"]**
*"Khi không đủ dữ liệu đã kiểm chứng, hệ thống nói rõ 'chưa đủ thông tin'
thay vì suy đoán — đây là điểm khác biệt cốt lõi so với chatbot thông
thường."*

### 6. SOS trong tối đa 2 thao tác (1 phút)

**[Bấm nút SOS đỏ ở thanh điều hướng dưới]** → **[Bấm "Đại sứ quán" hoặc mở
bản đồ]**
*"Từ bất kỳ màn hình nào, tối đa 2 lần chạm là ra được số khẩn cấp hoặc bản
đồ điểm hỗ trợ gần nhất."*

### 7. Xử lý sự cố — mất hộ chiếu (1-2 phút)

**[Tab Khám phá hoặc từ SOS Hub → "Mất hộ chiếu"]**
**[Tick hoàn thành bước 1, đăng xuất rồi đăng nhập lại]**
*"Tiến độ các bước đã tick được lưu trên server theo từng tài khoản, không
mất khi đổi máy hoặc đăng nhập lại."*

### 8. Admin sửa bài + re-index → AI dùng dữ liệu mới (2-3 phút)

**[Chuyển sang tab Admin Portal đã đăng nhập sẵn]**
**[Mở bài luật vừa demo ở bước 2, sửa một chi tiết nhỏ (vd thêm 1 câu vào
"Tóm tắt"), Lưu]**
**[Chuyển trạng thái bài sang "Đã xuất bản" nếu chưa]**
**[Vào "RAG Index" → chọn KR → "Reindex quốc gia"]**
*"Chờ khoảng 10-20 giây để job chạy nền."*
**[Quay lại app, hỏi AI lại đúng câu ở bước 4]**
*"Câu trả lời đã cập nhật theo nội dung admin vừa sửa — chứng minh pipeline
RAG đọc dữ liệu sống, không phải câu trả lời cứng."*

### 9. User báo sai → Admin xử lý (1-2 phút)

**[Ở câu trả lời AI bất kỳ, bấm "Báo sai", nhập ghi chú, gửi]**
**[Chuyển sang Admin Portal → tab "Feedback" → mở báo cáo vừa gửi →
"Đánh dấu đã xử lý"]**
*"Vòng lặp phản hồi: người dùng báo cáo, đội nội dung xử lý qua Admin
Portal, không cần sửa code."*

## SAU DEMO — CÂU HỎI THƯỜNG GẶP

- **"Dữ liệu pháp lý có bao nhiêu bài thật?"** — 8 bài luật KR có nguồn thật
  (xem `docs/06_Legal_Content_Seed_KR.md`), hiện ở trạng thái nháp chờ đội
  nội dung đối chiếu trước khi xuất bản đại trà; demo dùng 1-2 bài đã publish
  thủ công để minh hoạ luồng.
- **"Vì sao không seed sẵn điểm SOS/cảnh báo vị trí thật?"** — Toạ độ GPS và
  tình hình an ninh thời gian thực không được phép suy đoán (nguyên tắc
  "8 bài có nguồn thật tốt hơn 20 bài bịa nguồn", CLAUDE.md) — đây là dữ liệu
  cần người phụ trách xác minh qua điện thoại/theo dõi tin tức thật, không
  phải giới hạn kỹ thuật.
