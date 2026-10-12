# Tài Liệu Đặc Tả Giao Diện Frontend (UI/UX Specification) — Be.Travel

**Tên dự án:** Be.Travel — Trợ Lý Pháp Lý & An Toàn Du Lịch Quốc Tế  
**Đối tượng người dùng:** Du khách trẻ Việt Nam, du học sinh, người đi công tác và người lần đầu xuất ngoại.  
**Định hướng thiết kế:** *"Be.Travel = Your smart legal travel companion"* — Kết hợp giữa ứng dụng du lịch hiện đại, trợ lý an toàn cá nhân, nền tảng thông tin pháp lý chính thống và trợ lý AI thông minh.

---

## 1. Hệ Thống Thiết Kế (Design System & Visual Identity)

### 1.1. Bảng Màu Chủ Đạo (Color Palette)
Giao diện sử dụng tỷ lệ màu **60-30-10** với tông **Xanh Dương & Trắng** làm nhận diện thương hiệu cốt lõi, tạo cảm giác tin cậy, hiện đại và quốc tế, đồng thời dành riêng màu **Đỏ** cho các tác vụ khẩn cấp (SOS).

| Nhóm màu | Tên màu | Mã Hex | Ứng dụng trong UI |
| :--- | :--- | :--- | :--- |
| **Primary** | Brand Blue | `#1677FF` | Nút hành động chính (Primary CTA), trạng thái đang chọn (Active tab), icon điểm nhấn, liên kết chính. |
| **Primary** | Deep Blue | `#0B5ED7` | Trạng thái Hover/Active của nút chính, tiêu đề phụ trong thẻ thông tin pháp lý. |
| **Primary** | Pure White | `#FFFFFF` | Bề mặt thẻ (Card surface), thanh điều hướng (Top bar, Bottom bar), Bottom Sheet. |
| **Secondary** | Light Blue | `#EAF4FF` | Nền nút phụ (Secondary button), nền icon thao tác nhanh, khung tóm tắt pháp lý. |
| **Secondary** | Very Light Blue | `#F5F9FF` | Nền tổng thể của ứng dụng (App Canvas), nền ô nhập liệu (Input field). |
| **Neutral** | Dark Navy | `#102A43` | Màu chữ chính (Heading, Body text), nền thẻ dịch thuật độ tương phản cao, viền khung thiết bị. |
| **Neutral** | Slate Gray | `#6B7280` | Chữ mô tả phụ (Subtitle, Metadata, Timestamp), icon trạng thái chưa chọn. |
| **Neutral** | Border / Light Gray | `#E2E8F0` / `#F3F4F6` | Đường kẻ phân cách mảnh (1px hairline border), đường chia danh sách. |
| **Semantic** | Emergency / SOS Red | `#EF4444` | Nút khẩn cấp SOS, nút gọi Cảnh sát/Cấp cứu, cảnh báo mức độ Critical, danh sách "Điều cần tránh". |
| **Semantic** | Verified / Success Green | `#22C55E` | Nhãn "Đã xác minh" (Verified source), trạng thái "Đang mở cửa", danh sách "Việc nên làm". |
| **Semantic** | Warning Amber | `#D97706` / `#F59E0B` | Cảnh báo mức độ Cao (High severity), trạng thái chờ xác minh (Pending verification). |

---

