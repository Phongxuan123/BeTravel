# BAO CAO TOI UU CODE — BE.TRAVEL

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

## Lịch sử cập nhật: Auth ba vùng — 20/10/2026

Tách header/footer thành props của AuthScreen, chỉ vùng nhập dùng flexGrow và
justifyContent:center. Không đo chiều cao màn hình hoặc dùng vị trí absolute;
form dài có thể cuộn cùng các nút. Giữ minHeight/flexShrink của Button để tránh
hồi quy co nút. Không thêm dependency, không đổi logic xác thực. Mobile 237 tests,
lint/typecheck đạt; giới hạn nghiệm thu và logo ghi trong ACCEPTANCE/PROGRESS.

## Căn giữa form theo yêu cầu cuối — 20/10/2026

Chỉ bổ sung justifyContent:center ở content container có flexGrow; không phục hồi
maxWidth 480 hoặc chiều cao cố định. Giữ Button minHeight/flexShrink:0 để tránh
hồi quy co nút. Đã quan sát login trên BlueStacks; hạn chế UI ghi tại ACCEPTANCE.

Kiểm tra đợt này: mobile 237/237, backend 296/296, admin 18/18 (551 tổng).
Lint/typecheck tương ứng, format backend và admin build đạt.

## Hồi quy layout auth — 20/10/2026

Bỏ giới hạn chiều rộng và căn giữa dọc không phù hợp ảnh người dùng. Button mặc
định dùng mảng style tĩnh, minHeight/flexShrink thay chiều cao cứng trong callback;
cho phép chữ lớn xuống dòng. Không đổi sự kiện onPress hoặc auth. Giữ lưới test
mobile 237/237; đã xem login thật trên BlueStacks. Không thêm test phản chiếu CSS.

## Bố cục auth — 20/10/2026

- Gom safe-area, padding và ScrollView vào AuthScreen để ba màn không lệch bố cục.
- Giữ khoảng cách OTP đã sửa local; nền trang trí không bắt thao tác chạm.
- Không viết test chỉ kiểm giá trị CSS cho chỉnh sửa bố cục; chạy bộ hồi quy sẵn có.
- Không đổi contracts, mật khẩu, session hoặc nguồn dữ liệu; kiểm thiết bị còn mở.

Kiểm tra: mobile 237/237, backend 296/296, admin 18/18 (551 tổng);
lint/typecheck tương ứng, backend format và admin build đạt.

## OTP giữ ngữ cảnh đăng nhập — 20/10/2026

- Dựa vào AuthContext thay vì tham số URL để quyết định giao diện đã đăng nhập.
  Không tạo phiên giả hay giữ phiên sau khi đổi mật khẩu thành công.
- Gom hướng dẫn PASSWORD_REQUIREMENTS, giữ validator backend và client thống nhất.
  Quy tắc ký tự đặc biệt không bắt buộc được nói rõ, không tự nâng chính sách.
- Rà file sửa: không import chết, không thay API/schema, giữ màn guest và chặn
  nút điều hướng trong lúc gửi yêu cầu. Giữ hạn chế nhận email/thiết bị ở ACCEPTANCE.

Kiểm tra: mobile 237/237, backend 296/296, admin 18/18 (tổng 551);
lint/typecheck tương ứng, format backend và admin build đạt. Hồi quy màn OTP
chạy lại 2/2 sau chỉnh lỗi xác nhận/khóa nút quay lại, đạt.

## Auth/OTP — 20/10/2026 (Chế độ B)

- Chuẩn hóa SMTP theo env đã validate, timeout có hằng; kiểm tra sức khỏe gộp
  request đồng thời/cache 30s để không xác thực SMTP mỗi lần gửi.
- Không lộ tài khoản qua lỗi cấu hình: kiểm dịch vụ trước lookup. Giữ hạn mức
  route, không log email/OTP/password; escape tên người dùng trong HTML email.
- Dọn đúng request khi gửi thất bại, không xóa request khác đến sau. Đổi mật khẩu
  trực tiếp hủy OTP/reset cũ. Không thay schema hoặc thêm provider.
- Dùng chung TextField với accessibilityLabel mặc định; caller vẫn ghi đè được.
- Giới hạn: lỗi người nhận sau verify vẫn phản hồi tiếp nhận để chống dò email;
  cần log provider/kiểm hộp thư để xác nhận gửi thực. Không tự sửa key hoặc gửi mail.

Kiểm tra cuối: backend 296/296, mobile 236/236, admin 18/18 — tổng 550.
Lint/format backend, lint/typecheck mobile/admin và admin build đạt.

