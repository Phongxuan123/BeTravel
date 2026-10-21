# TONG HOP TASK DE SOAN JIRA — BE.TRAVEL

Cập nhật: 19/10/2026 (chiều) · Code: `main` @ `7e0ab29` · 17/09/2026 -> 19/10/2026, 45 PR đã merge, 0 PR mở.
Thay đổi so với bản 13/10: thêm PR #38 của Phú Long (giao diện theo PDF 23 màn, bản đồ OpenStreetMap, địa điểm bổ sung chưa xác minh); cập nhật E4-09, E4-10, E7-07, E7-08 và thêm E4-12.
Thay đổi so với bản 15/10: thêm PR #40 của Thanh Đạt (dịch offline bằng ML Kit, mở màn Dịch cho khách, sửa micro, tìm Đại sứ quán theo quốc gia); thêm E4-13, E5-07; cập nhật E4-10, E5-03, E5-04; số test mới.
Thay đổi so với bản 17/10: thêm PR #42 (luật liên bang Úc) thành E2-12.
Thay đổi so với bản sáng 19/10: PR #44 (tên luật Úc tiếng Việt) vào E2-12; PR #45 (thiết kế lại màn Be.Travel AI, Phú Long) thành E7-11; số test mới.

Tài liệu này gom mọi việc đã làm / đang làm / chưa làm của dự án thành một danh sách có cấu trúc
Epic -> Task, để dán sang Jira. Nó **không thay** các sổ gốc; mỗi dòng có cột "Nguồn" chỉ tới file
chứa bằng chứng chi tiết.

## 1. Cách đọc

| Nhãn | Ý nghĩa | Trạng thái Jira gợi ý |
|---|---|---|
| **Xong** | Đã code, đã kiểm tra, đã merge vào `main` | Done |
| **Đang làm** | Code xong một phần, hoặc code xong nhưng còn thiếu dữ liệu / thử trên thiết bị thật | In Progress |
| **Chưa làm** | Chưa bắt đầu | To Do |
| **Chờ người** | Cần quyết định, dữ liệu, tài khoản hoặc tài liệu từ người; Claude không tự làm được | gắn cờ Blocked |

Ưu tiên P1-P4 lấy theo `docs/USER_INPUT_FORM.md` (P1 cao nhất). Cột Loại gợi ý: Epic, Story, Task, Bug, Spike.
Mã `Exx` là mã nội bộ của tài liệu này, **không phải** khoá Jira. Mã `Bxx` là mã lỗi trong
`docs/FEATURE_STATUS_BUGS.md`, giữ nguyên để truy vết.

## 1b. Quy tắc gán trạng thái Jira (đã đối chiếu với code và dữ liệu ngày 13/10)

Cột **Jira** ở mục 3 là trạng thái nên đặt khi tạo ticket. Chỉ có ba trạng thái, gán theo quy tắc:

| Trạng thái Jira | Khi nào gán | Bằng chứng cần có |
|---|---|---|
| **Done** | Đã merge vào `main` và đã kiểm chạy thật (emulator hoặc backend thật), hoặc là quyết định đã chốt không còn việc | PR đã merge; kết quả trong `FEATURE_STATUS_BUGS.md` / `PROGRESS.md` |
| **In Progress** | Đã có code hoặc cấu hình nhưng chưa nghiệm thu xong (chờ thử máy thật, chờ key, chờ xác minh) | Code đã có trong repo, còn bước kiểm cuối |
| **To Do** | Chưa bắt đầu. Nếu việc phải chờ người (dữ liệu, quyết định, tài khoản, văn bản) thì gắn thêm cờ **Blocked** và ghi người chịu trách nhiệm | Ghi rõ ai cần làm gì ở mô tả |
| **Won't Do** | Ngoài phạm vi MVP hoặc trái quy tắc dự án | Đóng ở trạng thái Done với resolution Won't Do, hoặc không tạo ticket |

Trạng thái của **Epic** suy ra từ task con: Epic còn bất kỳ task nào chưa Done thì để **In Progress**
(cả 9 Epic E1-E9 hiện đều thuộc loại này); chỉ chuyển Done khi mọi task con xong.

Tiêu chí thận trọng: "Xong" chỉ gán khi đã kiểm chạy thật. Nhiều dòng "Xong" mới được kiểm trên
emulator, chưa thử điện thoại thật; việc thử máy thật được theo dõi riêng ở E9-04.

## 2. Bức tranh tổng

| Hạng mục | Tình trạng |
|---|---|
| Kiến trúc | 3 dự án npm độc lập: `backend` (Express 5, Mongoose 9), `mobile` (Expo 57, TypeScript), `admin` (Vite, React) |
| Hạ tầng đang dùng | MongoDB Atlas M0 (DB tên `test`); chạy dev trên máy; **chưa deploy** Render / Vercel / EAS |
| Thị trường | Chỉ Hàn Quốc (KR) mở; Nhật Bản, Thái Lan, Singapore "Sắp ra mắt" |
| Kiểm tra tự động | backend 295 test (gồm 26 ca golden RAG), mobile 235 test, admin 18 test; CI GitHub chạy 3 phần, đang xanh |
| Kiểm thử thực tế | Có chạy thật trên Android emulator (Android 16) với backend thật nối Atlas (gồm dịch offline ở chế độ máy bay, 17/10); **chưa thử trên điện thoại thật** |
| Dữ liệu hiện có trên Atlas (11/10) | 8 bài luật KR **đều ở nháp, 0 bài xuất bản**; 0 điểm hỗ trợ; 0 cảnh báo vị trí; 5 hướng dẫn sự cố và 25 câu dịch đang hiển thị |
| Tính năng khoá có chủ đích | Be.Travel AI (chat pháp lý) khoá bằng cờ `EXPO_PUBLIC_AI_CHAT_ENABLED` |

