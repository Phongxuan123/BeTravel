# TRANG THAI TINH NANG & DANH SACH LOI — KIEM THU THUC TE

Lần kiểm thử: 07/10/2026 · Code: `main` @ `9173411` · Người chạy: Claude (theo CLAUDE.md mục 5.1b)
Cập nhật 08/10/2026: đợt sửa 1 (B01-B08, B23) trên nhánh `fix/wave1-sos-safety`, xem cột "Xử lý".
Cập nhật 09/10/2026: đợt sửa 2 (B09-B14, B24) trên nhánh `fix/wave2-ux`.

Tài liệu này là đầu vào để lên kế hoạch khắc phục. Mỗi lỗi có mã `Bxx` để giao việc và
theo dõi. Khi sửa xong một lỗi, ghi ngày + PR vào cột "Xử lý" thay vì xoá dòng.

---

## 1. Cách kiểm thử

| Mục | Giá trị |
|---|---|
| Thiết bị | Android Emulator `BeTravel_Pixel7` (Android 16, API 36), bản build native `com.betravel.dev` |
| Backend | `npm run dev` thật, nối MongoDB Atlas DB `test`, `LLM_PROVIDER=gemini`, `SEARCH_DRIVER=memory` |
| Admin | Vite dev, mở bằng Chrome trong emulator |
| Tài khoản | QA tự đăng ký qua app (`qa.emulator.1007@betravel.test`), user và admin do người dùng cung cấp |
| Cách đi | Thao tác như người dùng: bấm, gõ, đọc màn hình (ảnh chụp + cây UI), đối chiếu log app và API |

Không dùng mock. Mọi kết quả dưới đây là hành vi thật của hệ thống tại thời điểm test.

## 2. Giao diện mới (redesign của Phú Long)

**Đã áp dụng.** Xác nhận trực tiếp trên emulator, Metro đã xoá cache:
Home có hero "BẠN ĐANG Ở" + "LƯU Ý PHÁP LÝ QUAN TRỌNG", dải "Gọi nhanh khẩn cấp"
(Cảnh sát / Cấp cứu / Đại sứ quán), nút SOS nổi giữa thanh điều hướng, màu Brand Blue
`#1677FF`, font Plus Jakarta Sans và JetBrains Mono.

Lưu ý: file đặc tả `FRONTEND_UI_SPECIFICATION.md` mà commit nhắc tới **không có trong repo**,
nên không đối chiếu được từng chi tiết với bản thiết kế gốc (xem B22).

---

## 3. Trạng thái tính năng

Định nghĩa:
- **Đã hoàn thiện**: chạy được trọn luồng với dữ liệu thật; chỉ còn lỗi hiển thị nhỏ.
- **Đang hoàn thiện**: chạy một phần, hoặc chạy nhưng thiếu dữ liệu/cấu hình, hoặc có lỗi không chặn hẳn.
- **Chưa hoàn thiện**: người dùng không dùng được tính năng này.

### 3.1. Mobile app