### 1.2. Hệ Thống Chữ (Typography)
Ứng dụng đảm bảo hiển thị tiếng Việt hoàn hảo, rõ nét ở mọi kích cỡ màn hình:
- **Font chữ chính (Display & Body):** `Plus Jakarta Sans` (Các độ đậm: Regular `400`, Medium `500`, SemiBold `600`, Bold `700`, ExtraBold `800`).
- **Font chữ số liệu & mã hiệu (Monospace & Tabular Numerals):** `JetBrains Mono` kết hợp thuộc tính `font-variant-numeric: tabular-nums` cho toàn bộ số điện thoại khẩn cấp, tọa độ GPS, khoảng cách km, ngày cập nhật và bảng dữ liệu Admin.
- **Thang phân cấp chữ (Type Scale):**
  - **Tiêu đề trang (Page Title):** `20px – 24px` (`text-xl` đến `text-2xl`), `font-extrabold`, `tracking-tight`.
  - **Tiêu đề khu vực / Thẻ (Section & Card Title):** `14px – 16px` (`text-sm` đến `text-base`), `font-bold` / `font-extrabold`.
  - **Nội dung văn bản (Body Prose):** `13px – 14px` (`text-xs` đến `text-sm`), `leading-relaxed` (tối ưu độ rộng dòng dễ đọc).
  - **Thông tin phụ (Metadata / Caption):** `11px – 12px` (`text-[11px]` đến `text-xs`), sử dụng dấu chấm giữa `·` để phân tách gọn gàng thay vì lạm dụng nhiều hộp nhãn (Zero-Pill Metadata Discipline).

---

### 1.3. Quy Chuẩn Không Gian & Công Thái Học Di Động (Ergonomics & Spacing)
- **Hệ lưới khoảng cách:** Hệ thống chuẩn **8px** (`p-4` = 16px, `p-5` = 20px, `gap-2.5` = 10px, `gap-3` = 12px).
- **Bo góc bề mặt (Border Radius):**
  - Thẻ nội dung & ô nhập liệu: `rounded-2xl` (`16px`).
  - Thẻ Hero, Bottom Sheet, Modal: `rounded-3xl` (`24px`).
- **Kích thước vùng chạm (Touch Target):** Tối thiểu `44x44px` (`min-h-[44px]`, `h-11`, `h-12`) giúp thao tác một tay (one-handed thumb navigation) chính xác ngay cả trong tình huống khẩn cấp.
- **Độ tương phản & Đa kích thước màn hình:** Tương thích hoàn toàn với các chuẩn chiều rộng thiết bị di động `375px`, `390px`, `414px`, `430px` và giao diện Desktop `1440px` cho Admin Portal.

---

## 2. Kiến Trúc Điều Hướng (Navigation Architecture)

1. **Thanh Điều Hướng Đáy (Bottom Navigation Bar — 5 Mục Chính):**
   - **Home (`Trang chủ`):** Bảng điều khiển cá nhân hóa theo quốc gia đang lưu trú.
   - **Explore (`Khám phá`):** Cẩm nang Pháp lý (Legal Handbook), Tìm kiếm nâng cao và thanh truy cập nhanh Bản đồ / Dịch thuật / Sự cố.
   - **AI Assistant (`Be.Travel AI`):** Trợ lý hỏi đáp pháp lý du lịch tích hợp RAG.
   - **SOS (`Khẩn cấp`):** Nút khiên đỏ nổi bật (`#EF4444`) dẫn trực tiếp tới Trung tâm Cứu trợ Khẩn cấp.
   - **Profile (`Cá nhân`):** Quản lý hành trình, mục đã lưu và cài đặt quyền riêng tư.
2. **Thanh Chuyển Đổi Chế Độ (Top Workspace Switcher - Dành cho bản Web/Review):**
   - Cho phép chuyển đổi tức thì giữa **Ứng dụng Di động (Mobile App)** (có bộ chọn khung `375px` / `390px` / `414px` / `430px`) và **Cổng Quản Trị (Admin Portal Desktop)** với dữ liệu đồng bộ hai chiều theo thời gian thực.

---

## 3. Chi Tiết Các Màn Hình Ứng Dụng Di Động (14 Màn Hình User Flows)

### 3.1. Xác Thực Người Dùng (Login & Register)
- **Màn hình Đăng nhập (Login):** Logo Be.Travel, lời chào, ô nhập Email & Mật khẩu (có nút Ẩn/Hiện mật khẩu), tùy chọn "Ghi nhớ đăng nhập", tính năng "Quên mật khẩu" (hiển thị thông báo gửi liên kết khôi phục), nút Đăng nhập chính, nút Đăng nhập nhanh với Google và liên kết chuyển sang Đăng ký.
- **Màn hình Đăng ký (Register):** Nhập Họ và tên, Email, Mật khẩu, Xác nhận mật khẩu, hộp kiểm đồng ý Điều khoản & Chính sách bảo vệ dữ liệu, nút Đăng ký và Đăng ký qua Google.