Tổng số dòng task ở mục 3: **85** = 36 Xong · 11 Đang làm · 19 Chưa làm · 18 Chờ người · 1 Không làm. Theo trạng thái Jira: **36 Done · 11 In Progress · 36 To Do (trong đó 18 bị chặn chờ người) · 2 Won't Do**.

Hai điểm nghẽn chính của cả dự án đều **không phải code**:
1. **Nội dung pháp lý chưa được người duyệt** -> không xuất bản được bài -> Cẩm nang trống, AI không có gì để trả lời.
2. **Chưa có hạ tầng triển khai và key Google Maps** -> chưa có APK dùng độc lập, bản đồ SOS không có nền.

## 3. Danh sách theo Epic

### E1. Nền tảng và tài khoản (batch B1)

| Mã | Task (dán làm tiêu đề Jira) | Loại | Trạng thái | Jira | Ưu tiên | Nguồn / ghi chú |
|---|---|---|---|---|---|---|
| E1-01 | Hợp nhất contract API, envelope `{ok,data,error}`, bộ mã lỗi đóng | Story | Xong | Done | - | `contracts/`, `docs/03_Contracts_v2.md` |
| E1-02 | Đăng ký, đăng nhập email / số điện thoại + mật khẩu, refresh token xoay vòng | Story | Xong | Done | - | `docs/PROGRESS_HISTORY.md` |
| E1-03 | Đổi mật khẩu (thu hồi phiên cũ), sửa hồ sơ, đăng xuất | Story | Xong | Done | - | `FEATURE_STATUS_BUGS.md` mục 3.1 |
| E1-04 | Quên mật khẩu bằng OTP email: xác minh thư tới hộp thư thật và bước đặt lại | Task | Đang làm | In Progress | P2 | Server đã gửi qua Gmail SMTP; chưa ai xác nhận thư tới nơi. Chờ người thử (form F4, G11) |
| E1-05 | Đăng nhập bằng số điện thoại qua OTP SMS | Story | Chưa làm | To Do | P4 | Màn hình đang là màn chặn "đang phát triển"; cần chọn nhà cung cấp SMS; ngoài MVP |
| E1-06 | Nút Đăng nhập Google trên app (backend đã có `/auth/google`) | Story | Chưa làm | To Do | P3 | Quyết định: chưa làm đợt này (F6); cần OAuth client ID iOS/Android |
| E1-07 | Nút xoá tài khoản trong app + trang yêu cầu xoá | Story | Chưa làm | To Do | P3 | Quyết định 08/10: **làm sau** (E2 trong form). Cần cho yêu cầu của kho ứng dụng |

### E2. Nội dung pháp lý và Admin Portal (batch B2, B3)

| Mã | Task | Loại | Trạng thái | Jira | Ưu tiên | Nguồn / ghi chú |
|---|---|---|---|---|---|---|
| E2-01 | Mô hình bài luật, máy trạng thái draft -> published -> archived, version, chống ghi đè | Story | Xong | Done | - | bản vá 05/10 (đã gỡ, xem lịch sử git); có transaction khi xuất bản |
| E2-02 | Admin Portal: Dashboard + 10 trang quản lý (Quốc gia, Chủ đề, Bài luật, Điểm hỗ trợ, Sự cố, Câu dịch, Cảnh báo, RAG Index, Feedback, Nhật ký) | Story | Xong | Done | - | Đều tải được, RBAC kiểm ở backend |
| E2-03 | API công khai bài luật, tìm kiếm có dấu / không dấu, luôn lọc `published` + `isCurrent` | Story | Xong | Done | - | Đã chứng minh bài nháp không lọt ra |
| E2-04 | Cẩm nang, chi tiết bài, lưu / bỏ lưu, chia sẻ, Tìm kiếm trên app | Story | Xong | Done | - | B05, B11, B16, B24 |
| E2-05 | Gỡ 2 bài mẫu chưa có người duyệt về nháp; xoá script seed mẫu | Task | Xong | Done | P1 | 08/10, đúng quy trình published -> archived -> draft |
| E2-06 | Điền ngày hiệu lực + nguồn có ngày công bố cho 8 bài KR | Task | Chờ người | To Do (Blocked) | P2 | Form C1. Bài 5 còn thiếu cả ngưỡng khai báo tiền mặt |
| E2-07 | Chỉ định người duyệt chuyên môn pháp lý; duyệt và xuất bản bài đủ điều kiện | Task | Chờ người | To Do (Blocked) | P2 | Form C2. Mặc định: không xuất bản thêm khi chưa có người duyệt. **Chặn E3-03, E4-04** |
| E2-08 | Xác nhận người kiểm cho 5 hướng dẫn sự cố và 25 câu dịch đang hiển thị | Task | Chờ người | To Do (Blocked) | P2 | Form C3. Câu dịch chưa có trường trạng thái, muốn ẩn phải thêm cơ chế |
| E2-09 | Thêm trạng thái hiển thị (ẩn / hiện) cho câu dịch khẩn cấp | Task | Chưa làm | To Do | P3 | Chỉ cần nếu E2-08 quyết định gỡ. Đối chiếu 13/10: `QuickPhrase` chưa có trường trạng thái |
| E2-10 | Mở thêm quốc gia (Nhật Bản, Thái Lan hoặc Singapore): nội dung + nguồn | Epic | Chưa làm | To Do | P4 | Form C4. Cần người cung cấp nội dung. Code đã country-driven, không sửa logic |
| E2-11 | Kiểm Admin: xuất bản bài + job index, nhập điểm hỗ trợ hàng loạt, xử lý feedback | Task | Chưa làm | To Do | P2 | Chưa kiểm vì tránh đổi dữ liệu nội dung thật; làm sau khi có bài để thử |
| E2-12 | Tra cứu luật liên bang Úc (Federal Register of Legislation): quốc gia Úc, phân loại 5 mục (31 luật tuyển chọn), tóm lược, dịch tiếng Việt theo yêu cầu, màn Luật trên app | Story | Đang làm | In Progress | P3 | PR #42 (18/10, ngoài lộ trình B1-B9). Chỉ đọc, không ghi `legal_articles`, không vào RAG, `verifiedByBeTravel:false`; contract mục 24. PR #44 (Phú Long, 19/10): tên 31 luật tuyển chọn viết sẵn tiếng Việt, luật khác do AI dịch tên. **Còn thiếu:** tóm tắt từng Phần Migration Act mới 5/37 (bị 429), dịch đủ 31 luật cần API trả phí, chưa thử giao diện trên điện thoại, chưa có Đại sứ quán Úc/số hàng hải (chưa có nguồn), chưa có test màn hình mobile/admin |