| Nhóm | Tính năng | Trạng thái | Ghi chú / lỗi liên quan |
|---|---|---|---|
| Tài khoản | Onboarding (màn chào) | Đã hoàn thiện | Mới kiểm slide 1 + "Bỏ qua" |
| Tài khoản | Đăng ký | Đã hoàn thiện | Tự đăng nhập, chuyển thẳng vào wizard chuyến đi |
| Tài khoản | Đăng nhập email | Đã hoàn thiện | |
| Tài khoản | Đăng nhập số điện thoại | Đã hoàn thiện | |
| Tài khoản | Đăng xuất | Đã hoàn thiện | Có hộp xác nhận |
| Tài khoản | Đổi mật khẩu | Đã hoàn thiện | Báo đúng khi sai mật khẩu cũ; đổi xong thu hồi phiên |
| Tài khoản | Quên mật khẩu (OTP email) | Đang hoàn thiện | Server nhận yêu cầu, SMTP đã cấu hình; chưa xác minh mail tới nơi và bước đặt lại |
| Tài khoản | Sửa hồ sơ (tên, SĐT) | Đã hoàn thiện | Lưu lên server |
| Chuyến đi | Tạo chuyến đi (wizard 4 bước) | Đã hoàn thiện | B09, B10, B11 |
| Chuyến đi | Sửa chuyến đi | Đã hoàn thiện | Điền sẵn dữ liệu cũ đúng |
| Chuyến đi | Xoá chuyến đi | Đã hoàn thiện | B18 |
| Chuyến đi | Danh sách + tab Đang diễn ra / Sắp tới / Đã qua | Đã hoàn thiện | |
| Home | Hero chuyến đi, lưu ý pháp lý, lối tắt | Đã hoàn thiện | B06, B14, B15, B20 |
| Cẩm nang | Danh sách bài, lọc chủ đề, đổi quốc gia | Đã hoàn thiện | B05, B15 |
| Cẩm nang | Chi tiết bài (nguồn, hiệu lực, quy định chính) | Đã hoàn thiện | B11 |
| Cẩm nang | Lưu / bỏ lưu, danh sách Đã lưu | Đã hoàn thiện | B05, B19 |
| Cẩm nang | Chia sẻ bài | Đã hoàn thiện | Mở bảng chia sẻ Android, kèm link nguồn |
| Cẩm nang | Nội dung quốc gia khác KR | Chưa hoàn thiện | JP/SG/TH "Sắp ra mắt"; có báo trống rõ |
| Tìm kiếm | Tìm bài (có dấu, không dấu) | Đã hoàn thiện | B16 |
| AI pháp lý | Chat trên app | Chưa hoàn thiện | Khoá có chủ đích (`EXPO_PUBLIC_AI_CHAT_ENABLED`); xem B04 |
| AI pháp lý | Lịch sử hỏi AI | Chưa hoàn thiện | Dẫn tới màn AI đang khoá |
| Dịch | Dịch văn bản Việt-Anh, Việt-Hàn | Đã hoàn thiện | Gọi backend thật, có phiên âm, hiểu câu gõ không dấu |
| Dịch | Câu mẫu, lưu câu, phóng to toàn màn, sao chép | Đã hoàn thiện | |
| Dịch | Phát âm (TTS) | Đang hoàn thiện | Không có lỗi trên UI; emulator không nghe được để xác nhận |
| Dịch | Nhập bằng giọng nói | Đang hoàn thiện | B02 đã sửa 08/10; chờ thử nói thật trên điện thoại |
| SOS | Số khẩn cấp + gọi (mở trình quay số) | Đã hoàn thiện | 112/119/122 và số Đại sứ quán; cần người xác minh số (mục 5) |
| SOS | Xác định vị trí trong SOS Hub | Đã hoàn thiện | B07 đã sửa 08/10 |
| SOS | Địa điểm hỗ trợ gần bạn | Chưa hoàn thiện | B08 (0 dữ liệu) |
| SOS | Bản đồ hỗ trợ | Đang hoàn thiện | Chưa có Google Maps key; có màn thay thế + nút mở Google Maps |
| SOS | Chia sẻ vị trí với người thân | Đã hoàn thiện | B01 đã sửa 08/10; mở cho cả khách chưa đăng nhập (B23) |
| Sự cố | 5 quy trình xử lý, đánh dấu bước, checklist, lưu | Đã hoàn thiện | B19 |
| Cảnh báo | Nhận cảnh báo từ admin (banner + danh sách) | Đã hoàn thiện | B06, B12; hiện chưa có cảnh báo thật nào trên Atlas |
| Cảnh báo | Cảnh báo theo khu vực GPS | Đang hoàn thiện | Chưa có dữ liệu cảnh báo khu vực để kiểm |
| Cá nhân | Liên hệ khẩn cấp (thêm, gọi, xoá) | Đã hoàn thiện | B13 (chốt lưu trên máy, ghi rõ trong app) |
| Cá nhân | Giấy tờ của tôi | Đang hoàn thiện | Chỉ đánh dấu đã chuẩn bị, chưa lưu ảnh; B03 |
| Cài đặt | Bật/tắt cảnh báo, nhắc chuyến đi | Đang hoàn thiện | Chỉ trong app; không có push khi đóng app (ngoài MVP) |
| Cài đặt | Ngôn ngữ ứng dụng | Chưa hoàn thiện | B17 (đa ngôn ngữ ngoài MVP) |