## Luật liên bang Úc — 18/10/2026 (Chế độ B, chỉ file đã động tới)

- Rule 10: không còn import/biến thừa trong các file mới (`eslint`, `tsc`, `oxlint` xanh). Không xóa `mobile/src/mocks/`.
- Rule 6: ngưỡng, TTL, kích thước cụm, số lần thử lại nằm ở hằng số có tên hoặc biến `AU_LEGISLATION_*`, `AU_LAW_DEEP_SUMMARY_AUTOGEN`.
- Rule 13A: W5 (bảo mật) không phát sinh; id/collection/topic đi vào câu OData đều bị chặn ký tự lạ hoặc escape.
- Rule 11: có comment tiếng Việt cho các khối mới (guard tóm tắt/dịch, tách Phần, tiện ích thử lại 429).
- Còn tồn: xem mục "Nợ kỹ thuật (Luật Úc)" trong PROGRESS.md.

## Khôi phục bản đồ ổn định theo người dùng — 17/10/2026

- Lấy e6361c3 làm nền map, hoàn tác thử nghiệm render/tiles mới và vendor để
  thu hẹp thay đổi. Giữ sửa micro độc lập; không xóa lịch sử commit.
- Cache embassy theo quốc gia thay vì GPS; tránh API lặp khi GPS đổi mà vẫn
  chọn cùng nước. Camera canh kết quả theo nước, giữ API và nhãn chưa xác minh.
- Xử lý warning lỗi upstream bằng thông báo và retry chủ động, không che lỗi
  timeout thành danh sách rỗng. Không auto retry gây tăng quota.
- Lint không warning; 531 tests đạt. OSM thật timeout hai lần, vẫn còn mở.

## Bản đồ/micro điện thoại — 17/10/2026

- Gỡ phụ thuộc CDN lúc mở bản đồ bằng Leaflet đóng gói, giữ license và hash nguồn.
  Đổi lại bundle chứa thêm JS/CSS thư viện; ô OSM vẫn tải qua Internet.
- Tách initialized khỏi ready để không báo thành công khi chưa có ô; chuyển lỗi
  WebView/process/tiles về màn hình với danh sách và thử lại. Không đổi hợp đồng API.
- Rà file thay đổi theo Rule 10/13: không còn import chết hoặc lint warning;
  sửa 2 cảnh báo trong lượt kiểm (thứ tự import và displayName mock test).
- Không thêm dịch vụ upload âm thanh. Expo Go dùng bàn phím OS, bản native giữ
  module hiện có; giữ phiên qua dialog nhưng không thu nếu app nằm nền.
- Kiểm tự động 532/532 đạt; giới hạn thiết bị thật ghi tại TRANSLATION.md mục 4 và
  ACCEPTANCE. Cảnh báo phụ thuộc cũ chưa được coi là đã xử lý trong đợt này.

## Tích hợp main — 15/10/2026

Giữ luồng xử lý offline tách khỏi màn hình; áp dụng bố cục mới từ main mà không
nhân đôi nút sao chép/phát âm. Bộ đếm dùng giới hạn theo chế độ, không khôi phục
hằng 500 ký tự cho offline. Giữ metadata engine và nguồn Google khi đổi thẻ kết quả.
Không thay đổi schema dữ liệu để giải quyết xung đột giao diện. Cài dependency theo
lockfile đã hợp nhất, không nâng major hoặc ghi lại lịch sử commit cũ.


## Dịch offline — 13/10/2026 (file thay đổi)

- Tách engine, quản lý model và công cụ voice khỏi màn hình dịch; tái sử dụng
  ánh xạ locale và hàm chia đoạn; giới hạn 500/5.000/450 có hằng riêng.
- Không sửa hợp đồng dịch online hoặc schema câu lưu cũ. Metadata engine bổ sung
  tùy chọn; lời dịch ML Kit có ghi công Google cạnh kết quả.
- Dùng generation token chặn callback cũ, đóng translator Android sau tác vụ,
  giải phóng TTS engine kiểm tra giọng và phiên audio iOS sau khi dừng.
- Không tải model trong đường dịch; chỉ tải khi người dùng chọn Wi-Fi/cellular.
  Gói dịch, gói micro và giọng đọc được giải thích riêng trong giao diện.
- Kiểm tra phụ thuộc còn cảnh báo gián tiếp; không ép đổi major Expo/Tailwind/Jest
  để che cảnh báo audit. Chi tiết nghiệm thu còn thiếu nằm trong ACCEPTANCE.