### 3.2. Luồng Giới Thiệu Ứng Dụng (Onboarding — 4 Bước)
Sử dụng bộ hình minh họa Vector Xanh - Trắng chuyên biệt kèm thanh tiến trình:
1. **Bước 1 — *"Travel with confidence"*:** Tự tin trên mọi hành trình quốc tế.
2. **Bước 2 — *"Understand local laws"*:** Hiểu rõ luật pháp sở tại bằng tiếng Việt.
3. **Bước 3 — *"Get help when you need it"*:** Hỗ trợ khẩn cấp & Đại sứ quán 24/7.
4. **Bước 4 — *"Your AI legal travel assistant"*:** Trợ lý AI pháp lý & Dịch nhanh tình huống.

### 3.3. Chọn Quốc Gia Điểm Đến (Country Selection)
- Thanh tìm kiếm quốc gia, bộ lọc *"Tất cả"* và *"Điểm đến phổ biến"*.
- Danh sách 8 quốc gia trọng điểm (**Nhật Bản, Hàn Quốc, Singapore, Thái Lan, Hoa Kỳ, Úc, Pháp, Đức**).
- Mỗi thẻ quốc gia hiển thị: Quốc kỳ, Tên tiếng Việt & tiếng Anh, Trạng thái lưu trú/thị thực, Số điện thoại Cảnh sát & Cấp cứu sở tại, Mức độ an toàn.
- Khi đổi quốc gia, toàn bộ nội dung trên ứng dụng (Hero Card, Cẩm nang pháp lý, Số SOS, Bản đồ, Cảnh báo, Ngôn ngữ dịch mặc định) tự động cập nhật theo quốc gia đó.

### 3.4. Màn Hình Chính (Home Dashboard)
- **Header:** Ảnh đại diện người dùng, lời chào *"Xin chào, Minh"*, nút chuyển đổi nhanh quốc gia điểm đến và biểu tượng Chuông thông báo kèm số lượng cảnh báo chưa đọc.
- **Main Hero Card (*"Bạn đang ở Nhật Bản"*):** Nền ảnh điểm đến có lớp phủ tối tăng độ tương phản (scrim), hiển thị Quốc kỳ, Trạng thái an toàn (*"● An toàn cao"*), lưu ý pháp lý quan trọng nhất (VD: bắt buộc mang hộ chiếu gốc 24/7) và thẻ Cảnh báo nổi bật có thể nhấn để xem chi tiết.
- **4 Nút Thao Tác Nhanh (Main Quick Actions):**
  1. `AI pháp lý` (Mở Be.Travel AI)
  2. `SOS` (Nút đỏ nổi bật mở Trung tâm Khẩn cấp)
  3. `Dịch nhanh` (Mở trình dịch tình huống)
  4. `Bản đồ hỗ trợ` (Mở bản đồ GPS cơ quan bảo hộ)
- **Lối tắt phụ:** *Gặp sự cố khẩn cấp (Quy trình 5 bước)* và *Tra cứu Luật nhanh*.
- **Khu vực "Important Alerts":** Hiển thị các cảnh báo mới nhất tại thành phố đang lưu trú (VD: *"Thông báo mới tại Tokyo: Quy định cấm uống rượu & hút thuốc đường phố..."*).
- **Khu vực "Legal & Travel Tips":** Danh sách các thẻ bài viết thiết yếu (*"5 điều cần biết khi ở Nhật Bản"*, *"Luật giao thông dành cho khách du lịch"*, *"Những hành vi có thể bị phạt"*).
- **Khu vực "Continue Reading":** Hiển thị thanh tiến độ phần trăm (`65%`, `35%`) các bài viết pháp lý đang đọc dở.