### 3.2. Admin Portal

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Đăng nhập admin | Đã hoàn thiện | |
| Dashboard số liệu | Đã hoàn thiện | Số liệu khớp DB |
| 10 trang quản lý (Quốc gia, Chủ đề, Bài luật, Điểm hỗ trợ, Sự cố, Câu dịch, Cảnh báo, RAG Index, Feedback, Nhật ký) | Đã hoàn thiện | Đều tải được, không lỗi |
| Tạo bài luật (nháp) | Đã hoàn thiện | Kiểm qua API admin |
| Tạo / xoá cảnh báo vị trí | Đã hoàn thiện | Hiện ngay trên app user |
| Xuất bản bài + index RAG | Chưa kiểm | Không bấm để tránh đổi dữ liệu nội dung thật |
| Nhập điểm hỗ trợ hàng loạt | Chưa kiểm | |
| Giao diện trên màn hẹp | Đang hoàn thiện | B21 |

### 3.3. Backend / quy tắc lõi

| Quy tắc | Kết quả |
|---|---|
| Bài nháp không lọt ra trang chi tiết, tìm kiếm | Đạt (tạo bài nháp có mã đánh dấu, cả 2 đường đều không trả về). **Đính chính 08/10:** phép kiểm "danh sách công khai" lần đầu gọi sai tham số (`countryCode` thay vì `country`) nên chỉ nhận `VALIDATION_ERROR`, không chứng minh được gì; việc lọc danh sách được bộ test backend kiểm riêng |
| AI từ chối khi không đủ dữ liệu, không gọi LLM | Đạt (`INSUFFICIENT_EVIDENCE`, `model: none`) |
| Đổi mật khẩu thu hồi phiên cũ | Đạt |
| RBAC admin | Đạt cho các trang đã mở (đăng nhập admin mới vào được) |

---

## 4. Danh sách lỗi

Mức: **Nghiêm trọng** (tính năng chính không dùng được / sai sự thật với người dùng) ·
**Cao** (ảnh hưởng mọi người dùng hoặc chặn thao tác) · **Trung bình** · **Thấp**.

### 4.1. Nghiêm trọng

| Mã | Lỗi | Cách tái hiện | Nguyên nhân đã xác định | Hướng sửa đề xuất | Xử lý |
|---|---|---|---|---|---|
| B01 | "Chia sẻ vị trí với người thân": bấm "Lấy vị trí của tôi" không có kết quả, không báo lỗi | SOS Hub --> Chia sẻ vị trí --> Lấy vị trí của tôi | `requestForegroundPermissionsAsync` mở activity hệ thống làm app Pause/Resume; listener `AppState` coi là "rời app" nên tăng `generation` và bỏ kết quả. Log xác nhận `onHostPause` ngay khi bấm. `mobile/src/app/sos/share-location.tsx` dòng 24-31, 52-93 | Chỉ huỷ khi `background` kéo dài hoặc bỏ qua chuyển trạng thái trong lúc đang xin quyền; khi bị huỷ phải hiện thông báo | Đã sửa 08/10/2026, nhánh `fix/wave1-sos-safety`; xác nhận trên emulator (quyền lần đầu, chờ 4 giây vẫn ra toạ độ) + test hồi quy |
| B02 | Nhập bằng giọng nói không bao giờ bắt đầu nghe | Dịch nhanh --> bấm micro | Cùng nguyên nhân B01: `requestPermissionsAsync` --> `AppState != active` --> `cancel()` (còn xoá luôn thông báo lỗi). `mobile/src/features/translate/useVoiceInput.ts` dòng 47-51. Ngoài ra bấm micro gọi `invalidateResult()` nên xoá bản dịch đang hiển thị | Như B01; chỉ xoá bản dịch khi đã nhận được văn bản mới | Đã sửa 08/10/2026, nhánh `fix/wave1-sos-safety`; emulator xác nhận "Đang nghe" sau khi app bị pause lúc xin quyền, bản dịch giữ nguyên + test hồi quy. Nói thật cần điện thoại |
| B03 | Thẻ "Giấy tờ của tôi" ghi "Đã mã hoá" nhưng dữ liệu không mã hoá | Cá nhân --> Giấy tờ của tôi | Ghi chú giấy tờ (có thể chứa số hộ chiếu) lưu qua `useUserStorage` --> AsyncStorage dạng văn bản thường. `mobile/src/app/profile/index.tsx` dòng 154, `features/profile/useDocumentStatus.ts` | Bỏ nhãn ngay; nếu cần lưu số giấy tờ thì chuyển sang `expo-secure-store` | Đã sửa 08/10/2026, nhánh `fix/wave1-sos-safety` (phương án 1): bỏ nhãn, ghi rõ "chỉ lưu trên máy, chưa mã hoá" |
| B04 | AI pháp lý không thể trả lời câu nào kể cả khi mở khoá | Gọi API chat với câu về bằng lái quốc tế (đã có bài xuất bản) | 2 bài đã xuất bản đều `indexState: not_indexed`, 0 chunk. Guard từ chối đúng, nhưng kho tri thức rỗng | Vận hành: chạy Reindex KR trong Admin --> RAG Index; thêm cảnh báo khi bài `published` mà chưa index | Chờ dữ liệu: 2 bài mẫu đã gỡ về nháp (B2), chưa có bài nào được duyệt để index |

