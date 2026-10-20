# TIEN DO BE.TRAVEL

## OTP khi đã đăng nhập — 20/10/2026 (bổ sung)

Tiến độ `[###-] 3/4`: code và hồi quy xong; cần thử giao diện trên điện thoại thật.

- Màn khôi phục nhận biết user: không hiện “Nhớ ra mật khẩu rồi / Đăng nhập”
  khi đã đăng nhập; email gắn tài khoản hiện tại và không cho sửa sang tài khoản khác.
- Quay lại Cài đặt/back trước khi hoàn tất giữ phiên; không logout khi API lỗi.
  Chỉ reset thành công mới logout và yêu cầu đăng nhập lại. Back ở màn thành công
  cũng về đăng nhập; khóa nút quay lại lúc đang xử lý.
- Hiện yêu cầu ngay bước email và tạo mật khẩu: 8–128 ký tự, ít nhất một A–Z,
  một a–z và một số; ký tự đặc biệt không bắt buộc theo backend hiện có.
  Mật khẩu mới phải khác cũ; xác nhận phải trùng, lỗi hiển thị tại ô nhập.
- Dùng cùng PASSWORD_REQUIREMENTS ở đổi trực tiếp/OTP. Không thay chính sách
  backend hoặc contract, không gửi thư thật, không sửa dữ liệu Atlas.
- Test thêm: user đăng nhập không thấy link login/sửa email; quay lại giữ auth;
  gửi đúng email, xác nhận lệch bị chặn, API lỗi không logout, thành công mới logout.
- Giữ thay đổi backend/.env.example của người dùng ở trạng thái chưa commit.
  Không push Git. Nghiệm thu nhận thư thật ở mục Auth trước vẫn còn mở.

Kiểm tra: mobile 237/237, backend 296/296, admin 18/18 (tổng 551);
lint/typecheck tương ứng, format backend và admin build đạt. Hồi quy màn OTP
chạy lại 2/2 sau chỉnh lỗi xác nhận/khóa nút quay lại, đạt.

## Auth: đổi mật khẩu và email OTP — 20/10/2026

Tiến độ `[###-] 3/4` — code, kiểm tự động và tài liệu hoàn tất; còn xác nhận
nhận email thật/điện thoại người dùng. Không push, không sửa dữ liệu Atlas hay .env.

- Đã xác minh SMTP thực từ máy: kết nối/xác thực OK (không gửi thư). Vì vậy chưa
  xác định nguyên nhân duy nhất email của người dùng không nhận OTP; chưa có log
  người nhận hoặc xác nhận app đang gọi đúng backend này.
- Đổi trực tiếp dùng mật khẩu cũ, KHÔNG OTP; UI giải thích và có nút khôi phục
  qua email. Thành công hủy refresh token và yêu cầu OTP/reset còn chờ.
- Khôi phục: kiểm tra SMTP trước lookup tài khoản; lỗi dịch vụ trả cùng 502 cho
  mọi email. Giữ response chống dò tài khoản; không hứa thư đã đến hộp thư.
  Validate email; lỗi gửi chỉ xóa đúng request, log không chứa email/OTP.
- SMTP dùng env chuẩn hóa, TLS/STARTTLS, timeout; thêm `backend npm run email:check`.
  SMTP_DISABLED chỉ bỏ gửi trong test. UI thêm sửa email, chờ gửi lại 30s,
  xóa token/password và đăng xuất sau reset; TextField có nhãn accessibility.
- Kiểm thử HTTP với DB tạm/transport tại chỗ đi đủ forgot > OTP > reset > login;
  từ chối dùng lại token và đổi trực tiếp vẫn chạy khi SMTP lỗi. Không gửi thư ra ngoài.
- Bước người dùng: restart backend/Metro, thử Cài đặt với mật khẩu cũ; hoặc thử
  Quên mật khẩu với email đăng ký, xem Spam. Chẩn đoán phải chạy trên đúng API host.
  Xem FEATURE_GUIDES mục Auth và ACCEPTANCE. Các vấn đề OSM/native cũ vẫn mở.