### 3.5. Cẩm Nang Pháp Lý (Legal Handbook)
- Thanh tìm kiếm nhanh + nút mở trang *Tìm kiếm nâng cao*.
- Thanh công cụ chuyển nhanh sang *Bản đồ hỗ trợ*, *Dịch khẩn cấp*, *Xử lý sự cố*.
- Bộ lọc theo Quốc gia và các Chủ đề phổ biến (Popular Topics).
- Bộ lọc ngang đầy đủ **11 chuyên mục pháp lý**: `Immigration` (Xuất nhập cảnh), `Traffic` (Giao thông), `Public behavior` (Ứng xử công cộng), `Police` (Làm việc với Cảnh sát), `Alcohol` (Đồ uống có cồn), `Drugs` (Chất cấm & Thuốc), `Photography` (Quay phim & Chụp ảnh), `Employment` (Lao động & Làm thêm), `Accommodation` (Lưu trú & Thuê nhà), `Emergency` (Cứu hộ khẩn cấp), `Consumer rights` (Quyền lợi tiêu dùng).
- Thẻ bài viết hiển thị: Quốc gia, Chuyên mục, Nhãn *"✓ Đã xác minh"*, Tiêu đề, Tóm tắt ngắn, Nguồn chính phủ, Ngày cập nhật và nút Lưu (Bookmark). Chỉ hiển thị bài viết đã xác minh (`Verified & Published`).

### 3.6. Chi Tiết Bài Viết Pháp Lý (Legal Article Detail)
- **Header cố định:** Nút Quay lại, nút Lưu (Bookmark) và nút Chia sẻ (Share - sao chép liên kết kèm thông báo xác nhận).
- **Cấu trúc nội dung trực quan, dễ đọc cho giới trẻ:**
  - Thông tin Quốc gia · Chuyên mục · Ngày cập nhật.
  - Hộp xác thực nguồn pháp lý chính thống kèm mã phiên bản (`v2.4`).
  - Khung **Tóm tắt nhanh (Summary)** nền xanh nhạt `#EAF4FF`.
  - **Thông tin pháp lý chi tiết** chia thành các đoạn ngắn rõ ràng.
  - Khung cảnh báo **Lưu ý pháp lý quan trọng (Important Notes)** nền đỏ nhạt `#FEF2F2`.
  - Khung **Việc bạn nên làm (What you should do)** nền xanh lá nhạt `#F0FDF4` với dấu kiểm `✓`.
  - Khung **Điều bạn cần tránh (What you should avoid)** nền vàng cam nhạt `#FFFBEB` với dấu `✕`.
  - Thông tin nguồn trích dẫn chính thức kèm đường dẫn mở cổng thông tin chính phủ.
  - **Nút hành động cuối trang:** *"Ask AI about this topic (Hỏi AI về chủ đề này)"* — tự động gửi câu hỏi ngữ cảnh sang Be.Travel AI.

### 3.7. Tìm Kiếm Pháp Lý Chuyên Biệt (Legal Search)
- Thanh tìm kiếm *"Bạn muốn tìm hiểu điều gì?"* (Mặc định gợi ý mẫu: *"Ở Nhật Bản có được hút thuốc trên đường không?"*).
- Bộ lọc kết hợp: Quốc gia, Chủ đề, Mới cập nhật, và Chỉ nội dung đã xác minh.
- **Trạng thái Không tìm thấy kết quả (Empty / No Result State):**
  - Hiển thị thông báo *"Không tìm thấy thông tin phù hợp"*.
  - Cung cấp danh sách **Từ khóa gợi ý (Suggested keywords)**, **Chủ đề phổ biến (Popular topics)** và nút CTA **"Hỏi AI"** chuyển thẳng từ khóa đang tìm sang trợ lý AI.