### 4.2. Cao

| Mã | Lỗi | Cách tái hiện | Nguyên nhân / vị trí | Hướng sửa đề xuất | Xử lý |
|---|---|---|---|---|---|
| B05 | Màn Cẩm nang và Cá nhân không chừa vùng an toàn phía trên; tiêu đề và nút nằm dưới thanh trạng thái, chạm phần trên nút "Đã lưu" không ăn | Mở Khám phá hoặc Cá nhân | Nút "Đã lưu" nằm ở y 37-152 px, thanh trạng thái 0-136 px. Hai màn này không dùng safe-area inset như các màn có `PageHeader` | Dùng `useSafeAreaInsets` / `SafeAreaView` cho header của hai màn | Đã sửa 08/10/2026, nhánh `fix/wave1-sos-safety`: `TopInsetView` / `useScreenTopInset`; nút "Đã lưu" nay ở y 178-294 |
| B06 | Giờ, pin, sóng trên thanh trạng thái gần như vô hình; banner cảnh báo đè lên thanh trạng thái | Mọi màn, rõ nhất khi máy để giao diện tối | App không khai báo kiểu thanh trạng thái (không có `StatusBar` nào); Android vẽ biểu tượng trắng trên nền sáng | Thêm `StatusBar` kiểu chữ tối ở `_layout.tsx`; đẩy banner cảnh báo xuống dưới inset trên | Đã sửa 08/10/2026, nhánh `fix/wave1-sos-safety`: `StatusBar` chữ tối; banner chừa vùng thanh trạng thái, header bên dưới không chừa lặp |
| B07 | "Cập nhật" vị trí ở SOS Hub thất bại im lặng | SOS Hub --> Cập nhật khi GPS chậm (trong nhà) | `lib/locationPermission.ts`: chỉ chờ fix mới 15 s, lỗi --> `return null`, không dùng vị trí gần nhất máy đã có, không báo lý do | Thử `getLastKnownPositionAsync` trước/sau; hiện lý do (hết giờ, tắt GPS, từ chối quyền) | Đã sửa 08/10/2026, nhánh `fix/wave1-sos-safety`: dự phòng vị trí đã biết trong 5 phút, `requestLocationDetailed` báo lý do + test hồi quy |
| B08 | "Địa điểm hỗ trợ gần bạn" luôn trống, không có câu báo | SOS Hub sau khi định vị | Atlas có **0** điểm hỗ trợ; UI hiện tiêu đề rồi để trống | Dữ liệu: nhập điểm hỗ trợ thật (mục 5). UI: thêm trạng thái trống có nút mở bản đồ/Google Maps | Phần giao diện đã sửa 08/10/2026 (thực tế lỗi nằm ở bản đồ: câu báo bị cắt trong ScrollView; nay hiện rõ + nút gọi cảnh sát). Dữ liệu vẫn 0 điểm |
| B23 | Người chưa đăng nhập không vào được SOS (số khẩn cấp, chia sẻ vị trí); vì vậy bộ số dùng khi mất mạng gần như không tới được người mới | Cài app mới, chưa có tài khoản --> không có lối vào SOS | `AppGate` chỉ cho khách 5 màn công khai | Phát hiện và sửa 08/10/2026 theo quyết định của người dùng: mở `/sos`, `/sos/share-location` cho khách (bỏ qua cả cổng onboarding), thêm nút SOS ở màn chào và màn đăng nhập; bản đồ vẫn cần đăng nhập | Đã sửa 08/10/2026, xác nhận trên emulator + test `AppGate` |

### 4.3. Trung bình