Kiểm tra cuối: backend 296/296, mobile 236/236, admin 18/18 — tổng 550.
Lint/format backend, lint/typecheck mobile/admin và admin build đạt.

## Giao diện Be.Travel AI theo mẫu — 19/10/2026 (cập nhật mới nhất)

Theo yêu cầu người dùng, thiết kế lại màn chat AI theo mẫu (chỉ giao diện, không đổi contract `ChatAnswer`).

- Header (avatar, "Đang trực tuyến · Luật <quốc gia>", nút cuộc trò chuyện mới và lịch sử), màn chào với 4 thẻ nhanh,
  câu trả lời có bước đánh số và chữ đậm, ô nhập hình viên thuốc, bọc trong `AppShell` (thanh tab, nhãn "Trợ lý AI").
- Thẻ "Thông tin liên hệ" lấy từ hồ sơ Đại sứ quán của quốc gia (do Admin quản lý), KHÔNG do AI sinh; ẩn khi thiếu dữ liệu.
- Thẻ "Bệnh viện" và "Đại sứ quán" mở bản đồ SOS (dữ liệu địa điểm đã xác minh); thẻ "Luật" và "Khẩn cấp" hỏi AI.
- Chưa làm: nút mic trong chat (nhập giọng nói chỉ có ở màn Dịch theo phạm vi MVP), màn khách chưa đăng nhập chưa đổi theo mẫu.
- Màn chat vẫn bị khóa bằng `EXPO_PUBLIC_AI_CHAT_ENABLED` (mặc định false); bật trong `mobile/.env` để xem.

## Luật liên bang Úc — 18/10/2026

Theo yêu cầu người dùng (ngoài lộ trình B1-B9). Tra cứu luật Commonwealth của Úc từ Federal Register of
Legislation (API công khai, không cần key), thêm quốc gia Úc (AU), phân loại 5 mục, tóm lược và dịch tiếng Việt.

- Backend `/api/laws/australia/*` (danh sách, tìm kiếm, chi tiết, phiên bản, nội dung, 5 mục, tóm lược, dịch).
  Dữ liệu chỉ đọc, KHÔNG ghi vào `legal_articles`, KHÔNG vào RAG, `verifiedByBeTravel:false`. Contract: mục 24.
- Phân loại 5 mục là danh sách do Be.Travel tuyển chọn thủ công (31 mã đã đối chiếu với nguồn), không phải đầy đủ.
- Tóm lược có hai tầng: tiêu đề dài + dàn ý Chương/Phần lấy nguyên văn; bản tiếng Việt do AI diễn giải, hậu kiểm bằng code.
- Dịch theo yêu cầu (cụm 25 đoạn, cache DB), chỉ 31 luật đã tuyển chọn; hậu kiểm số liệu từng đoạn; ghi rõ dịch máy.
- Quốc gia Úc: trạng thái `active`, số khẩn cấp 000, để trống Đại sứ quán và số hàng hải vì chưa có nguồn.

### Quyết định phát sinh (Luật Úc)

- Quyết định 1: dịch/tóm tắt luật Úc dùng `TRANSLATION_MODEL` (model dịch), không dùng `LLM_MODEL` của chat, vì gói
  miễn phí Gemini chỉ cho 20 lượt/ngày với model chat và đã từng cạn trong lúc chạy thử.
- Quyết định 2: tóm tắt từng Phần mặc định KHÔNG tự sinh (`AU_LAW_DEEP_SUMMARY_AUTOGEN=false`); sinh chủ động bằng
  `npm run summarize-au-laws`. Gặp 429 theo phút thì chờ rồi thử lại, hạn mức ngày thì báo lỗi ngay.