## Đợt sửa 3 — 09/10/2026 (Chế độ B, chỉ file đã động tới)

| Rule | Xử lý |
|---|---|
| 6 (magic number) | Góc đường chéo cờ KR, toạ độ vạch quẻ thành hằng có tên; sao cờ SG sinh bằng hàm thay vì toạ độ gõ tay |
| 1/8 | `SettingsRow` không có `onPress` --> dòng chỉ đọc, thay cho toast "giả bấm được" |
| 3 (DRY) | Chip phạm vi sự cố dùng lại `useCountryName()` của đợt 2 |
| 13 (W3) | Gợi ý tìm kiếm viết cứng một câu không có bài trả lời --> lấy theo dữ liệu chủ đề |

## Đợt sửa 2 — 09/10/2026 (Chế độ B, chỉ file đã động tới)

| Rule | Xử lý |
|---|---|
| 6 (magic number) | Kích thước nút SOS, phần nhô, nhãn, khoảng cách trong AppShell thành hằng có tên |
| 3 (DRY) | Đệm dưới gom vào `useAppShellBottomPadding()`; tên nước gom vào `useCountryName()` |
| 10 (dead code) | Bỏ hằng `APP_SHELL_CONTENT_BOTTOM_PADDING` (110 cố định, sai trên máy có thanh điều hướng cử chỉ) |
| 13 (W3) | Chip chủ đề viết cứng "Giao thông" ở chi tiết bài --> lấy theo dữ liệu (B24) |

## Đợt sửa 1 — 08/10/2026 (Chế độ B, chỉ file đã động tới)

| Rule | Xử lý |
|---|---|
| 3 (DRY) | Khoảng trên cho thanh trạng thái gom về `screenTopInset.tsx` thay cho `insets.top` rải ở từng màn |
| 7 (lỗi rõ ràng) | `requestLocationDetailed` trả lý do; SOS Hub, chia sẻ vị trí, micro không còn thất bại im lặng |
| 10 (dead code) | Xoá `publish-samples.js` + lệnh `seed:samples`; bỏ import `Lock` không dùng ở hồ sơ |
| 1/8 | Tách `freshCoords` / `recentCoords` thay hàm dùng tham số làm công tắc ngầm |
| 13 (W5) | Nhãn "Đã mã hoá" sai sự thật với dữ liệu nhạy cảm --> bỏ |

Warning còn lại: không có warning mới từ `tsc`, `expo lint`, `eslint`. Bỏ qua có lý do: B12 khoảng
trắng màn Cảnh báo (nguyên nhân đã xác định, để đợt 2 theo phạm vi đã chốt).

## Nhật ký cũ (trước 08/10/2026)

Báo cáo tối ưu từng batch B1-B9 và các đợt rà soát 24/09-07/10/2026 đã gỡ ngày 19/10/2026 vì đã hết giá trị sử dụng; nội dung còn trong lịch sử git (commit trước thay đổi tài liệu 19/10). Mục "Tồn đọng hiện hành" và lịch sử cập nhật bên dưới vẫn có hiệu lực.

### Tồn đọng hiện hành

Đối chiếu `PROGRESS.md` mục Đang vướng và Giới hạn còn lại. Cần người phụ trách
xác minh dữ liệu SOS/pháp lý, cấu hình dịch vụ thật và kiểm thử trên thiết bị.
B7/B8, multi-turn, usage/cost AI thật, nâng cấp tìm kiếm công khai và triển khai
vẫn là công việc lộ trình; không được coi là đã hoàn thành bởi đợt sửa lỗi này.
Patch dependency là giải pháp tương thích có test, cần rà lại khi nâng Expo
Router/query-string: nếu upstream đã dùng decoder đã vá, gỡ patch cùng override.

## 7. LICH SU CAP NHAT

- 17/10/2026 (lần 2): khôi phục map e6361c3 theo yêu cầu, sửa embassy theo nước; 531 tests đạt, upstream OSM còn timeout.