| Mã | Lỗi | Vị trí | Hướng sửa | Xử lý |
|---|---|---|---|---|
| B09 | Wizard bước 1: chọn nước xong nút "Tiếp tục" vẫn mờ, không chỉ ra ô bắt buộc "Thành phố" nằm khuất bên dưới | `app/trips/new.tsx` | Tự cuộn tới ô thiếu hoặc ghi rõ lý do dưới nút | Đã sửa 09/10/2026, nhánh `fix/wave2-ux`: dòng nhắc dưới nút nêu trường còn thiếu; bấm "Đến ô nhập" cuộn tới và mở bàn phím, đệm thêm chiều cao bàn phím để ô không bị che (emulator) |
| B10 | Wizard bước 2 mở ra giữ vị trí cuộn của bước 1: che "Ngày đi / Ngày về", tiêu đề tháng bị thanh tiến độ đè | `app/trips/new.tsx` | Cuộn về đầu khi đổi bước | Đã sửa 09/10/2026, nhánh `fix/wave2-ux`: cuộn về đầu mỗi lần đổi bước; thêm khoảng đệm dưới thanh tiến độ (emulator) |
| B11 | Hiển thị dữ liệu thô: ngày ISO `2026-10-07` (wizard bước 2, 4), mã nước `KR` (chặng "Chặng 1: KR", chip ở chi tiết bài, mục Đã lưu) | wizard, `explore/[country]/[slug].tsx`, `favorites` | Dùng `formatShortDate` và tên quốc gia | Đã sửa 09/10/2026, nhánh `fix/wave2-ux`: wizard dùng dd/MM/yyyy và tên nước (emulator); chi tiết bài + mục Đã lưu dùng `useCountryName` (chưa kiểm trên máy vì Atlas 0 bài published) |
| B12 | Màn Cảnh báo: khoảng trắng lớn giữa bộ lọc và danh sách; mức `warn` hiện nhãn "Cao"; kéo để làm mới không cập nhật | `app/alerts/index.tsx` | Sửa bố cục; rà bảng quy đổi mức độ; thêm refetch khi kéo | Đã sửa 09/10/2026, nhánh `fix/wave2-ux`: `flexGrow: 0`, nhãn mức độ trùng Admin (`warn` = Cảnh báo, `danger` = Nguy hiểm), kéo để làm mới gọi lại API (emulator, cảnh báo thử đã xoá) |
| B13 | Liên hệ khẩn cấp chỉ lưu trên máy (AsyncStorage), mất khi đổi máy/cài lại | `features/profile/useEmergencyContacts.ts` | Quyết định nghiệp vụ: đồng bộ lên server hay ghi rõ "chỉ lưu trên máy này" | Theo quyết định B6: giữ trên máy, ghi rõ "Chỉ lưu trên điện thoại này" (đã làm 08/10/2026, đợt 1) |
| B14 | Nút SOS nổi che thẻ "Cấp cứu" và nội dung cuối danh sách khi cuộn ở Home, Cẩm nang | `components/common/AppShell.tsx` | Thêm khoảng đệm dưới bằng chiều cao thanh điều hướng + nút nổi | Đã sửa 09/10/2026, nhánh `fix/wave2-ux`: `useAppShellBottomPadding()` tính theo thanh điều hướng + nút SOS + vùng an toàn, dùng ở 6 màn (emulator: Home, Cá nhân) |
| B24 | Chi tiết bài luôn hiện chip chủ đề "Giao thông" (viết cứng) dù bài thuộc chủ đề khác | `explore/[country]/[slug].tsx` | Lấy nhãn chủ đề theo `topicKey` | Phát hiện và sửa 09/10/2026 cùng B11, nhánh `fix/wave2-ux` (chưa kiểm trên máy vì Atlas 0 bài published) |

### 4.4. Thấp