- Quyết định 3: nguồn không hỗ trợ lọc phủ định nên nhóm luật thuế "A New Tax System" bị loại bằng code sau khi lấy trang.
- Quyết định 4 (19/10/2026): tên luật có tiếng Việt hai lớp. 31 luật tuyển chọn có tên viết sẵn (`core/auLawNames.js`,
  bản dịch tham khảo, chưa có người chuyên ngành luật rà soát); luật khác được AI dịch tên theo lô và cache DB
  (`AU_LAW_TITLE_TRANSLATION`, mặc định bật; quá 8 giây hoặc lỗi thì hiện tên tiếng Anh). Bản dịch bị loại nếu thêm hoặc bớt số.
  Tên chính thức tiếng Anh luôn hiển thị kèm. Tìm kiếm vẫn theo tên tiếng Anh.

### Đang vướng (Luật Úc)

- Tóm tắt từng Phần của Migration Act mới có 5/37 phần (bị 429 ngắt). Cần chạy lại khi hạn mức hồi:
  `npm run summarize-au-laws -- C1958A00062`.
- Dịch toàn bộ 31 luật (~18,8 triệu ký tự) chưa làm; cần API key trả phí.
- Chưa kiểm tra giao diện trên điện thoại thật; liên kết `legislation.gov.au/<id>/latest/text` chưa kiểm chứng từ phía máy chủ.

### Nợ kỹ thuật (Luật Úc)

- Cache dịch lưu cả cụm có đoạn `textVi:null`; các đoạn đó chỉ dịch lại khi cache hết hạn hoặc bị xóa.
- Admin và mobile chưa có test màn hình riêng cho luật Úc (chỉ test client API và logic thuần).

## Khôi phục bản đồ sau merge — 17/10/2026

Tiến độ `[###-] 3/4`, xong một phần. Theo yêu cầu người dùng, lấy bản đồ ở
merge commit `e6361c3` làm nền; hoàn tác phần map của `7c2c6ad` và các thử nghiệm
map chưa commit. Giữ các sửa micro độc lập. Không reset lịch sử, không push.

- Khôi phục OsmWebMap, HTML/CDN Leaflet, chọn runtime và cấu hình như mốc merge.
  Xóa vendor/test chỉ phục vụ thay đổi map đã hoàn tác. Các mục đóng gói Leaflet
  trong báo cáo trước bên dưới không còn mô tả bản hiện hành.
- Sửa lỗi tìm đại sứ quán: luôn truy vấn theo nước được chọn (KR), kể cả khi GPS
  ở Việt Nam hoặc danh sách có tâm khác. Cache key theo nước; camera canh kết quả.
- Khi upstream lỗi, báo rõ chưa có kết quả và cho thử lại; không gọi lỗi mạng là
  không có đại sứ quán. Nguồn ngoài vẫn gắn chưa xác minh, không chèn dữ liệu giả.
- Mobile lint/typecheck và 230/230 tests (53 suites); backend lint/format và
  283/283 tests; admin lint/typecheck/build và 18/18 tests đạt. Tổng 531.
- Hai lần gọi thật service OSM tìm embassy tại KR đều timeout; chưa nghiệm thu
  kết quả thực trên BlueStacks/Samsung. Bộ test dùng mock không thay thế bước này.
- Còn mở: nguồn Overpass phản hồi, thử chọn Hàn Quốc > Đại sứ quán > Gợi ý thêm;
  không cần GPS ở Hàn Quốc. Không thay API/schema/Atlas; không rà/chỉnh toàn macOS.

Android Hermes export bản khôi phục đạt; chưa coi là nghiệm thu UI trên máy thật.

## Bản đồ và micro Samsung A22 / Expo Go — 17/10/2026

Tiến độ `[###-] 3/4` — xong một phần: sửa code, kiểm tự động và tài liệu;
chờ nghiệm thu trên Samsung thật. Không push, không merge vào main.

- Bản đồ: đóng gói Leaflet thay vì tải CDN, cấu hình WebView static HTML,
  chỉ báo sẵn sàng sau khi tải ô; lỗi hiển thị rõ và có thử lại/danh sách.