### E3. AI pháp lý (RAG) (batch B4, B5)

| Mã | Task | Loại | Trạng thái | Jira | Ưu tiên | Nguồn / ghi chú |
|---|---|---|---|---|---|---|
| E3-01 | Truy hồi vector + `$lookup` kiểm bài còn hiệu lực, ngưỡng điểm, từ chối khi thiếu bằng chứng | Story | Xong | Done | - | `backend/src/rag/`, `INSUFFICIENT_EVIDENCE`, không gọi LLM khi thiếu dữ liệu |
| E3-02 | Hậu kiểm bằng code (marker nguồn, chặn tuyên bố định lượng thiếu trích dẫn), quota nguyên tử theo ngày và theo người | Story | Xong | Done | - | bản vá 05/10 (đã gỡ, xem lịch sử git) |
| E3-03 | Chạy Reindex KR (tạo embedding cho bài đã xuất bản) | Task | Chờ người | To Do (Blocked) | P2 | B04. Cần E2-07 xong và người cho phép chi phí (form F5) |
| E3-04 | Chạy bộ 26 câu golden bằng AI thật và ghi kết quả | Task | Chờ người | To Do (Blocked) | P2 | Cần ngân sách (form F5); hiện chỉ chạy với `LLM_PROVIDER=mock` |
| E3-05 | Mở khoá Be.Travel AI trên app (đổi cờ, kiểm lại toàn luồng chat, feedback, lịch sử) | Task | Chờ người | To Do (Blocked) | P2 | Quyết định B4: khoá tới khi có nội dung duyệt + reindex + test thật. Màn chat và lịch sử đã có sẵn |
| E3-06 | Cảnh báo ở Admin khi bài `published` mà chưa index | Task | Chưa làm | To Do | P3 | Đề xuất trong B04. Đối chiếu 13/10: trang RAG Index đã hiện nhãn "Chưa index" từng dòng, nhưng chưa có cảnh báo riêng ở Dashboard hay danh sách bài |
| E3-07 | Câu trả lời AI 4 phần theo spec (trả lời, việc nên làm, điều cần tránh, nguồn) + nút Tạo lại | Story | Chưa làm | To Do | P3 | Spec mục 3.8. Đổi contract RAG; chỉ làm khi AI được mở khoá |
| E3-08 | Xoá bản ghi `ai_events` hỏng dấu hiện ở Dashboard "Top câu hỏi bị fallback" | Bug | Chờ người | To Do (Blocked) | P4 | B25. Là dữ liệu thử do `curl` tạo 07/10; cần người đồng ý, không có API xoá |

### E4. SOS và bản đồ hỗ trợ (batch B6)