- 17/10/2026: ổn định WebView bản đồ, hướng dẫn micro Expo Go, sửa vòng đời quyền; 532 tests đạt, chờ Samsung thật.
| Phiên bản | Ngày | Batch | Nội dung chính |
|-----------|------|-------|----------------|
| 2026.10.09-dot3 | 09/10/2026 | Đợt sửa 3 | B15-B21: cờ KR/SG chuẩn, gợi ý tìm kiếm theo dữ liệu, dòng ngôn ngữ chỉ đọc, ẩn tab chuyến đi trống, phạm vi sự cố, Admin co giãn màn hẹp; mobile 213, admin 18 test |
| 2026.10.09-dot2 | 09/10/2026 | Đợt sửa 2 | B09-B14, B24: wizard nhắc trường thiếu + cuộn đầu bước + đệm bàn phím; ngày/tên nước thay dữ liệu thô; Cảnh báo bỏ khoảng trắng, kéo làm mới; đệm dưới AppShell theo vùng an toàn; mobile 213 test |
| 2026.10.08-dot1 | 08/10/2026 | Đợt sửa 1 | B01-B08, B23: SOS/micro không huỷ khi xin quyền; vùng thanh trạng thái; định vị dự phòng; số khẩn cấp mất mạng; mở SOS cho khách; backend 269, mobile 213 test |
| 2026.10.06-maps | 06/10/2026 | Maps + rà soát | Config env, search/radius/GPS/camera/list/cache verified, Favorites privacy; vá 2 dependency; backend tuần tự 266, mobile 183, admin 18 |
| 2026.09.29-quy | 29/09/2026 | Quét test (nhánh Quy) | Test module thuần + hồi quy; guard đối chiếu đủ đơn vị tiền (dùng chung CURRENCY_UNIT); containsPhrase cho tên nước; username Google; script test đa nền tảng; 255(+1 todo)/153/18 test |
| 2026.09.28-qa5 | 28/09/2026 | QA-5 (07_QA_BugHunt) | M16-M17 + E2E + edge; update schema incident/geo-alert không còn ghi đè mảng rỗng; `parseEnv` + ràng buộc production; smoke test import server; Rule 12 (README/contracts/src/UI); commit format backend riêng (BASE-01); 227(+1 todo)/111/11 test, export iOS/Android đạt |
| 2026.09.28-qa4 | 28/09/2026 | QA-4 (07_QA_BugHunt) | M13-M15; ErrorBoundary cấp route (Thử lại + SOS); helper `openExternal` chuẩn hóa `tel:` và bắt lỗi Linking; màn hình chỉ import từ `@/lib/data`; admin xác nhận xác minh hàng loạt/re-index, lấy quốc gia từ API; `/auth/refresh` bỏ cờ nội bộ; mọi fixture có backend + client; 214(+1 todo)/111/11 test |
| 2026.09.28-qa3 | 28/09/2026 | QA-3 (07_QA_BugHunt) | M08-M12; mobile cache danh sách quốc gia + SOS Hub có màn dự phòng thay vì trắng; translate giới hạn from/to; favorites dùng chung projection bỏ trường nội bộ; trip chỉ tới quốc gia active; tái hiện nợ H-09.a bằng test `todo`; 211(+1 todo)/102/9 test |
| 2026.09.28-qa2 | 28/09/2026 | QA-2 (07_QA_BugHunt) | M05-M07 + mutation testing RAG (3 đột biến, 2 sống sót --> thêm test); guard bắt thêm ký hiệu tiền đứng trước/phạt tù/số bằng chữ; retrieval bỏ chunk khác embedding model + báo lỗi sai số chiều; tìm kiếm khớp d/đ, giới hạn q 200; bài luật công khai bỏ trường nội bộ (contract + fixture); mobile chat chặn gửi trùng + nút hỗ trợ khẩn cấp khi needsOfficialHelp; 198/99/9 test |
| 2026.09.28-qa1 | 28/09/2026 | QA-1 (07_QA_BugHunt) | Baseline 3 workspace + detector D01-D40 + M01-M04; 23 test backend + 1 test mobile mới; sửa E11000 gắn nhãn sai, dò tài khoản bị khóa khi đăng nhập, xóa Country/Topic đang tham chiếu (+ hiện lỗi xóa ở admin), gỡ PII/mật khẩu mặc định khỏi tài liệu và `env.js`; tồn đọng S2-S4 ở docs/QA_REPORT.md mục 4.3; 174/95/9 test |
| 2026.09.28 | 28/09/2026 | Rà soát sau B9 | Favorites/content visibility, incident/CAS, GeoAlert, GPS/consent, dismiss, saved filter; 151/94/9 test |
| v0.2.0    |      | —     | Trạng thái ban đầu |
| v0.3.0    | 22/09/2026 | B1 | contracts/, envelope {ok,data}, auth thật (mobile + backend), refresh xoay vòng + ân hạn, prettier/eslint backend |
| v0.3.1    | 22/09/2026 | B1 (điều chỉnh) | Phone bắt buộc lại + UI đăng ký; login-phone chặn bằng màn hình tĩnh; sửa 2 bug phát hiện qua smoke test thật trên Atlas (import sai đường dẫn, `refreshToken: null` lọt envelope) |
| v0.4.0    | 22/09/2026 | B2 | Content backbone backend (models, admin API, máy trạng thái, job queue, audit log) + Admin Portal SPA hoàn toàn mới (Vite/React/TS/Tailwind v4); sửa 2 bug qua smoke test thật (Express 5 req.query, Mongoose deprecation) |
| v0.5.0    | 22/09/2026 | B3 | API công khai countries/legal/trips + seed 4 nước, 6 chủ đề, 8 bài luật KR draft có nguồn thật; mobile nối API thật qua adapters.ts, sửa 3 file bị bỏ qua công tắc mock/thật; sửa 3 bug (2 qua test, 1 qua đọc code) |
| v0.6.0    | 23/09/2026 | B4 | RAG engine đầy đủ (embedding/LLM provider + mock bắt buộc, chunking, retrieval 2 lớp phòng thủ, guard.js hậu kiểm), chat API backend, job reindex/purge thật, admin A04 RAG Index, golden test 25/25 (15 must_answer + 6 must_refuse + 4 country_isolation); sửa 2 bug (1 qua smoke test Atlas, 1 qua viết golden test) |
| v0.6.1    | 23/09/2026 | B4 (điều chỉnh) | Smoke test Gemini thật thành công với key đúng định dạng; phát hiện `gemini-2.5-flash` (default cũ) bị Google trả 404 cho key mới, đổi default `LLM_MODEL` sang `gemini-3.6-flash`; `.env` chốt dùng `LLM_PROVIDER=gemini`/`EMBEDDING_PROVIDER=gemini` cho dev thật, xác nhận test (78/78) và golden test (25/25) không phụ thuộc `.env` nên không bị ảnh hưởng |
| v0.7.0    | 24/09/2026 | B5 | Chat mobile nối RAG thật (session/lịch sử/marker bấm được/focusArticleId/quota), module feedback + A08 Feedback Queue, A01 Dashboard nâng cấp số liệu AI; sửa 3 bug qua smoke test thật trên Atlas (bug `validateQuery` không coerce `req.query`, `topFallbackQuestions` null, 2 API Mongoose deprecated) |
| v0.8.0    | 24/09/2026 | B6 | SOS: `$geoNear` thật (backend) + admin CRUD/bulk import CSV/bulk verify + mobile map/hub nối API thật, disable Places API đúng CLAUDE.md; sửa 4 bug (2 qua smoke test Atlas, 2 qua tự viết test TRƯỚC khi ảnh hưởng dữ liệu thật); chưa đạt điều kiện nghiệm thu "có support_locations đã verify" của master plan -- cần người điền toạ độ thật |
| v0.8.1 | 24/09/2026 | Rà soát toàn hệ thống | Sửa API/auth/quota/job/RAG/SOS/admin/mobile; dependency 0 advisory; kiểm tra và bàn giao |
| v0.9.0 | 25/09/2026 | B7 | Incidents (backend CRUD + workflow công khai + tiến độ theo user + CTA ngữ cảnh) và Translator (`/api/translate` tái dùng provider RAG + quick phrases offline) nối API thật ở mobile; Admin A07 Incident Workflow Builder + trang Câu dịch sẵn; 127 test backend, 80 test mobile, 8 test admin xanh |
| v1.0.0 | 25/09/2026 | B8 | GeoAlert + favorites + preferences nối API thật; banner/modal cảnh báo AppShell, màn hình Đã lưu gộp 3 loại, lịch sử chat đổi tên/xoá, khối riêng tư + xoá lịch sử AI; mobile không còn phụ thuộc `@/mocks/client`/`@/mocks/fixtures` ở màn hình nào; sửa 2 bug (1 qua test tự viết trước khi ảnh hưởng thật, 1 khoảng trống cấu hình Jest có sẵn từ trước); 146 test backend, 85 test mobile, 8 test admin xanh |
| v1.1.0 | 25/09/2026 | B9 | RBAC sweep tự động (đọc `router.stack`), seed mở rộng (admin/incidents/quick-phrases, KHÔNG seed support_locations/geo_alerts), `seed:demo` (seed+reindex), QA/security sweep, mobile polish (loading/error state còn thiếu ở 3 màn hình), render.yaml/eas.json/keepalive.yml, docs/DEPLOY.md + DEMO_SCRIPT.md + API.md + ACCEPTANCE.md; expo-doctor 21/21; 145 test backend, 85 test mobile, 8 test admin xanh; ĐÃ chạy seed thật trên Atlas (tạo admin mặc định cần đổi mật khẩu) |