- Expo Go cả hai nền tảng và Android native thiếu key tự dùng OSM; vẫn tôn trọng
  cấu hình ép native. Ô bản đồ cần Internet; chưa xác định nguyên nhân duy nhất
  trên Samsung vì thiết bị chưa kết nối để lấy log.
- Expo Go không chứa module nhận giọng. Nút micro hướng dẫn đọc chính tả bàn phím
  và focus ô nhập; nhận giọng trong app cần bản Be.Travel native. Sửa giữ phiên
  qua hộp thoại giải thích/quyền, chặn bắt đầu thu khi app ở background.
- Kiểm tra đạt: mobile lint/typecheck, 231/231 tests (54 suites); backend
  lint/format, 283/283 tests; admin lint/typecheck/build, 18/18 tests. Tổng 532.
  Android Hermes export đạt; không coi export là kiểm micro/map trên máy thật.
- Không đổi API/schema/backend hoặc dữ liệu Atlas. Cảnh báo phụ thuộc cũ và
  nghiệm thu native iOS vẫn mở; không chứng nhận toàn hệ điều hành hết lỗi.
- Bước tiếp: chạy Metro với --clear, thử bản đồ trên Samsung; kết nối USB và
  cài bản native để thử micro. Hướng dẫn: [TRANSLATION.md](TRANSLATION.md) mục 4.

## Đồng bộ main vào nhánh dịch offline — hoàn tất 16/10/2026