| Mã | Task | Loại | Trạng thái | Jira | Ưu tiên | Nguồn / ghi chú |
|---|---|---|---|---|---|---|
| E4-01 | Backend điểm hỗ trợ gần nhất (`$geoNear`), nhập CSV, xác minh | Story | Xong | Done | - | Mẫu CSV: `docs/sos-locations-template.csv` |
| E4-02 | SOS Hub: số khẩn cấp theo quốc gia, nút gọi, xác định vị trí có dự phòng và báo lý do | Story | Xong | Done | - | B07 |
| E4-03 | Chia sẻ vị trí với người thân (sửa lỗi quyền bị huỷ) | Bug | Xong | Done | P1 | B01, 08/10 |
| E4-04 | Mở SOS cho người chưa đăng nhập, kể cả khi chưa xem onboarding; nút SOS ở màn chào và đăng nhập | Story | Xong | Done | P1 | B23, quyết định 08/10 |
| E4-05 | Đóng gói sẵn số khẩn cấp KR (112/119/122 + Đại sứ quán) dùng khi mất mạng | Story | Xong | Done | P3 | D4 |
| E4-06 | Sửa số Đại sứ quán theo trang chính thức `+82-2-720-5124` | Bug | Xong | Done | P1 | D2 |
| E4-07 | Nhập điểm hỗ trợ thật cho KR (đại sứ quán, bệnh viện, đồn công an, nhà thuốc) | Task | Chờ người | To Do (Blocked) | P2 | Form D1. **0 điểm trên Atlas** nên "Địa điểm hỗ trợ gần bạn" trống (B08 phần dữ liệu) |
| E4-08 | Bổ sung toạ độ và đường dây bảo hộ 24/7 của Đại sứ quán | Task | Chờ người | To Do (Blocked) | P2 | Form D2 |
| E4-09 | Tạo Google Maps key Android (giới hạn package + SHA-1, đặt hạn mức chi phí), build lại native | Task | Chờ người | To Do (Blocked) | P2 | Form F3, `docs/MAPS_SETUP.md`. Thiếu key thì bản đồ SOS không có nền (có màn thay thế + nút mở Google Maps). Cập nhật 15/10 (PR #38): Expo Go Android đã có nền bản đồ OpenStreetMap không cần key; key Google vẫn cần cho bản đồ native và bản build |
| E4-10 | Bản đồ native + tìm kiếm, bộ lọc, camera, vệ tinh, phục hồi lỗi | Story | Đang làm | In Progress | P2 | Code xong, chưa nghiệm thu tile Google trên thiết bị (cần E4-09). Cập nhật 17/10 (PR #40): bản build native không có key Google vẫn báo "Bản đồ chưa được cấu hình" trừ khi đặt `EXPO_PUBLIC_MAP_TILES=osm` (chờ nhóm chốt). Cập nhật 15/10 (PR #38): thêm bản đồ OSM bằng Leaflet trong WebView; vẫn chưa thử trên thiết bị |
| E4-11 | Bottom sheet SOS hiện toạ độ GPS + 3 nút một chạm; trạng thái mở/đóng cửa; vẽ tuyến đường trong app | Story | Chưa làm | To Do | P4 | Spec mục 3.10, 3.11. Mở/đóng cần dữ liệu giờ mở cửa; vẽ tuyến cần Directions API (tốn phí) nên chưa nên làm |
| E4-12 | Lớp địa điểm bổ sung chưa xác minh `GET /api/support-locations/external` (OSM miễn phí hoặc SerpApi trả phí), luôn `verified:false`, không ghi DB | Story | Đang làm | In Progress | P3 | PR #38 (Long, 15/10). Code + test đã merge, mặc định `PLACES_PROVIDER=mock`; chưa thử trên thiết bị. Cần chốt dùng OSM hay SerpApi (SerpApi lấy dữ liệu Google Maps, CLAUDE.md 4.4 loại Places khỏi MVP); trần gọi/cache nằm trong RAM |
| E4-13 | Tìm Đại sứ quán / điểm hỗ trợ theo quốc gia đã chọn, không cần GPS; báo lỗi rõ khi nguồn ngoài không phản hồi | Story | Đang làm | In Progress | P3 | PR #40 (Thanh Đạt, 17/10). Code + test đã merge; máy chủ Overpass công cộng đang không phản hồi khi thử nên **chưa thấy kết quả thật**, app xử lý lỗi đúng. Chờ thử lại khi nguồn ổn định hoặc đổi sang SerpApi |

### E5. Sự cố và Dịch khẩn cấp (batch B7)

| Mã | Task | Loại | Trạng thái | Jira | Ưu tiên | Nguồn / ghi chú |
|---|---|---|---|---|---|---|
| E5-01 | 5 quy trình xử lý sự cố, đánh dấu bước, checklist, lưu; Admin Workflow Builder | Story | Xong | Done | - | B19 sửa nhãn phạm vi |
| E5-02 | Dịch Việt - Anh / Hàn, phiên âm, hiểu câu gõ không dấu, 25 câu mẫu, lưu câu, phóng to | Story | Xong | Done | - | Gọi backend thật |
| E5-03 | Nhập giọng nói (micro -> văn bản) | Story | Đang làm | In Progress | P2 | Ngoại lệ phạm vi 07/10 (form B5). Sửa lỗi quyền B02 xong; PR #40 giữ phiên qua hộp thoại quyền và chặn thử khi app ở nền; **chờ thử nói thật trên điện thoại (Samsung)** |
| E5-04 | Phát âm bản dịch (TTS) đúng ngôn ngữ đích | Story | Đang làm | In Progress | P2 | Emulator không nghe được; chờ thử trên điện thoại thật (form G3) |
| E5-05 | Mở rộng sự cố lên 8 danh mục và khung 5 bước chuẩn bảo hộ lãnh sự | Story | Chưa làm | To Do | P4 | Spec mục 3.12. Dữ liệu thật mỗi sự cố có 3-5 bước; cần nhóm chốt giữ dữ liệu hay sửa spec. Đối chiếu 13/10: `IncidentType` chưa có trường danh mục; hiện 5 sự cố |
| E5-06 | Lọc 7 nhóm tình huống và lưu mẫu câu yêu thích theo spec | Story | Chưa làm | To Do | P4 | Spec mục 3.9; chưa soát kỹ app đã có đủ chưa. Đối chiếu 13/10: lưu câu đã có; `QuickPhrase` chưa có trường nhóm tình huống nên chưa lọc được |
| E5-07 | Dịch offline trên máy bằng Google ML Kit (module native Kotlin/Swift), tải gói ngôn ngữ ~30 MB, mở màn Dịch cho khách (chỉ offline), sửa micro giữ phiên qua hộp thoại quyền | Story | Đang làm | In Progress | P2 | PR #40 (Thanh Đạt, 13-17/10). Đã kiểm emulator: bật chế độ máy bay vẫn dịch "Tôi cần giúp đỡ" -> "I need help"; khách bị chặn dịch online. **Chưa nghiệm thu micro / bản đồ trên Samsung thật; iOS chưa build**. Ai đang dùng app cũ phải cài bản build native mới, Expo Go không chạy được. Xem `docs/TRANSLATION.md` |

### E6. Cảnh báo, hồ sơ và chuyến đi (batch B8)

| Mã | Task | Loại | Trạng thái | Jira | Ưu tiên | Nguồn / ghi chú |
|---|---|---|---|---|---|---|
| E6-01 | Cảnh báo vị trí do Admin tạo, hiện banner + danh sách, đánh dấu đã đọc, kéo để làm mới | Story | Xong | Done | - | B12 |
| E6-02 | Yêu thích, tuỳ chọn thông báo, liên hệ khẩn cấp lưu trên máy (ghi rõ trong app) | Story | Xong | Done | - | Quyết định form B6 |
| E6-03 | Bỏ nhãn "Đã mã hoá" sai sự thật ở thẻ Giấy tờ | Bug | Xong | Done | P1 | B03, quyết định form B7 |
| E6-04 | Tạo / sửa / xoá chuyến đi, nhiều quốc gia, gợi ý thành phố, tab Đang diễn ra / Sắp tới / Đã qua | Story | Xong | Done | - | `docs/FEATURE_GUIDES.md`, B09-B11, B18 |
| E6-05 | Tạo cảnh báo vị trí thật cho KR và kiểm cảnh báo theo khu vực GPS | Task | Chờ người | To Do (Blocked) | P4 | Form D3. **0 cảnh báo trên Atlas** nên chưa kiểm được phần khu vực |
| E6-06 | Điều khoản sử dụng, Chính sách bảo mật, thông tin liên hệ trong app | Story | Chờ người | To Do (Blocked) | P3 | Form E1. Cần văn bản từ người, không tự soạn |
| E6-07 | Lưu ảnh giấy tờ (hiện chỉ đánh dấu "đã chuẩn bị") | Story | Chưa làm | To Do | P4 | Cần quyết định bảo mật (form B7 phương án 2/3) |
| E6-08 | Push khi đóng app, geofence nền | Story | Chưa làm | Won't Do | Ngoài MVP | CLAUDE.md mục 4.4; chỉ ghi để khỏi bị hỏi lại |

### E7. Giao diện và thiết kế (Phú Long)

| Mã | Task | Loại | Trạng thái | Jira | Ưu tiên | Nguồn / ghi chú |
|---|---|---|---|---|---|---|
| E7-01 | Thiết kế lại giao diện mobile theo spec: màu, font, bo góc, Home, thanh điều hướng + nút SOS nổi | Story | Xong | Done | - | PR #30, #32; token khớp spec 100% |
| E7-02 | Sửa vùng an toàn thanh trạng thái, banner, `StatusBar` chữ tối | Bug | Xong | Done | P1 | B05, B06 |
| E7-03 | Sửa wizard chuyến đi (nhắc trường thiếu, cuộn đầu bước, đệm bàn phím), màn Cảnh báo, đệm dưới nút SOS | Bug | Xong | Done | P3 | Đợt sửa 2: B09-B14, B24 |
| E7-04 | Hoàn thiện chi tiết: cờ KR/SG, gợi ý tìm kiếm, dòng ngôn ngữ, tab chuyến đi trống, nhãn sự cố, Admin màn hẹp | Bug | Xong | Done | P4 | Đợt sửa 3: B15-B21 |
| E7-05 | Đưa file `FRONTEND_UI_SPECIFICATION.md` vào repo | Task | Xong | Done | P3 | B22, 12/10 (PR #37) |
| E7-06 | Xuất mã nguồn / mô tả giao diện mới từ ai.studio và giao cho Claude | Task | Chờ người | To Do (Blocked) | P2 | Phú Long dùng Save to GitHub hoặc Download app; xoá key trong `.env` trước khi gửi. Ai.studio là riêng tư, Claude không đọc được bằng link |
| E7-07 | Đối chiếu từng màn hình mobile + Admin với giao diện mới, lập bảng khớp/lệch | Task | Đang làm | In Progress | P2 | Phụ thuộc E7-06. Cập nhật 15/10 (PR #38): Long đã đối chiếu 16 màn mobile với PDF 23 màn; còn #04, #13, Hồ sơ một phần và 7 màn Admin; PDF chưa có trong repo |
| E7-08 | Cập nhật app theo giao diện mới (theo từng đợt, mỗi đợt một PR) | Epic | Đang làm | In Progress | P2 | Phụ thuộc E7-07. Có điểm cần nhóm chốt trước: nhãn 3 hay 4 mức cảnh báo; khung 5 bước sự cố; cỡ chữ 13-14px của spec so với 15-17px hiện tại. Cập nhật 15/10 (PR #38): đợt đầu đã merge (chỉ giao diện, chưa kiểm bằng mắt trên emulator) |
| E7-09 | Các tính năng có trong spec nhưng app chưa có: mục "Đọc tiếp" có % tiến độ, lọc "Mới cập nhật / đã xác minh", gợi ý từ khoá khi không có kết quả, 5 nhóm cảnh báo, sửa hồ sơ, 6 chỉ số KPI + lịch sử phiên bản + xem trước điện thoại ở Admin | Story | Chưa làm | To Do | P3 | Chỉ là kết quả tra từ khoá, **cần soát lại** trong E7-07 trước khi tạo ticket chi tiết |
| E7-10 | Không làm: Users + "Hội đồng Luật sư", Settings cấu hình Gemini, mức an toàn quốc gia, 8 quốc gia, emoji | Spike | Không làm | Won't Do | - | Trái quy tắc dự án (luật sư và sửa system prompt ngoài MVP, không bịa dữ liệu, Rule 12). Nên ghi chú vào spec |
| E7-11 | Thiết kế lại màn Be.Travel AI theo mẫu: header trạng thái + quốc gia, màn chào 4 thẻ hành động nhanh, câu trả lời có bước đánh số, nguồn dạng hàng, thẻ "Thông tin liên hệ" lấy từ hồ sơ Đại sứ quán | Story | Đang làm | In Progress | P3 | PR #45 (Phú Long, 19/10). Không đổi contract `ChatAnswer`; test đã cập nhật. Màn chat vẫn khoá bởi `EXPO_PUBLIC_AI_CHAT_ENABLED=false` nên **chưa nhìn trên emulator/máy thật**; nghiệm thu cùng E3-05 |

### E8. Hạ tầng, phát hành và bảo mật (batch B9)

| Mã | Task | Loại | Trạng thái | Jira | Ưu tiên | Nguồn / ghi chú |
|---|---|---|---|---|---|---|
| E8-01 | CI GitHub (backend, mobile, admin), `.gitattributes`, test chạy được trên Windows | Task | Xong | Done | - | `.github/workflows/ci.yml` |
| E8-02 | Seed dữ liệu, tài liệu bàn giao, kịch bản demo, hướng dẫn deploy | Task | Xong | Done | - | `DEMO_SCRIPT.md`, `DEPLOY.md`, `ACCEPTANCE.md` |
| E8-03 | Chặn tra cứu pháp luật bằng cờ `LEGAL_LOOKUP_ENABLED`; màn chặn cho phần chưa hoàn thiện | Task | Xong | Done | - | PR #27, #29 |
| E8-04 | Dọn code chết và dependency không dùng; vá advisory | Task | Xong | Done | - | PR #31; backend, admin 0 advisory |
| E8-05 | Deploy backend lên Render, nhập biến bí mật, thêm secret `BACKEND_HEALTH_URL` cho job giữ máy chủ thức | Task | Chờ người | To Do (Blocked) | P3 | Form F2. Hiện job keepalive chạy nhưng báo "Thiếu secret" và bỏ qua |
| E8-06 | Deploy Admin lên Vercel, cập nhật `CORS_ORIGINS` | Task | Chờ người | To Do (Blocked) | P3 | Sau E8-05 |
| E8-07 | Chốt định danh app (`android.package`, `ios.bundleIdentifier`, tên, `slug`, icon) | Task | Chờ người | To Do (Blocked) | P3 | Form F1. **Không đổi được sau khi lên store**. Hiện emulator dùng tạm `com.betravel.dev`, không commit |
| E8-08 | Build APK nội bộ bằng EAS trỏ vào backend Render (link cố định) để thành viên cài test | Task | Chưa làm | To Do | P3 | Phụ thuộc E8-05, E8-07. Thử nghiệm 11/10 bằng tunnel tạm chạy được nhưng link đổi mỗi lần bật nên không dùng lâu dài |
| E8-09 | Build và nộp Google Play / App Store | Epic | Chưa làm | To Do | P4 | Phụ thuộc E8-07, E1-07, E6-06; hiện chỉ có Android |
| E8-10 | Viết lại lịch sử git để xoá email thật, mật khẩu cũ, host cluster | Task | Chờ người | To Do (Blocked) | P1 | Form A2. Quyết định 08/10: **chưa làm**. Cần cân nhắc vì đổi lịch sử ảnh hưởng mọi nhánh |
| E8-11 | Đổi tên database `test` thành tên chính thức | Task | Xong | Done | P3 | Đã chốt 08/10/2026: giữ DB `test`, không có việc phải làm. Tạo ticket để lưu quyết định |
| E8-12 | Quyết định giữ hay xoá tài khoản QA trên Atlas | Task | Xong | Done | P2 | Đã chốt 08/10/2026: giữ tài khoản QA nội bộ, không có việc phải làm. Tạo ticket để lưu quyết định |

### E9. Kiểm thử và chất lượng

| Mã | Task | Loại | Trạng thái | Jira | Ưu tiên | Nguồn / ghi chú |
|---|---|---|---|---|---|---|
| E9-01 | Kiểm thử thực tế toàn hệ thống trên emulator, phân loại tính năng Chưa/Đang/Đã hoàn thiện | Task | Xong | Done | - | `FEATURE_STATUS_BUGS.md` |
| E9-02 | Thiết lập Android SDK, emulator, script `emu.sh`, tài liệu cạm bẫy | Task | Xong | Done | - | `docs/EMULATOR_TESTING.md` |
| E9-03 | Sửa 25 lỗi phát hiện (B01-B25) theo 3 đợt, mỗi đợt một PR | Task | Xong | Done | - | PR #34, #35, #36. Còn mở: B04 (dữ liệu), B08 (dữ liệu), B25 (người đồng ý) |
| E9-04 | Thử trên điện thoại thật Android + iPhone theo bảng 11 mục (chia sẻ vị trí, micro, TTS, GPS trong/ngoài nhà, thanh trạng thái, nút gọi, mất mạng, màn 375px, quên mật khẩu) | Task | Chờ người | To Do (Blocked) | P2 | Form G. Phần việc lớn nhất còn lại về kiểm thử |
| E9-05 | Kiểm onboarding slide 2-4 | Task | Chưa làm | To Do | P4 | Chưa kiểm vì mới thử slide 1 và "Bỏ qua" |
| E9-06 | Thêm test cho các luồng chưa có test tích hợp (Google login, quên mật khẩu) | Task | Chưa làm | To Do | P4 | `OPTIMIZATION_REPORT.md` mục "Vấn đề còn tồn đọng" |
| E9-07 | Nghiệm thu máy thật cho khôi phục phiên (Expo Go / emulator với `EXPO_PUBLIC_API_URL`) | Task | Chưa làm | To Do | P3 | Mới xác minh qua curl; app thật đã đăng nhập trên emulator 11/10 nhưng chưa thử kịch bản hết hạn phiên |


## 3b. Danh sách rút gọn theo trạng thái Jira (để tạo hàng loạt)

### In Progress (11)

- `E1-04` Quên mật khẩu bằng OTP email: xác minh thư tới hộp thư thật và bước đặt lại
- `E2-12` Tra cứu luật liên bang Úc (quốc gia Úc, phân loại, tóm lược, dịch)
- `E4-10` Bản đồ native + tìm kiếm, bộ lọc, camera, vệ tinh, phục hồi lỗi
- `E4-12` Lớp địa điểm bổ sung chưa xác minh `GET /api/support-locations/external` (OSM miễn phí hoặc SerpApi trả phí), luôn `verified:false`, không ghi DB
- `E4-13` Tìm Đại sứ quán / điểm hỗ trợ theo quốc gia đã chọn, không cần GPS
- `E5-03` Nhập giọng nói (micro -> văn bản)
- `E5-04` Phát âm bản dịch (TTS) đúng ngôn ngữ đích
- `E5-07` Dịch offline bằng ML Kit, mở màn Dịch cho khách, sửa micro
- `E7-07` Đối chiếu từng màn hình mobile + Admin với giao diện mới, lập bảng khớp/lệch
- `E7-08` Cập nhật app theo giao diện mới (theo từng đợt, mỗi đợt một PR)
- `E7-11` Thiết kế lại màn Be.Travel AI theo mẫu

### To Do, gắn cờ Blocked (chờ người) (18)

- `E2-06` Điền ngày hiệu lực + nguồn có ngày công bố cho 8 bài KR
- `E2-07` Chỉ định người duyệt chuyên môn pháp lý; duyệt và xuất bản bài đủ điều kiện
- `E2-08` Xác nhận người kiểm cho 5 hướng dẫn sự cố và 25 câu dịch đang hiển thị
- `E3-03` Chạy Reindex KR (tạo embedding cho bài đã xuất bản)
- `E3-04` Chạy bộ 26 câu golden bằng AI thật và ghi kết quả
- `E3-05` Mở khoá Be.Travel AI trên app (đổi cờ, kiểm lại toàn luồng chat, feedback, lịch sử)
- `E3-08` Xoá bản ghi `ai_events` hỏng dấu hiện ở Dashboard "Top câu hỏi bị fallback"
- `E4-07` Nhập điểm hỗ trợ thật cho KR (đại sứ quán, bệnh viện, đồn công an, nhà thuốc)
- `E4-08` Bổ sung toạ độ và đường dây bảo hộ 24/7 của Đại sứ quán
- `E4-09` Tạo Google Maps key Android (giới hạn package + SHA-1, đặt hạn mức chi phí), build lại native
- `E6-05` Tạo cảnh báo vị trí thật cho KR và kiểm cảnh báo theo khu vực GPS
- `E6-06` Điều khoản sử dụng, Chính sách bảo mật, thông tin liên hệ trong app
- `E7-06` Xuất mã nguồn / mô tả giao diện mới từ ai.studio và giao cho Claude
- `E8-05` Deploy backend lên Render, nhập biến bí mật, thêm secret `BACKEND_HEALTH_URL` cho job giữ máy chủ thức
- `E8-06` Deploy Admin lên Vercel, cập nhật `CORS_ORIGINS`
- `E8-07` Chốt định danh app (`android.package`, `ios.bundleIdentifier`, tên, `slug`, icon)
- `E8-10` Viết lại lịch sử git để xoá email thật, mật khẩu cũ, host cluster
- `E9-04` Thử trên điện thoại thật Android + iPhone theo bảng 11 mục (chia sẻ vị trí, micro, TTS, GPS trong/ngoài nhà, thanh trạng thái, nút gọi, mất mạng, màn 375px, quên mật khẩu)

### To Do (không bị chặn) (18)

- `E1-05` Đăng nhập bằng số điện thoại qua OTP SMS
- `E1-06` Nút Đăng nhập Google trên app (backend đã có `/auth/google`)
- `E1-07` Nút xoá tài khoản trong app + trang yêu cầu xoá
- `E2-09` Thêm trạng thái hiển thị (ẩn / hiện) cho câu dịch khẩn cấp
- `E2-10` Mở thêm quốc gia (Nhật Bản, Thái Lan hoặc Singapore): nội dung + nguồn
- `E2-11` Kiểm Admin: xuất bản bài + job index, nhập điểm hỗ trợ hàng loạt, xử lý feedback
- `E3-06` Cảnh báo ở Admin khi bài `published` mà chưa index
- `E3-07` Câu trả lời AI 4 phần theo spec (trả lời, việc nên làm, điều cần tránh, nguồn) + nút Tạo lại
- `E4-11` Bottom sheet SOS hiện toạ độ GPS + 3 nút một chạm; trạng thái mở/đóng cửa; vẽ tuyến đường trong app
- `E5-05` Mở rộng sự cố lên 8 danh mục và khung 5 bước chuẩn bảo hộ lãnh sự
- `E5-06` Lọc 7 nhóm tình huống và lưu mẫu câu yêu thích theo spec
- `E6-07` Lưu ảnh giấy tờ (hiện chỉ đánh dấu "đã chuẩn bị")
- `E7-09` Các tính năng có trong spec nhưng app chưa có: mục "Đọc tiếp" có % tiến độ, lọc "Mới cập nhật / đã xác minh", gợi ý từ khoá khi không có kết quả, 5 nhóm cảnh báo, sửa hồ sơ, 6 chỉ số KPI + lịch sử phiên bản + xem trước điện thoại ở Admin
- `E8-08` Build APK nội bộ bằng EAS trỏ vào backend Render (link cố định) để thành viên cài test
- `E8-09` Build và nộp Google Play / App Store
- `E9-05` Kiểm onboarding slide 2-4
- `E9-06` Thêm test cho các luồng chưa có test tích hợp (Google login, quên mật khẩu)
- `E9-07` Nghiệm thu máy thật cho khôi phục phiên (Expo Go / emulator với `EXPO_PUBLIC_API_URL`)

### Won't Do (không tạo hoặc đóng) (2)

- `E6-08` Push khi đóng app, geofence nền
- `E7-10` Không làm: Users + "Hội đồng Luật sư", Settings cấu hình Gemini, mức an toàn quốc gia, 8 quốc gia, emoji

### Done (36)

Xem các dòng có cột Jira = Done ở mục 3. Nên tạo gộp theo Epic và theo đợt sửa (đợt 1, 2, 3) nếu không muốn tạo từng dòng.

## 4. Việc đang chờ người, gom theo người phụ trách

| Người | Việc | Mã task |
|---|---|---|
| Người duyệt nội dung pháp lý | Chỉ định người duyệt; điền ngày hiệu lực + nguồn cho 8 bài; duyệt; xác nhận 5 sự cố và 25 câu dịch | E2-06, E2-07, E2-08 |
| Người phụ trách dữ liệu SOS | Nhập điểm hỗ trợ KR; toạ độ + hotline 24/7 của Đại sứ quán; cảnh báo vị trí thật | E4-07, E4-08, E6-05 |
| Trưởng nhóm | Deploy Render / Vercel; chốt định danh app; Google Cloud key Maps; ngân sách AI; văn bản Điều khoản / Chính sách; quyết định lịch sử git; đồng ý xoá bản ghi hỏng dấu | E8-05..E8-07, E4-09, E3-03..E3-05, E6-06, E8-10, E3-08 |
| Phú Long | Xuất mã nguồn / mô tả giao diện từ ai.studio | E7-06 |
| Thành viên có điện thoại | Thử 11 mục trên máy thật; thử "Quên mật khẩu" bằng email thật; thử dịch offline, micro, bản đồ trên Samsung | E9-04, E1-04, E5-07 |
| Thanh Đạt | Nghiệm thu micro + bản đồ trên Samsung thật; build iOS; thử lại tìm Đại sứ quán khi Overpass ổn định | E5-07, E4-13 |

## 5. Gợi ý cách tạo trên Jira

- **Epic:** E1-E9 ở trên, mỗi Epic một ticket.
- **Task đã Xong:** tạo ở trạng thái Done để có lịch sử; có thể gộp theo đợt (ví dụ "Đợt sửa 1, 2, 3") thay vì từng dòng nếu muốn gọn.
- **Nhãn gợi ý:** `mobile`, `backend`, `admin`, `content`, `infra`, `needs-human`, `device-test`, `post-mvp`.
- **Cờ Blocked** cho mọi dòng "Chờ người", ghi rõ người chịu trách nhiệm ở trường mô tả.
- **Thứ tự nên làm tiếp để mở nút thắt:** E7-06 (Phú Long, không phụ thuộc gì) -> E2-07 (người duyệt, mở khoá E3 và Cẩm nang) -> E8-05 (Render, mở khoá APK dùng lâu dài) -> E9-04 (thử máy thật).

## 6. Giới hạn của tài liệu này

- Trạng thái tính năng dựa trên lần kiểm thử emulator ngày 07-11/10 và các sổ trong `docs/`. Mục nào chỉ kiểm trên emulator thì chưa chắc đúng trên máy thật.
- Danh sách tính năng spec "app chưa có" (E7-09) là kết quả tra từ khoá trong code, chưa soát từng màn hình.
- Số liệu dữ liệu Atlas (8 bài nháp, 0 điểm hỗ trợ, 0 cảnh báo) lấy từ Dashboard Admin ngày 11/10; nên kiểm lại trước khi báo cáo.
- Không có thông tin về người phụ trách cụ thể của từng task ngoài các vai trò gợi ý trong form quyết định; hãy gán lại theo thực tế nhóm.
