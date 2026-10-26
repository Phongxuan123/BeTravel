# ACCEPTANCE CRITERIA — BE.TRAVEL

## Khôi phục lối tắt tra cứu luật — 26/10/2026

Đã xong: typecheck/lint mobile và 10 kiểm thử lối tắt/dịch đạt.

Theo yêu cầu mới, “Tra cứu luật nhanh” trở lại `/search` như trước. Quyết định
này thay thế phần đồng bộ lối tắt ở mục dưới; Khám phá và nguồn luật Úc không
đổi. Giữ chế độ dịch mặc định online và toàn bộ luồng còn lại. Không sửa
backend/.env.example, không push Git.

## Dịch mặc định online và đồng bộ lối tắt pháp luật — 26/10/2026

Tiến độ `[###-] 3/4`: sửa luồng, kiểm tự động, tài liệu xong; nghiệm thu điện
thoại còn mở. Backend 409/409, mobile 265/265 (58 suites), admin 22/22: tổng
696 tests đạt. Lint/typecheck, backend format và admin build đạt. Mobile chạy
--detectOpenHandles kết thúc exit 0, còn cảnh báo act ở SosMapScreen và
TranslatorForm trong full suite (10 tests mục tiêu chạy riêng không cảnh báo).
Chưa kết luận có lỗi runtime từ cảnh báo test này; theo dõi riêng. Nợ audit đã
ghi trước đó chưa được đóng, không thay dependency trong đợt này.

- Công tắc “Dịch không cần mạng” mặc định tắt khi khởi tạo màn dịch. Người dùng
  chủ động bật offline khi cần; không tự phát hiện Wi-Fi, không tự gửi văn bản
  nếu chưa bấm dịch và không thay cơ chế dịch tích hợp/ML Kit/giới hạn online.
- Nguyên nhân lối tắt trống: trang chủ đi /search, chỉ tìm kho bài viết khi có
  từ khóa; luật liên bang Úc là nguồn riêng ở /explore (AuLawsSection).
  Nay “Tra cứu luật nhanh” đi cùng /explore như tab Khám phá, dùng chung quốc
  gia đã chọn, truy vấn/cache và lối vào /laws theo chủ đề. Không sao chép dữ
  liệu luật, không đổi contract/backend hoặc trạng thái công khai nội dung.
- Hồi quy: mở/remount dịch phải tắt offline; bật tay vẫn dịch được. Trang chủ
  đi Khám phá, kho bài rỗng vẫn có nhóm luật Úc và bấm được /laws theo chủ đề.
- Giới hạn: chưa kiểm trực tiếp trên điện thoại hoặc dịch vụ luật/SMTP/AI thật.
  Rà soát là trong dự án, không khẳng định đã sửa mọi lỗi của hệ điều hành.
  Giữ nguyên backend/.env.example đang sửa; không push, không ghi DB thật.

## Hợp nhất main ngày 26/10/2026 (hiện hành)

Tiến độ `[####] 4/4`: dự phòng, hợp nhất, xử lý xung đột và kiểm tự động xong.
Backend 409/409, mobile 263/263 (57 suites), admin 22/22: tổng 694 tests đạt.
Lint/typecheck tương ứng, backend format và admin production build đạt.
Mobile lần đầu báo thoát chậm nhưng exit 0; chạy lại với --detectOpenHandles
đạt 263 tests, exit 0, không báo handle còn mở. Không build native lại lần này.