| Mã | Lỗi | Hướng sửa | Xử lý |
|---|---|---|---|
| B15 | Cờ quốc gia vẽ giản lược sai (Hàn Quốc là chấm tím) | Dùng ảnh cờ hoặc icon cờ chuẩn | |
| B16 | Gợi ý mẫu trong ô tìm kiếm "Ở Hàn Quốc có được hút thuốc trên đường không?" nhưng không có bài nào khớp | Đổi gợi ý theo bài đang có | |
| B17 | Dòng "Ngôn ngữ ứng dụng" trông bấm được nhưng không phản hồi | Bỏ mũi tên / hiện "Chỉ có tiếng Việt" | |
| B18 | "Chuyến đi của tôi" khi trống chỉ còn 3 tab, không có câu báo + nút tạo | Thêm trạng thái trống | |
| B19 | Sự cố "Mất hộ chiếu": chi tiết ghi "Hàn Quốc", mục Đã lưu ghi "Áp dụng mọi quốc gia" | Thống nhất nguồn trường quốc gia | |
| B20 | Home ghi "Quy trình xử lý 5 bước" trong khi các sự cố có 3-5 bước | Đổi thành "Hướng dẫn từng bước" | |
| B21 | Admin Portal không co giãn trên màn hẹp (sidebar chiếm nửa màn) | Thu gọn sidebar dưới breakpoint `md` | |
| B22 | `FRONTEND_UI_SPECIFICATION.md` không có trong repo | Phú Long đưa file lên `docs/` | |

---

## 5. Dữ liệu và việc cần người làm

| Việc | Vì sao | Ảnh hưởng tới |
|---|---|---|
| Nhập điểm hỗ trợ thật cho KR (bệnh viện, đồn công an, nhà thuốc) | Atlas đang 0 điểm | B08, bản đồ, nút "Đồn công an gần nhất" trong Sự cố |
| Chạy Reindex KR trong Admin --> RAG Index | Chỉ sau khi có bài được duyệt và người giữ ngân sách cho phép (quyết định B4, F5) | B04, AI pháp lý |
| Bổ sung nguồn cho 6 bài nháp rồi duyệt | Chỉ 2/8 bài xuất bản | Cẩm nang, AI |
| ~~Xác minh số Đại sứ quán~~ **Đã xong 08/10:** trang chính thức ghi `+82 (02) 7205124`; đã sửa trên Atlas, seed và bộ số dùng khi mất mạng. Còn thiếu: toạ độ, đường dây bảo hộ 24/7 | | SOS Hub, Sự cố |
| ~~2 bài mẫu~~ **Đã gỡ về nháp 08/10** theo quyết định B2 (qua đúng quy trình published --> archived --> draft); script `seed:samples` đã xoá | Chờ người duyệt chuyên môn | Cẩm nang, AI |
| Cấp `GOOGLE_MAPS_ANDROID_API_KEY` (+ quota cap) rồi build lại native | Bản đồ native chưa cấu hình | Bản đồ SOS |
| Tạo cảnh báo vị trí thật (nếu có) | Atlas đang 0 cảnh báo | Màn Cảnh báo |

## 6. Chưa kiểm được trong lần này

- Âm thanh phát âm (TTS) và nhận giọng nói thật: emulator không nghe/nói được; B02 chặn trước đó.
- Email OTP tới hộp thư và bước đặt lại mật khẩu: không gửi OTP vào email thật của người khác.
- iOS và điện thoại Android thật (GPS thật, mạng di động, hiệu năng).
- Onboarding slide 2-4.
- Admin: xuất bản bài + job index, nhập điểm hỗ trợ hàng loạt, xử lý feedback (cần câu trả lời AI có trích dẫn).

## 7. Dữ liệu thử đã tạo / đã dọn trên Atlas

| Bản ghi | Trạng thái |
|---|---|
| Tài khoản `qa.emulator.1007@betravel.test` | Giữ lại làm tài khoản QA (mật khẩu ở `%USERPROFILE%\.betravel\qa-account.txt`) |
| Chuyến đi Seoul của tài khoản QA | Đã xoá qua app |
| Bài nháp `qa-test-draft-1007` | Đã xoá |
| Cảnh báo `[QA TEST] Canh bao thu nghiem` | Đã xoá |
| Phiên chat thử | Đã xoá |
| Cảnh báo `[QA TEST] Cảnh báo thử nghiệm` (08/10, kiểm tra banner) | Đã xoá |
| Dữ liệu app trên emulator (`pm clear` để thử lần mở đầu tiên) | Đã xoá trên máy ảo; liên hệ khẩn cấp thử của tài khoản QA mất theo |
| 1 bài + 1 sự cố đã lưu, 1 liên hệ khẩn cấp (chỉ trên emulator) của tài khoản QA | Giữ lại, không ảnh hưởng người dùng khác |
| Nhật ký kiểm toán admin (tạo bài, tạo/xoá cảnh báo) | Giữ nguyên: là lịch sử thao tác, không nên sửa |