### 3.8. Trợ Lý Pháp Lý AI (Be.Travel AI)
- **Header:** Tiêu đề *"Be.Travel AI"*, phụ đề *"Trợ lý pháp lý du lịch của bạn"*, hiển thị quốc gia đang áp dụng luật và thông báo miễn trừ trách nhiệm rõ ràng: *"AI hỗ trợ tham khảo, không thay thế tư vấn pháp lý chuyên nghiệp."*
- **Cấu trúc câu trả lời AI 4 phần chuẩn hóa:**
  1. **Câu trả lời trực tiếp (Direct Answer)**
  2. **Việc bạn nên làm ngay (Recommended Actions)**
  3. **Điều cần tránh tuyệt đối (Things to Avoid)**
  4. **Nguồn pháp lý tham chiếu (Sources)** — Ví dụ: *Japan Immigration Services Agency*, *Tokyo Metropolitan Government*.
- **Thanh tương tác dưới mỗi câu trả lời:** `Copy` (Sao chép), `Like`, `Dislike` (Tự động gửi phản hồi sang bảng Feedback của Admin Portal), `Regenerate` (Tạo lại câu trả lời), và `View source` (Mở Bottom Sheet xem chi tiết nguồn luật).
- **Chip câu hỏi gợi ý:** *"Tôi có quyền gì?"*, *"Tôi nên nói gì?"*, *"Có bị phạt không?"*, *"Tôi cần liên hệ ai?"*.
- **Trạng thái Dự phòng khi AI gián đoạn (AI Unavailable Fallback):** Khi mất kết nối AI, giao diện hiển thị thẻ điều hướng khẩn cấp sang **Cẩm nang Pháp lý ngoại tuyến** và **Hỗ trợ Khẩn cấp SOS**.

### 3.9. Dịch Nhanh Tình Huống Khẩn Cấp (Emergency Translator)
- Cặp ngôn ngữ: Tiếng Việt 🇻🇳 → Ngôn ngữ đích (Tiếng Nhật, Tiếng Hàn, Tiếng Anh, Tiếng Thái, Tiếng Pháp, Tiếng Đức).
- Khung nhập câu tiếng Việt tùy chỉnh (kết nối API dịch thuật AI) + Khung hiển thị kết quả bản dịch chữ lớn độ tương phản cao (`#102A43`) kèm **Phiên âm đọc Latinh (Romaji/Phonetic)** để người dùng đọc trực tiếp hoặc đưa màn hình cho cảnh sát/bác sĩ xem.
- Tích hợp nút **Phát âm giọng bản xứ (Play Pronunciation)** qua Web Speech API, nút Sao chép và nút Lưu mẫu câu yêu thích.
- Bộ lọc **7 danh mục tình huống:** `Police`, `Hospital`, `Airport`, `Embassy`, `Hotel`, `Emergency`, `Transportation`.
- Danh sách nút bấm lớn cho các câu khẩn cấp: *"Xin hãy giúp tôi."*, *"Tôi cần liên hệ Đại sứ quán Việt Nam."*, *"Tôi không hiểu điều này."*, *"Tôi cần bác sĩ."*

### 3.10. Trung Tâm Cứu Trợ Khẩn Cấp (SOS / Emergency Hub)
- Thiết kế ưu tiên tốc độ thao tác tối đa (**không quá 2 chạm** để thực hiện cuộc gọi cứu trợ).
- **Nút SOS Đỏ Cỡ Lớn (`#EF4444`):** Nhấn vào mở ngay Bottom Sheet khẩn cấp hiển thị tọa độ GPS hiện tại cùng 3 nút một chạm: *Gọi Cảnh sát sở tại*, *Gọi Hotline Bảo hộ Công dân Đại sứ quán*, hoặc *Chia sẻ tọa độ GPS cho người thân*.
- **Dải 3 nút gọi nhanh trực tiếp:** Cảnh sát (`110`), Cấp cứu (`119`), và Hotline ĐSQ.
- **Danh sách 6 nhóm cơ quan hỗ trợ đã xác minh:** `Embassy`, `Consulate`, `Police`, `Hospital`, `Legal Support`, `Emergency Services`. Mỗi thẻ hiển thị Tên, Khoảng cách km, Trạng thái Đang mở cửa/Đóng cửa, Số điện thoại, nút **Chỉ đường (Navigation)** và nút **Gọi ngay (Call)**.