- Nhận main `0805c46` (PR #56, #57) vào `feature/offline-translation-20261012`.
  Backup trước merge: `backup/offline-before-main-20261026-1d8c0b1`.
- Nhận tầng tra web nguồn chính phủ, bộ nhớ câu trả lời và mở lại chat AI mặc
  định từ main; giữ nguyên dịch offline, logo và luồng auth đang làm cục bộ.
- Hai xung đột tài liệu được giải quyết bằng cách giữ nội dung cả hai phía.
  Mã nguồn hợp nhất tự động. Thay đổi chưa commit backend/.env.example được
  stash/khôi phục, diff cục bộ sau merge khớp trước merge; giữ ngoài commit.
- Không sửa .env thật, không chạy seed/index hoặc gọi AI trả phí. Không push,
  không merge ngược vào main. Chưa nghiệm thu điện thoại hoặc dịch vụ thật;
  bộ kiểm thử backend dùng DB tạm và provider mock. Nợ audit trước vẫn còn.

## Hợp nhất main ngày 25/10/2026 (hiện hành)

Tiến độ `[####] 4/4`: dự phòng, hợp nhất, xử lý xung đột và kiểm tự động xong.
Backend 396/396, mobile 262/262 (57 suites): tổng 658 tests chạy lần này đạt.
Backend lint/format và mobile typecheck/lint đạt. Backend dùng DB tạm, provider
mock; kết quả này không phải nghiệm thu UI hay dịch vụ bên ngoài trên máy thật.

- Nhận main `0a94efc` (PR #54, #55) vào `feature/offline-translation-20261012`.
  Backup trước merge: `backup/offline-before-main-20261025-42d4cc6`.
- Nhận phản hồi AI khi thiếu nguồn, cache xác minh luật và khóa chat AI mặc định
  theo main. Giữ nguyên dịch offline, logo, auth và các bản vá dependency cục bộ.
- Chỉ xung đột PROGRESS/OPTIMIZATION_REPORT; giữ cả hai phía tài liệu. Không
  phát sinh xung đột mã nguồn. Thay đổi chưa commit trong backend/.env.example
  được stash, khôi phục và giữ ngoài commit; mọi dòng cũ còn nguyên theo thứ tự,
  cộng thêm biến mới của main. Giữ stash dự phòng, không sửa .env thật.
- Admin không đổi so với lần đạt 22 tests/build ngày 22/10, không chạy lại.
  Chưa kiểm thiết bị/dịch vụ thật, không build native lại; không seed dữ liệu,
  không push và không merge ngược vào main. Nợ audit trước đó vẫn còn hiệu lực.

## Hợp nhất main ngày 22/10/2026

Tiến độ `[####] 4/4`: dự phòng, hợp nhất, xử lý xung đột và kiểm tự động xong.
Backend 385/385, mobile 262/262, admin 22/22 (tổng 669); lint/typecheck tương
ứng, backend format và admin build đạt. Chưa nghiệm thu điện thoại hoặc
AI/SMTP/Atlas thật trong lần này; backend test dùng DB tạm/provider mock.
Không export/build native lại ở đợt này; không đổi native dependency.

- Nhánh làm việc: `feature/offline-translation-20261012`; nhận main `d5f0535`
  (PR #52, #53). Mốc dự phòng: `backup/offline-before-main-20261022-ca9f7f8`.
- Nhận mở chat AI mặc định, luật hải quan Úc và cache xác minh nguồn từ main;
  giữ dịch offline tích hợp, logo và luồng auth cục bộ.
- Xung đột hai tài liệu được giữ nội dung cả hai phía. Kiểm thử AuLawsRagPanel
  giữ helper chờ trong act và cleanup của nhánh; nhận timeout 2000 ms từ main.
- `backend/.env.example` chưa commit đã cất stash trước merge, khôi phục đúng
  từng byte bản người dùng và vẫn ngoài commit; giữ stash dự phòng, không xóa.
- Không thay .env thật, không seed/ghi DB thật, không push hoặc merge vào main.

## Kiểm tra sau merge main 4f54f16 — 21/10/2026

- [v] Có backup `backup/offline-before-main-20261021-90fdaae` trước merge.
- [v] Hợp nhất tài liệu xung đột bằng cách giữ cả hai phía; code dịch/auth/logo
  không khác mốc 90fdaae. Nhận nguyên cập nhật AI/bản đồ và hợp đồng API từ main.
- [v] Backend lint, format và 384 tests đạt. Lần đầu sandbox chặn cổng MongoDB
  test (EPERM); chạy lại có quyền mở cổng đạt, dùng DB tạm và provider mock.
- [v] Mobile typecheck/lint và 262 tests đạt; admin lint/typecheck, 22 tests và
  production build đạt sau sửa đồng bộ kiểm thử AuLawsRagPanel.
- [v] Export Hermes Android/iOS đạt. Lệnh export all đầu tiên không chạy vì
  workspace chưa cài react-native-web; chuyển đúng hai nền tảng mobile,
  không thêm dependency web ngoài phạm vi. Không phải build APK/IPA.
- [ ] Chưa chạy lại hành trình trên thiết bị thật hoặc dịch vụ Atlas/AI/SMTP/
  geocode thật. Kết quả tự động không bảo đảm các dịch vụ ngoài luôn sẵn sàng.
- [ ] Cảnh báo Expo đối chiếu dependency offline và NO_COLOR/FORCE_COLOR của
  môi trường còn; không chặn export. Các cảnh báo audit ở mục trước chưa đổi.

## Bộ offline tích hợp / logo / mật khẩu — 21/10/2026

- [v] Mobile 244/244 tests (56 suites); typecheck/lint đạt. Bao gồm cài mới không
  native module, tra từ hai chiều, phủ định, đoạn dài đủ câu, từ chối đoạn có câu
  lạ/số, hủy, không gọi online, engine/ghi công đúng, chọn/tìm câu và OTP submit.
- [v] Backend 296/296; lint/format đạt. Admin 18/18; lint/typecheck/build đạt.
  Chạy lại backend/admin sau cập nhật follow-redirects và Vite.
- [v] Expo install --check khớp dependency map cục bộ SDK 57; môi trường chặn
  networking nên chưa đối chiếu endpoint versions online (CLI cảnh báo giới hạn này).
- [v] Export bundle Hermes Android/iOS thành công; logo.jpg có trong asset list.
  Export không thay thế build APK/IPA, cài mới hoặc chạy airplane-mode trên máy thật.
- [v] Quan sát logo mới trên trang chủ BlueStacks. Chưa quan sát màn dịch vì
  thao tác công cụ không chuyển khỏi trang chủ; không sửa navigation dựa trên suy đoán.
- [!] Cần nghiệm thu Samsung/iOS: cài mới không model, máy bay, tra hộ chiếu và câu
  phủ định, câu ngoài bộ, đảo chiều, lưu/mở lại, text lớn/keyboard, nghe TTS/thu micro.
  Câu và nghĩa cộng đồng cần reviewer ngôn ngữ; test không chứng minh mọi bản dịch đúng.
- [!] OTP thật không gửi/thay mật khẩu trong đợt này. Unit tests xác nhận sai mật
  khẩu chỉ báo khi submit, không gọi reset/logout; đúng mới đi tiếp luồng hiện có.
- [!] Audit còn mobile 59 và backend dev 3; admin và backend production 0.
  Giới hạn model/native được ghi rõ trong TRANSLATION; không hứa dịch mọi câu
  tự do chỉ bằng từ điển. Không push.

## Khôi phục bố cục auth trước căn giữa — 20/10/2026

Theo yêu cầu mới, khôi phục JSX bố cục login/register/forgot-password từ
`ded3785` (trước lần căn giữa đầu tiên). Nội dung xếp từ trên xuống trong
ScrollView, không chia ba vùng hoặc căn giữa dọc. Xóa AuthScreen không còn dùng.
Giữ nguyên handlers/state/API hiện tại; giữ luồng OTP, ràng buộc email tài khoản,
quy tắc mật khẩu và chỉ logout sau khi đổi thành công. Giữ khoảng cách 16 giữa
nút OTP và Quay lại Cài đặt, sửa chống co nút và header tự xuống dòng.

Mobile lint/typecheck và 237/237 tests đạt. Đã quan sát login BlueStacks trở về
bố cục cũ; chưa nghiệm thu register/forgot và bàn phím trên điện thoại ở đợt này.
Không đổi backend/dữ liệu, không push; giữ backend/.env.example ngoài commit.
Yêu cầu bố cục này thay thế phương án ba vùng ở mục lịch sử bên dưới.

## Auth chia ba vùng — 20/10/2026

- Đạt: mobile typecheck, lint, 237 tests / 55 suites; diff không lỗi whitespace.
- Đã quan sát login BlueStacks: tiêu đề đầu trang, ô nhập giữa, hành động cuối.
- Chờ: kiểm tra đăng ký dài, các bước OTP và bàn phím trên máy thật;
  công cụ click BlueStacks báo noWindowsAvailable nên chưa xác nhận trực quan.
- Chưa hoàn tất logo chính thức: cần tệp PNG/JPG có thể truy cập để sao chép
  nguyên bản vào assets và nối component Logo dùng chung.
- Không sửa API/backend, không gửi OTP thật, không push Git.

## Form auth giữa dọc, đủ rộng — 20/10/2026

Đã xem screenshot BlueStacks: login nằm giữa, rộng theo màn và nút không co.
Register/forgot dùng AuthScreen chung; chưa xem trực quan do công cụ chuyển màn
báo noWindowsAvailable. Cần thử thêm màn ngắn, bàn phím và chữ lớn trên thiết bị.
Không thay luồng auth hoặc hợp đồng backend.

Kiểm tra đợt này: mobile 237/237, backend 296/296, admin 18/18 (551 tổng).
Lint/typecheck tương ứng, format backend và admin build đạt.

## Auth phủ chiều rộng — 20/10/2026

- Đã quan sát BlueStacks: màn login hết khung 480, bỏ khoảng trắng trên quá lớn,
  nút chính/phụ có chiều cao đầy đủ. Shared layout áp dụng register/forgot-password.
- Mobile 237/237 tests, lint/typecheck, git diff --check đạt.
- Chưa xác nhận trực quan register/forgot trên máy thật, keyboard Samsung/iOS.
  Backend không đổi; kết quả rà toàn bộ ở đợt trước vẫn là lịch sử, không chạy lại.

## Bố cục auth — 20/10/2026

- Gửi OTP và Quay lại Cài đặt cách nhau 16 px; giữ phiên/auth như bản trước.
- Ba form auth căn giữa, chiều rộng tối đa 480, không đặt chiều cao cố định;
  nội dung vượt màn hình vẫn cuộn. Header/footer cho xuống dòng khi thiếu ngang.
- Chưa kiểm hình ảnh trực tiếp trên Samsung/iOS; cần nghiệm thu keyboard và chữ
  lớn. Không thay backend hoặc dữ liệu thật; không tuyên bố toàn máy hết lỗi.

Kiểm tra: mobile 237/237, backend 296/296, admin 18/18 (551 tổng);
lint/typecheck tương ứng, backend format và admin build đạt.

## OTP giữ phiên trước khi đổi mật khẩu — 20/10/2026

- Đã đăng nhập: không có link “Nhớ ra mật khẩu rồi / Đăng nhập” ở email/OTP/password;
  email không sửa được, quay lại Cài đặt không logout.
- Mật khẩu hiển thị đủ yêu cầu khớp backend (ký tự đặc biệt tùy chọn), xác nhận
  không khớp bị chặn. Reset lỗi giữ phiên, thành công mới logout.
- Hồi quy guest vẫn gửi email > OTP > password > done như cũ.
- Chưa thao tác điện thoại thật hoặc xác nhận thư đến Inbox; không coi test tự động
  là nghiệm thu giao diện thực hay chứng nhận toàn hệ điều hành không lỗi.

Kiểm tra: mobile 237/237, backend 296/296, admin 18/18 (tổng 551);
lint/typecheck tương ứng, format backend và admin build đạt. Hồi quy màn OTP
chạy lại 2/2 sau chỉnh lỗi xác nhận/khóa nút quay lại, đạt.

## Auth/OTP — 20/10/2026 (nghiệm thu một phần)

- SMTP verify thật đạt, không gửi email. Không coi verify là xác nhận Inbox.
- Hồi quy mới: cùng 502 cho tài khoản có/không tồn tại khi SMTP hỏng; khôi phục
  dịch vụ > OTP > reset > đăng nhập mật khẩu mới; không dùng lại reset token.
- Đổi trực tiếp không cần email, hủy reset đang chờ; refresh-token regression cũ giữ nguyên.
- Mobile: lỗi SMTP không chuyển sang bước OTP; retry thành công, xác thực, reset,
  xóa phiên. Bổ sung nhãn accessibility cho các ô nhập.
- Chưa nghiệm thu Inbox/Spam của người dùng hoặc thao tác thiết bị thật. Không
  chứng nhận hết mọi lỗi máy; chỉ kiểm backend/mobile/admin và SMTP của dự án.

Kiểm tra cuối: backend 296/296, mobile 236/236, admin 18/18 — tổng 550.
Lint/format backend, lint/typecheck mobile/admin và admin build đạt.

## Khôi phục map e6361c3 — 17/10/2026 (thay thế nghiệm thu map trước)

- Bản đồ quay lại nền ngay sau merge; giữ micro độc lập. Không còn Leaflet vendor.
- Hồi quy GPS Việt Nam + quốc gia KR: truy vấn embassy theo KR, có lỗi upstream
  thì thử lại được, có dữ liệu thì canh ghim và hiển thị nhãn chưa xác minh.
- Mobile 230/230, backend 283/283, admin 18/18; lint/typecheck tương ứng, backend
  format và admin build đạt. Không đổi backend/contracts hoặc dữ liệu thật.
- Service thật OSM gọi embassy/KR hai lần đều timeout; chưa thể nghiệm thu tính
  năng tìm đại sứ quán thật. Cần thử lại BlueStacks/Samsung khi upstream phản hồi.
- Không coi yêu cầu “mọi thứ ổn” là đã đạt toàn bộ; còn nghiệm thu nguồn/thiết bị.

Android Hermes export bản khôi phục đạt; chưa coi là nghiệm thu UI trên máy thật.

## Bản đồ/micro điện thoại — 17/10/2026 (xong một phần)

- Mobile lint/typecheck và 231/231 tests đạt, gồm hồi quy WebView lỗi/ready,
  tile chưa tải, chọn runtime và giữ phiên qua hộp thoại micro.
- Backend lint/format, 283/283 tests và admin lint/typecheck/build, 18/18 đạt.
  Backend dùng mock providers/dữ liệu tạm, không gọi đây là nghiệm thu Atlas thật.
- Android Hermes export đạt. Tổng kiểm tự động 532/532; không có thay đổi native.
- Samsung A22 4G chạy Expo Go: người dùng xác nhận GPS/TTS Anh hoạt động;
  bản đồ sau sửa chưa thử trên máy thật. ADB hiện chỉ thấy emulator-5554.
- Micro tích hợp không thể chạy trong Expo Go vì thiếu module native; đã thêm
  đường nhập qua đọc chính tả bàn phím và thông báo đúng giới hạn. Chưa nghiệm thu
  nhận giọng/loa sau micro trong bản native Samsung; iOS vẫn chưa nghiệm thu.
- Quy trình thử và điều kiện còn thiếu: [TRANSLATION.md](TRANSLATION.md) mục 4.

## Tích hợp main 4aacd61 vào offline — 15/10/2026

- Backend bản hợp nhất: lint/format và 283/283 tests đạt với mock providers.
- Mobile bản hợp nhất: lint/typecheck và 227/227 tests đạt; có hồi quy màn dịch
  với nội dung dài, engine offline, ghi công Google, nút phát âm/sao chép UI mới.
- Admin không đổi: 18/18 tests, lint/typecheck/build đạt trong lượt kiểm tra này.
- Hai xung đột Git đã giải quyết bằng kết hợp chức năng/giao diện và giữ cả lịch sử.
- Android release QA xác nhận lại 16/10/2026: BUILD SUCCESSFUL (717 tasks).
  Chưa nghiệm thu lại UI trên thiết bị sau merge; micro/loa thật và iOS vẫn còn mở.
- Các lượt backend trước merge từng lỗi 403/ECONNRESET không ổn định; chưa có
  bằng chứng nguyên nhân đã được sửa. Không làm yếu assertion hoặc thêm retry che lỗi.


## Dịch offline — 13/10/2026 (nghiệm thu một phần)

| Tiêu chí | Bằng chứng / trạng thái |
|---|---|
| Dịch văn bản offline, tải/xóa gói có chủ động | Android release: tải gói rồi tắt Wi-Fi/data, dịch “Tôi cần giúp đỡ” thành “I need help” đạt; iOS chưa E2E |
| Từ/câu dài 5.000 ký tự, không tự fallback cloud | Kiểm thử Unicode/thiếu model/hủy đạt; Android offline đoạn Anh–Việt 642 ký tự đạt |
| Micro on-device, từ chối nếu không hỗ trợ | Hook tests đạt; Android quyền và timeout 30 giây đạt; cần thu tiếng thật trên Android/iOS |
| TTS chia đoạn, đúng locale, bỏ callback cũ | Hook tests đạt; cần nghe loa thật, đặc biệt sau micro trên iOS |
| Hồi quy ba workspace | Backend 269/269; admin 18/18 và build; mobile 219/219 (51 suites) |
| Native | Android debug và release build/cài emulator đạt, SOS > dịch khách đạt; tải model đạt sau sửa DNS và dịch Việt–Anh offline đạt. iOS mới parse Swift/autolink, chưa compile |
| Dữ liệu và Git | Không migration/API backend mới; chưa push hoặc merge |

Kế hoạch và kết quả tiếp tục: [TRANSLATION.md](TRANSLATION.md) mục 3.
Không coi các tiêu chí cần thiết bị thật là đã nghiệm thu.


## Nghiệm thu cũ (29/09-07/10/2026)

Các bảng nghiệm thu giọng nói, Maps, cẩm nang/dịch/lịch trình và tính năng 29/09 đã được thay bằng các mục mới hơn ở trên; bản cũ còn trong lịch sử git.

## Tiêu chí hệ thống

Khung bảng lấy từ `docs/03_Contracts_v2.md` mục 14. Mỗi dòng ghi **bằng
chứng cụ thể đang có trong repo** (tên file test/tài liệu thật, không phải
mô tả chung chung) và **trạng thái**: `Đạt` (có bằng chứng tự động hoặc đã
kiểm chứng), `Đạt một phần` (có bằng chứng nhưng còn thiếu một khía cạnh),
`Cần người xác nhận` (không thể tự động hoá, cần thao tác thủ công trên
thiết bị/dịch vụ thật).

| AC | Nội dung | Trạng thái | Bằng chứng |
|---|---|---|---|
| AC-01 | User thường không vào được route admin | **Đạt** | `backend/test/rbac.sweep.test.js` — đọc `router.stack` của `admin.routes.js` tự động (không hardcode danh sách), assert 401/403 cho toàn bộ ~47 route hiện có. Route mới thêm sau này tự động được quét. |
| AC-02 | Đổi quốc gia làm đổi đúng handbook/search/AI/SOS | **Đạt một phần** | Mọi query công khai (`legal/articles`, `legal/search`, `support-locations`, `incidents`, `alerts/applicable`) đều lọc theo `countryCode`/`country` — có test riêng cho từng endpoint (`publicContent.test.js`, `supportLocation.test.js`, `incident.test.js`, `alerts.test.js`). Chưa có 1 kịch bản thủ công "đổi quốc gia trên app thật rồi xác nhận cả 4 khu vực đổi theo" — đưa vào `docs/DEMO_SCRIPT.md` bước 1-2 làm checklist thủ công. |
| AC-03 | Mỗi bài có title, summary, country, topic, source, updated/status | **Đạt** | Schema `LegalArticle` bắt buộc các field này (`backend/src/models/LegalArticle.js`); `articleCreateSchema`/`articleUpdateSchema` validate ở tầng Zod; contract fixture `contracts/fixtures/admin.legalArticle.json` + `public.legalArticle.json` đối chiếu 2 phía (backend `contracts.test.js`, mobile `adapters.test.ts`). |
| AC-04 | AI có source references; retrieval yếu thì không khẳng định | **Đạt** | `backend/test/golden.test.js` — 25 ca (15 `must_answer` bắt buộc có citation hợp lệ, 6 `must_refuse` bắt buộc trả `INSUFFICIENT_EVIDENCE`, 4 `country_isolation`), chạy với `LLM_PROVIDER=mock` nên tất định, không tốn API. Hậu kiểm bằng code ở `rag/guard.js` (`backend/test/rag.guard.test.js`) chặn cả marker giả lẫn số liệu không nguồn. |
| AC-05 | Admin cập nhật + re-index → AI dùng dữ liệu mới, không train lại | **Đạt một phần** | `backend/test/admin.test.js` xác nhận publish bài luật tự động `enqueue reindex_article` job; `backend/test/hardening.test.js` xác nhận `reindexArticleHandler` bỏ qua bài không published, không xoá nhầm chunk của bài đã publish lại. Retrieval luôn `$lookup` xác minh `status`/`isCurrent` thật từ `legal_articles` (không tin field copy trên chunk) — xem `rag/retrieval.js`. Chưa có 1 test end-to-end nối liền "publish → reindex → hỏi AI → thấy nội dung mới" trong CÙNG MỘT bài kiểm thử; luồng này nằm trong `docs/DEMO_SCRIPT.md` bước 8 làm minh chứng thủ công. |
| AC-06 | Map dùng vị trí user, gọi/chỉ đường hoạt động | **Đạt một phần** | `backend/test/supportLocation.test.js` dùng toạ độ thật (Đại sứ quán Seoul, Busan cách ~320km) xác nhận `$geoNear` không đảo `[lat,lng]`. `tel:`/deep link chỉ đường (`openDirections()` ở `mobile/src/app/sos/map.tsx`) là API hệ điều hành, không kiểm được bằng unit test — **cần người bấm thử trên điện thoại thật** (gọi điện thật sẽ tính phí/kết nối thật, không tự động hoá được một cách an toàn). |
| AC-07 | SOS ≤2 thao tác từ màn hình chính | **Đạt** | Nút SOS đỏ cố định ở `AppShell` (mọi màn hình) → 1 chạm mở SOS Hub → 1 chạm nữa gọi khẩn cấp hoặc mở bản đồ = tối đa 2 thao tác. Xác nhận lại bằng thao tác thật trong `docs/DEMO_SCRIPT.md` bước 6. |
| AC-08 | Incident workflow đủ bước, checklist, liên hệ | **Đạt** | `backend/test/incident.test.js` (tạo/chuẩn hoá `order`, gộp toàn cục+quốc gia, loại bỏ draft, tiến độ rieng tung user, loại bỏ `step.order` không còn tồn tại). Mobile: `mobile/src/app/incidents/[slug].tsx` render checklist + CTA (`map`/`call`/`ai`/`link`) theo đúng cấu trúc `steps[]`. |
| AC-09 | API validate input; rate limit chặn; CORS/Helmet cấu hình | **Đạt** | Zod validate mọi body/query (`validateBody`/`validateQuery`, trả `VALIDATION_ERROR` — test rải khắp `test/*.test.js`). Rate limit riêng từng nhóm tốn tiền/spam (`chatRateLimit`, `translateRateLimit`, `feedbackRateLimit`, `loginRateLimit`, `registerRateLimit`, `resetRateLimit` — `middleware/rateLimit.middleware.js`). `helmet()` + `cors({origin: env.CORS_ORIGINS})` cấu hình ở `app.js`, origin lấy từ env (không hardcode) — production phải set `CORS_ORIGINS` thật (xem `docs/DEPLOY.md`). |
| AC-10 | Admin CRUD đủ 6+ loại dữ liệu + xem feedback | **Đạt** | Admin Portal có trang CRUD đầy đủ cho: Quốc gia, Chủ đề, Bài luật (máy trạng thái), Điểm hỗ trợ (+ bulk CSV), Hướng dẫn xử lý sự cố (A07), Câu dịch sẵn, Cảnh báo vị trí (A06), cùng Feedback Queue (A08), RAG Index (A04), Dashboard (A01), Nhật ký (audit). `admin/npm run build` xanh, 9/9 test xanh. Chưa có ảnh chụp màn hình thật (cần mở trình duyệt thật) — không phải giới hạn kỹ thuật, chỉ là bước bàn giao thủ công. |
| AC-11 | Responsive mobile, không tràn ngang | **Cần người xác nhận** | Toàn bộ UI dùng NativeWind (Tailwind responsive theo `%`/`flex`), không có kích thước cố định lớn hơn màn hình nhỏ nhất được biết trong code. Chưa kiểm được trên iPhone SE 375px hay máy Android thật vì môi trường này không có simulator/thiết bị kết nối — cần người chạy `npx expo start` và mở trên thiết bị/simulator thật. |
| AC-12 | Deploy public, tách biệt, secrets ngoài source | **Cần người xác nhận** | Config đã viết đầy đủ: `backend/render.yaml`, `mobile/eas.json`, `.github/workflows/keepalive.yml`, `docs/DEPLOY.md` (hướng dẫn từng bước). `grep` toàn repo không thấy secret hard-code (xác nhận trong phiên rà soát B9). **Chưa thực sự deploy** — cần người có tài khoản Render/Vercel/EAS thật thực hiện theo `docs/DEPLOY.md`, sau đó xác nhận `/api/health` trả `db:"connected"` trên domain public. |

## Tổng kết

- **Đạt hoàn toàn (tự động hoá được và đã chạy xanh):** AC-01, AC-03, AC-04, AC-07, AC-08, AC-09, AC-10 — 7/12.
- **Đạt một phần (có bằng chứng code/test, còn thiếu 1 khía cạnh thủ công):** AC-02, AC-05, AC-06 — 3/12.
- **Cần người xác nhận (ngoài khả năng của phiên làm việc này):** AC-11 (thiết bị thật), AC-12 (tài khoản dịch vụ thật) — 2/12.

Không có mục nào được đánh dấu "Đạt" mà không có bằng chứng cụ thể kèm theo.