Nhánh làm việc `feature/offline-translation-20261012`; điểm trước merge `2d8e4b9`.
Bản dự phòng: `backup/offline-before-main-20261015`. Main lấy từ origin là
`4aacd61` (PR #38 giao diện/bản đồ/API địa điểm và PR #39 tài liệu Jira).
Chỉ merge main vào nhánh tính năng local, không merge ngược vào main, không push.

Tiến độ đồng bộ `[####] 4/4`: đã lấy main, xử lý xung đột, kiểm thử và build;
lưu bằng merge commit local trên nhánh tính năng, không push.

- Xung đột `docs/PROGRESS.md`: giữ cả lịch sử offline và lịch sử cập nhật main.
- Xung đột màn dịch: giữ giao diện mới, nút sao chép/phát âm/phiên âm của main;
  giữ giới hạn offline 5.000/online 500, bộ chọn ngôn ngữ, model, micro/TTS,
  ghi công Google, chia đoạn và hủy phiên cũ của nhánh offline.
- Lockfile hợp nhất giữ WebView/SerpApi của main và các bản vá Expo của nhánh.
  Đã cài lại dependencies bằng npm ci cho backend/mobile.
- Mobile lint/typecheck và 227/227 tests đạt, gồm hồi quy offline sau đổi UI.
  Admin không đổi so với bản vừa kiểm tra: 18/18, lint/typecheck/build đạt.
- Trước merge, backend có hai lần lỗi không ổn định (403 thay vì 400 ở trips;
  ECONNRESET ở qa.edge). Trips chạy riêng 10/10 đạt; chưa xác định nguyên nhân.
  Bản sau merge đạt backend 283/283 với mock providers; lint/format đạt.
- Android release QA bản hợp nhất build thành công, xác nhận lại 16/10: 717 tasks,
  43 giây. Có cả WebView bản đồ và module dịch offline. Không coi build là
  nghiệm thu lại toàn bộ giao diện, kết nối bản đồ thật hoặc micro/loa trên thiết bị.
- Fetch lại 16/10 xác nhận origin/main vẫn ở 4aacd61. Tổng kiểm tự động 528/528 đạt.
  Không còn file xung đột; commit offline 2d8e4b9 được giữ trong lịch sử.
- Nghiệm thu micro/loa thật và native iOS vẫn còn mở; không thay đổi dữ liệu Atlas,
  không đưa .env/khóa/artefact build vào commit.


## Dịch offline, micro và phát âm — cập nhật 13/10/2026

Nhánh local `feature/offline-translation-20261012`, từ `a3bc320`; không push/merge.
Tiến độ `[#####-] 5/6` — code/kiểm tự động/tài liệu xong; nghiệm thu thiết bị còn mở.

| Việc | Trạng thái |
|---|---|
| Docs/kiến trúc và hợp đồng | xong; giữ API online và dữ liệu lưu cũ |
| Engine offline Android/iOS | xong code ML Kit, tải/xóa gói chủ động, không fallback cloud |
| Từ/câu dài và giao diện | tối đa 5.000 ký tự, chọn ngôn ngữ không phụ thuộc server, khách mở từ SOS |
| Micro/TTS | on-device, chuẩn bị gói, TTS chia đoạn/lọc giọng cloud; chưa nghe/nói thật |
| Kiểm tra/build | backend 269/269; admin 18/18 + build; mobile 219/219 (51 suites), lint/typecheck đạt |
| Android thực tế | release APK build/cài/mở đạt; SOS > dịch khách, tải model và dịch Việt–Anh và đoạn Anh–Việt 642 ký tự khi tắt Wi-Fi/data đạt |
| Nghiệm thu còn thiếu | micro/loa trên điện thoại thật, native iOS |
| Tài liệu bàn giao | TRANSLATION, ACCEPTANCE, OPTIMIZATION_REPORT đã cập nhật |

Android release cần ép Node arm64 trong môi trường Rosetta này; đã build thành công.
iOS local chỉ có CommandLineTools, chưa đủ Xcode để compile. Expo Doctor 20/21 do
bản vá mới; audit mobile 61, backend 3, admin 0 còn ghi rõ trong tài liệu. Không
chứng nhận toàn macOS hoặc tuyên bố hết mọi lỗi. Không sửa Atlas/secret.
Xem [TRANSLATION.md](TRANSLATION.md) mục 3 để tiếp tục nghiệm thu.

## Bản đồ miễn phí OpenStreetMap — 13/10/2026

Người dùng đưa hướng dẫn `BeTravel_Free_Map_API_Guide.md` (React + Leaflet + Express CommonJS) và nhờ làm theo. Đã chuyển sang đúng ngăn xếp dự án (app Expo, backend ESM, envelope + Zod + rate limit), không dán nguyên.

| Việc | Trạng thái |
|---|---|
| Backend: nhà cung cấp `osm` (Overpass) cho `GET /api/support-locations/external`; `PLACES_PROVIDER=osm` miễn phí, không cần key | xong, chạy thật qua HTTP với Atlas và OSM thật (Seoul: tìm ra đại sứ quán Việt Nam; Busan: tìm ra trong 500 km) |
| Truy vấn: thẻ trước `around` sau, khớp chính xác, bán kính theo loại; thử lại 1 lần khi 429/502/503/504 | xong. Đo thực tế: truy vấn dạng hướng dẫn (around trước, regex) bị 504; dạng mới ~2 giây |
| Mobile: bản đồ OSM bằng Leaflet trong WebView (`OsmWebMap`, Expo Go Android tự bật), ẩn nút Vệ tinh; lớp gợi ý chạy cả khi chưa có GPS (quanh tâm bản đồ) | xong. Lần đầu dùng `UrlTile` trên MapView vẫn nền trống trên LDPlayer (Internet bình thường, ô mở được trong Chrome emulator) nên đổi sang WebView. Kiểm bằng Chrome thật: 12 ô tải, 3 ghim, thông điệp ready. CHƯA xem trên LDPlayer |
| Tìm đại sứ quán Việt Nam theo quốc gia, không cần toạ độ: `?country=KR&type=embassy` (OSM `country=VN` + `target=KR`). Lý do: bản đồ trống tâm vì dữ liệu quốc gia KR chưa có `embassy.lat/lng` và Admin chưa có ô nhập; emulator LDPlayer không có GPS. Màn bản đồ tự canh vào kết quả | xong, chạy thật: KR 3 điểm, JP 1 điểm |
| Env: `PLACES_OVERPASS_URL`, `PLACES_USER_AGENT`, `PLACES_TIMEOUT_MS` mặc định 20 giây; mobile `EXPO_PUBLIC_MAP_TILES`, `EXPO_PUBLIC_MAP_TILE_URL` | xong, đã vào cả hai `.env.example` |
| Hoàn nguyên `mobile/.env.example`: hai dòng khóa Google Maps bị dán URL SerpApi (sai định dạng, làm `app.config.js` báo lỗi nếu sao chép) | xong |

Cố ý KHÔNG làm từ hướng dẫn: trang web React/Leaflet riêng và endpoint `/geocode` (Nominatim): sản phẩm là app mobile, chưa có chỗ dùng geocode; thêm sẽ thành mã chết. Nominatim cũng giới hạn 1 yêu cầu/giây.

Kiểm tra: backend lint sạch, 283/283; mobile tsc + lint sạch, 220/220 (backend 283/283). Thêm gói `react-native-webview` 13.16.1 (qua `npx expo install`).
Cần người làm: khởi động lại backend (đang chạy bản cũ dùng `mock`), `backend/.env` đã thêm `PLACES_PROVIDER=osm`; tự mở màn bản đồ trên Expo Go để xem ô bản đồ. Điểm hỗ trợ ĐÃ XÁC MINH vẫn rỗng cho Hàn Quốc cho tới khi admin nhập.
Rủi ro: Overpass và ô OSM công cộng có chính sách sử dụng công bằng, không cam kết ổn định; dữ liệu OSM có thể sai (đã gặp "đại sứ quán cũ"). Ra sản phẩm thật cần máy chủ Overpass và ô riêng.

## Địa điểm Google Maps qua SerpApi (lớp bổ sung, chưa xác minh) — 12/10/2026

Người dùng yêu cầu thêm API SerpApi (engine google_maps) cho bản đồ. Mục 4.4 CLAUDE.md loại Google Places khỏi MVP, nên đã hỏi lại; người dùng chọn: endpoint riêng gắn nhãn chưa xác minh, key qua biến môi trường.

| Việc | Trạng thái |
|---|---|
| Backend `GET /api/support-locations/external?lat&lng&type` | xong: cache theo loại + ô ~1 km, trần gọi/ngày, rate limit 30/15 phút/IP, timeout; luôn `verified:false`, `source:"google_maps"`; không ghi DB |
| Contract (README mục 14b + fixture `public.externalPlace.json`) + test contract | xong |
| Env: `PLACES_PROVIDER` (mặc định `mock`), `SERPAPI_KEY`, `PLACES_*`; thiếu key khi chọn `serpapi` thì fail fast | xong, đã cập nhật `.env.example` và DEPLOY.md |
| Mobile: nút "Google Maps (chưa xác minh)" trên bản đồ, ghim xám, danh sách riêng, nhãn ở chi tiết | xong, mặc định tắt, chỉ bật được khi có GPS và đang lọc một loại |
| Tách `haversineMeters` ra `utils/geo.js` dùng chung với geoAlert | xong |

Kiểm tra: backend lint sạch, 277/277 (thêm 8 test); mobile tsc + lint sạch, 216/216.

Cần người làm: điền `SERPAPI_KEY` vào `backend/.env` và đặt `PLACES_PROVIDER=serpapi` để chạy thật. CHƯA gọi SerpApi thật lần nào (chưa có key), chưa xem trên thiết bị.
Nợ kỹ thuật: bộ đếm trần/ngày và cache nằm trong RAM, reset khi Render khởi động lại; hạn mức tài khoản SerpApi là chốt cuối. Cần quota lưu DB nếu mở rộng.

## Đối chiếu giao diện mobile với PDF 23 màn — 12/10/2026

Nhánh `feature/ui-redesign-spec`, sau khi merge `origin/main`. Phạm vi: 16 màn mobile, chỉ đổi giao diện (không đổi logic, API, dữ liệu).

| Màn (theo PDF) | Trạng thái |
|---|---|
| #01 Đăng nhập, #02 Đăng ký | xong: header logo + tagline + "Xem giới thiệu", nút có mũi tên, chữ theo PDF |
| #03 Onboarding | xong: khung minh họa + chú thích 01/04, 3 dòng điểm nhấn, 4 bước theo spec 3.2 |
| #06 Cẩm nang, #07 Chi tiết bài | xong: "Tìm nâng cao", "Bộ lọc", lối tắt có mô tả, metadata nối bằng dấu chấm giữa, icon Bookmark |
| #08 Tìm kiếm, #09 Không có kết quả | xong: thẻ kết quả theo mẫu, khung "Hỏi AI", gợi ý từ khóa |
| #11 Dịch nhanh | xong: hàng chọn ngôn ngữ ngang, khối kết quả có Phiên âm đọc + "Phát âm to rõ" |
| #12 SOS | xong: "Quy trình sự cố", khối hướng dẫn 5 bước; GIỮ nút gọi cảnh sát dạng thẻ đỏ |
| #14 Sự cố | xong: lưới 2 cột, thanh tiến độ 1-2-3-4-5 |
| #15 Cảnh báo | xong: thẻ tô màu theo mức, "Đánh dấu đã đọc" và "Xem chi tiết" ngay trên thẻ |
| #16 Hồ sơ | xong một phần: nút "Sửa hồ sơ", bo góc; chưa có thẻ "Chuyến đi của tôi" dạng PDF |
| #05 Home | xong (làm lại sau khi người dùng chụp màn hình báo lệch): hero tối, "Đổi nước", "Thao tác nhanh", chuông có số đếm |
| #04, #13 | CHƯA đối chiếu kỹ (chỉ dò chuỗi chữ), cần ảnh chụp thực tế để so với PDF |
| #10 Chat | giữ nguyên: Be.Travel AI đang tạm khóa bằng màn chờ |

Chưa làm (PDF có, code/backend chưa hỗ trợ): Google OAuth, bộ lọc "Mới cập nhật" và "Chỉ đã xác minh", chip danh mục tình huống ở Dịch, hộp "Việc bạn nên làm" ở chi tiết bài, ngày cập nhật trong kết quả tìm kiếm (cần đổi contract).
Chưa kiểm bằng mắt trên emulator/thiết bị; chưa làm 7 màn Admin.

Kiểm tra: mobile tsc sạch, lint sạch, 213/213.

## Đợt sửa 3 — hoàn thiện giao diện — 09/10/2026

Nhánh `fix/wave3-polish`. Phạm vi B15-B21 theo quyết định B9; B22 chờ Phú Long đưa tài liệu spec.

| Việc | Trạng thái |
|---|---|
| B15 cờ KR, SG vẽ lại theo tỉ lệ chính thức | xong, emulator |
| B16 gợi ý tìm kiếm theo chủ đề có bài | xong, emulator (KR 0 bài --> câu chung) |
| B17 dòng ngôn ngữ chỉ đọc "Chỉ có tiếng Việt" | xong, emulator |
| B18 ẩn tab khi chưa có chuyến, icon lịch | xong, emulator |
| B19 chip phạm vi sự cố theo dữ liệu sự cố | xong, emulator |
| B20 "Hướng dẫn xử lý từng bước" | xong, emulator |
| B21 Admin: sidebar thu thành dải icon dưới `md` | xong, Chrome trong emulator |
| B25 (mới) câu hỏi hỏng dấu trong `ai_events` do lần thử curl 07/10 | chờ người dùng đồng ý xoá |

Kiểm tra: mobile tsc + lint + 213/213; admin typecheck + build + 18/18; backend không đổi.

## Đợt sửa 2 — trải nghiệm wizard, cảnh báo, nút SOS — 09/10/2026

Nhánh `fix/wave2-ux`. Phạm vi B09-B14 theo quyết định B9; lỗi theo `FEATURE_STATUS_BUGS.md`.

| Việc | Trạng thái |
|---|---|
| B09 wizard bước 1: dòng nhắc trường còn thiếu + "Đến ô nhập" (cuộn, mở bàn phím, đệm bàn phím) | xong, emulator |
| B10 wizard: cuộn về đầu khi đổi bước, đệm dưới thanh tiến độ | xong, emulator |
| B11 ngày dd/MM/yyyy + tên nước (wizard, chi tiết bài, Đã lưu) qua `formatDateIfComplete`, `useCountryName` | xong; wizard kiểm trên emulator, chi tiết bài/Đã lưu chưa kiểm được (0 bài published) |
| B12 Cảnh báo: bỏ khoảng trắng, nhãn mức độ trùng Admin, kéo để làm mới | xong, emulator (cảnh báo thử tạo rồi xoá) |
| B13 liên hệ khẩn cấp | đóng theo quyết định B6 (đã làm ở đợt 1) |
| B14 đệm dưới AppShell theo vùng an toàn (`useAppShellBottomPadding`) | xong, emulator (Home, Cá nhân) |
| B24 (mới) chip chủ đề "Giao thông" viết cứng ở chi tiết bài --> nhãn theo `topicKey` | xong, chưa kiểm trên máy |

Kiểm tra: mobile tsc + lint + 213/213; backend không đổi.

## Đợt sửa 1 — an toàn SOS và dữ liệu khẩn cấp — 08/10/2026

Nhánh `fix/wave1-sos-safety`. Phạm vi theo quyết định nhóm ngày 08/10 (`USER_INPUT_FORM.md`
mục "Quyết định đã chốt"); lỗi theo `FEATURE_STATUS_BUGS.md`.

| Việc | Trạng thái |
|---|---|
| B01 chia sẻ vị trí, B02 micro: không huỷ khi hộp thoại xin quyền đẩy app vào background | xong, emulator + test hồi quy |
| B03 bỏ nhãn "Đã mã hoá"; B6 ghi rõ dữ liệu chỉ lưu trên máy | xong |
| B05/B06 vùng thanh trạng thái (`TopInsetView`, `useScreenTopInset`), `StatusBar` chữ tối, banner không đè | xong, emulator |
| B07 định vị: dự phòng vị trí đã biết trong 5 phút, báo lý do thất bại | xong, emulator + test |
| B08 (UI) bản đồ: câu báo trống hiện rõ + nút gọi cảnh sát | xong, emulator |
| B23 (mới) mở `/sos`, `/sos/share-location` cho khách; nút SOS ở màn chào và đăng nhập | xong, emulator + test `AppGate` |
| D4 số khẩn cấp đóng gói sẵn (`features/sos/offlineEmergency.ts`) | xong, emulator (khách, không tới được backend) |
| D2 số Đại sứ quán `+82-2-720-5124` (Atlas KR, bài nháp mất hộ chiếu, seed) | xong |
| B2 gỡ `bang-lai-nuoc-ngoai`, `qua-han-luu-tru` về nháp qua Admin API | xong; Home/Cẩm nang có câu báo trống |
| Xoá `scripts/publish-samples.js` + lệnh `seed:samples` | xong |

Kiểm tra: backend lint + 269/269; mobile tsc + lint + 213/213 (thêm 7 test hồi quy).

## Quyết định phát sinh (08/10)
- Mở SOS cho người chưa đăng nhập (người dùng chốt): bản đồ/điểm hỗ trợ vẫn cần đăng nhập.
- Bộ số mất mạng là dữ liệu theo mã quốc gia, chỉ chứa số đã đối chiếu nguồn chính thức.

## Đang vướng (08/10)
- B04/AI: chưa có bài nào được duyệt để index. B08 dữ liệu: 0 điểm hỗ trợ.
- E2 (xoá tài khoản trong app): ghi nhận, làm sau.
- Nghiệm thu máy thật: nói vào micro, TTS, GPS ngoài trời, bản đồ (cần key).

## Lịch sử cũ

Các phiên 28/09-07/10/2026 đã chuyển sang [PROGRESS_HISTORY.md](PROGRESS_HISTORY.md) (19/10/2026).