### 3.11. Bản Đồ Hỗ Trợ Tương Tác (Support Map)
- Bản đồ Vector đường phố & giao thông toàn màn hình hiển thị vị trí GPS của người dùng (hiệu ứng sóng định vị) và các ghim (Marker) phân loại theo màu sắc của Đại sứ quán, Tổng Lãnh sự quán, Đồn cảnh sát, Bệnh viện quốc tế và Trung tâm pháp lý.
- Thanh tìm kiếm nổi *"Tìm địa điểm hỗ trợ"* và dải nút lọc (`Embassy`, `Consulate`, `Police`, `Hospital`, `Legal`).
- **Bottom Sheet chi tiết địa điểm:** Hiển thị Tên tiếng Việt & tên bản xứ, Khoảng cách, Địa chỉ, Giờ mở cửa, Số điện thoại, nút **Gọi ngay** và nút **Chỉ đường (Directions)** (vẽ trực tiếp tuyến đường kết nối từ vị trí người dùng tới địa điểm trên bản đồ).
- **Trạng thái Từ chối quyền vị trí (Location Permission Denied Fallback):** Hiển thị thông báo thân thiện *"Cho phép vị trí để tìm nơi hỗ trợ gần bạn"* kèm nút cấp quyền GPS và bộ chọn Quốc gia / Thành phố thủ công.

### 3.12. Báo Cáo & Quy Trình Xử Lý Sự Cố (Incident Management)
- Tiêu đề *"Bạn đang gặp vấn đề gì?"* với **8 danh mục sự cố**: `Police`, `Immigration`, `Accident`, `Lost passport`, `Hospital`, `Lost property`, `Legal dispute`, `Other`.
- **Thanh tiến trình trực quan `1 → 2 → 3 → 4 → 5`** tương ứng 5 bước chuẩn bảo hộ lãnh sự:
  1. *Giữ bình tĩnh*
  2. *Đảm bảo bạn đang ở nơi an toàn*
  3. *Liên hệ cơ quan hỗ trợ*
  4. *Chuẩn bị giấy tờ cần thiết*
  5. *Nhận hỗ trợ*
- Người dùng có thể đánh dấu hoàn thành từng bước và sử dụng ngay 4 công cụ ở cuối trang: `Call support`, `Open map`, `Ask AI`, `Translate phrase`.

### 3.13. Trung Tâm Cảnh Báo (Alerts Center)
- Phân loại **5 nhóm cảnh báo**: `Country alerts`, `Location alerts`, `Legal changes`, `Emergency alerts`, `Weather/safety alerts`.
- Phân cấp mức độ ưu tiên thị giác: `Critical` (Đỏ), `High` (Cam), `Medium` (Xanh dương), `Info` (Xám).
- Cho phép đánh dấu đã đọc từng mục hoặc tất cả (`Mark as read`), mở Bottom Sheet xem khuyến nghị hành động an toàn (`View details`) và cài đặt tùy chọn nhận thông báo (`Notification preferences`).

### 3.14. Hồ Sơ Cá Nhân (Profile Screen)
- Thông tin cá nhân: Ảnh đại diện, Họ tên (`Nguyễn Quang Minh`), Email, trạng thái xác thực.
- **My Trips:** Điểm đến hiện tại, Lịch sử chuyến đi trước và Modal *Thêm chuyến đi mới (Add trip)*.
- **Saved:** Danh sách Bài viết pháp lý đã lưu và Mẫu câu dịch thuật đã lưu.
- **Preferences:** Chuyển đổi Quốc gia, Ngôn ngữ giao diện, Bật/tắt Thông báo và Quyền định vị GPS.
- **Account:** Chỉnh sửa hồ sơ, Đổi mật khẩu, Chính sách quyền riêng tư, Điều khoản sử dụng và Đăng xuất.

---

## 4. Cổng Quản Trị Doanh Nghiệp (Desktop Admin Portal — 11 Phân Hệ)

Giao diện Admin Portal được thiết kế chuẩn Desktop (`1440px`) với thanh Sidebar cố định bên trái và vùng làm việc dữ liệu mật độ cao:

1. **Dashboard:** 6 thẻ chỉ số KPI thời gian thực (`Total legal documents`, `Verified documents`, `Indexed documents`, `Active alerts`, `Support locations`, `User feedback`) cùng bảng theo dõi nhanh trạng thái RAG và Cảnh báo đang phát sóng.
2. **Legal Content:** Bảng quản lý văn bản pháp lý với bộ lọc 6 trạng thái (`Draft`, `Pending verification`, `Verified`, `Published`, `Inactive`, `Superseded`), chức năng Tạo mới / Chỉnh sửa bài viết, nút duyệt nhanh `Verify & Publish` và cửa sổ xem **Lịch sử Phiên bản (Version History Timeline `v1.0 → v2.1 → v2.4`)**.
3. **Countries:** Quản lý danh sách 8 quốc gia, đầu số khẩn cấp sở tại và ghi chú thị thực.
4. **Topics:** Quản lý 11 chuyên mục pháp lý tiêu chuẩn.
5. **RAG Index:** Bảng quản trị Vector Embedding hiển thị `Document`, `Country`, `Version`, `Status`, `Index status` (`Not indexed`, `Indexing`, `Indexed`, `Failed`), `Last indexed`, thông báo lỗi chi tiết (`Error`) và các nút hành động `Index`, `Re-index`, `Retry`.
6. **Support Locations:** Quản lý danh sách cơ quan hỗ trợ kèm biểu mẫu thêm/sửa, xác minh (`Verify`), ẩn/hiện (`Deactivate`) và **Bản đồ xem trước vị trí ghim (Live Map Preview)**.
7. **Alerts:** Biểu mẫu phát hành Cảnh báo Địa lý (`Geo-based Alert`) kèm **Khung Xem Trước Trên Điện Thoại (Live Mobile App Preview)** cập nhật tức thì khi gõ.
8. **Incidents (Workflow Builder):** Trình thiết kế quy trình xử lý sự cố cho phép thêm bước mới, sắp xếp thứ tự các bước (`Up` / `Down`), chỉnh sửa hướng dẫn và xuất bản/tạm ẩn quy trình.
9. **Feedback:** Bảng quản lý đánh giá của người dùng đối với câu trả lời AI và bài viết pháp lý, hỗ trợ lọc và xử lý (`Review`, `Resolve`, `Mark as useful`).
10. **Users:** Danh sách người dùng và Hội đồng Luật sư kiểm duyệt nội dung.
11. **Settings:** Cấu hình mô hình Gemini AI RAG và chính sách kiểm duyệt xuất bản.

---

## 5. Cấu Trúc Thư Mục Mã Nguồn Frontend

```text
/src
 ├── App.tsx                                    # Bộ điều phối trung tâm (Mobile Frame + Admin Portal + Top Switcher)
 ├── index.css                                  # Cấu hình Tailwind CSS, Font Plus Jakarta Sans & JetBrains Mono
 ├── main.tsx                                   # Điểm khởi chạy React DOM
 ├── data/
 │    └── mockData.ts                           # Kho dữ liệu chuẩn hóa: 8 Quốc gia, 11 Chuyên mục, Bài viết, Địa điểm, Mẫu câu, Sự cố, Cảnh báo
 └── components/
      ├── AuthOnboardingScreens.tsx             # Màn hình Login, Register, Onboarding 4 bước, Country Selection
      ├── HomeAlertsProfileScreens.tsx          # Màn hình Home Dashboard, Alerts Center, Profile & My Trips
      ├── LegalScreens.tsx                      # Màn hình Legal Handbook, Legal Article Detail, Dedicated Legal Search
      ├── AIAssistantAndTranslatorScreens.tsx   # Màn hình Be.Travel AI (tích hợp RAG & Sources) và Emergency Translator
      ├── SafetyAndEmergencyScreens.tsx         # Màn hình SOS Hub, Interactive Support Map, Incident Management 5 bước
      └── AdminPortal.tsx                       # Cổng quản trị Desktop 11 phân hệ đồng bộ dữ liệu thời gian thực
```
