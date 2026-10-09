# TIEN DO BE.TRAVEL

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

## Giọng nói và phát âm bản dịch — 07/10/2026

Nhánh `feature/voice-translation-20261007`, từ `93d5ad2` đã push phiên trước.
Tiến độ mã nguồn/kiểm tra local `[######] 6/6`; native thiết bị còn chờ nghiệm thu.
Không merge/push/deploy tự động.

| Việc | Trạng thái |
|---|---|
| Định vị Docs/kiến trúc/SDK | xong, ngoại lệ voice theo yêu cầu mới |
| Micro → văn bản, ngôn ngữ nguồn, quyền/hủy phiên | xong code, native introspection quyền hai nền tảng đạt |
| TTS đúng ngôn ngữ đích, tự phát/stop, câu lưu | xong code; không đọc giọng khác khi thiếu ngôn ngữ |
| Rà dependency/ba workspace | backend 269/269 gồm golden 26; admin 18/18 + lint/typecheck/build; vá shell-quote 1.12.0, http-cache-semantics 4.3.0 |
| Mobile test/export cuối | 206/206, 49 suites; lint/typecheck và exports iOS/Android đạt |
| Nghiệm thu/bàn giao/commit | docs/VOICE_TRANSLATION, ACCEPTANCE, OPTIMIZATION_REPORT, USER_INPUT_FORM; commit local trên nhánh riêng, thiết bị còn mở |

Cần **native rebuild**: Expo Go/binary cũ chỉ nhập tay/TTS, micro báo hướng dẫn.
Không upload/lưu audio, không nghe nền. OS recognizer có thể dùng mạng; kiểm văn
bản trước dịch. Xem VOICE_TRANSLATION.md. Advisory còn lại chưa có bản vá tương
thích được ghi trong OPTIMIZATION_REPORT. Phạm vi repo/config/dependency/tests,
không chứng nhận toàn macOS hoặc nhận giọng trên mọi thiết bị.

## Thu thập mẫu Google Maps — 06/10/2026

Trạng thái: **đã được yêu cầu khởi tạo cho cả Android và iOS**.
Đã lưu 14 tệp đính kèm + 3 đoạn HTML thành 8 mẫu độc lập tại
`docs/references/google-maps/`. Có danh mục và hash ánh xạ các bản trùng nhau.
Tiến độ code/kiểm tra `[#####] 5/5`; nghiệm thu bản đồ Google trên thiết bị còn mở.

| Hạng mục | Trạng thái / bằng chứng |
|---|---|
| Lưu mẫu, xác định native/web/dịch vụ riêng | xong; bản đính kèm giữ nguyên byte, snippets chat bỏ escape; không chạy Places/Aerial/KML mẫu |
| Khởi tạo hai nền tảng | MapView native + config plugin; mapRuntime chọn đúng Google/Apple/Expo Go, chặn build có key mà thiếu định danh |
| Điều khiển và phục hồi | trạng thái khởi tạo, timeout 20 giây về list, retry remount ErrorBoundary, camera về tâm, vệ tinh hybrid; giữ GPS/search/filters/cache/verified list |
| Kiểm tra | mobile lint/typecheck + 193/193 (46 suites); export iOS/Android đạt; native introspection key thử vào Info.plist/Android manifest, không vào extra; không đổi backend/API/DB |
| Bàn giao | npm run maps:check, MAPS_SETUP và ACCEPTANCE; cấu hình hiện thiếu key/ID cả hai nền tảng, chưa push/deploy/native build |

Không diễn giải onMapReady là tile được Google cấp quyền. Preflight chỉ kiểm
định dạng env; cần key thật, SDK/billing, package/SHA-1 hoặc bundle restriction,
rebuild và kiểm tile trên điện thoại. Quy tắc Places ngoài MVP vẫn giữ nguyên.

Cập nhật lần cuối: 2026-10-07 · Nhập giọng nói, TTS theo ngôn ngữ đích và rà soát dependency/hồi quy.

## Sửa cẩm nang, dịch và lịch trình — 06/10/2026

Nhánh `feature/itinerary-guide-translation-20261006`, từ `2a71d9d`.
Tiến độ mã nguồn/kiểm tra local: `[######] 6/6`; chưa nghiệm thu thiết bị.

| Bước | Trạng thái |
|---|---|
| Phân tích cấu trúc, Docs, contract và nguyên nhân | xong |
| Mở lại cẩm nang (chỉ nội dung published/current) | xong phần code |
| Tách model dịch, thử lại lỗi 503 có giới hạn | xong; Gemini 3.5 Flash Lite dịch thử thật thành công |
| Lịch trình nhiều nước/ngày chặng, quyền vị trí, khóa phiên sửa cũ | xong phần code |
| Hồi quy toàn hệ thống và exports | xong local: backend 269/269 gồm golden 26; mobile 188/188 (45 suites); admin 18/18; lint/typecheck/format/build và exports iOS/Android |
| Nghiệm thu, bàn giao, commit | xong phần code/tài liệu; commit ghi trong lịch sử Git của nhánh, thiết bị còn mở |

Google Maps native chưa nghiệm thu: chưa có key Android/iOS trong môi trường.
Đã nối config plugin và provider; iOS thiếu key vẫn dùng Apple Maps, Android thiếu
key có danh sách và liên kết mở Google Maps. Người quản lý phải tạo key Google Cloud
và build lại; không sử dụng khóa Gemini cho Maps. Phiên này không sửa dữ liệu Atlas.
Các mục phong tỏa cẩm nang trong lịch sử bên dưới đã được yêu cầu mới thay thế:
`LEGAL_LOOKUP_ENABLED` mặc định true; vẫn có thể đặt false để tạm khóa vận hành.

Hướng dẫn tiếp tục: `TRIP_ITINERARY.md`, `MAPS_SETUP.md`, `USER_INPUT_FORM.md`.
Backend chạy lại cần nạp cấu hình mới; nếu deployment đặt explicit false thì đổi
LEGAL_LOOKUP_ENABLED=true. Model dịch riêng cấu hình TRANSLATION_MODEL, giữ nguyên
LLM_MODEL của AI pháp lý. Smoke service thực đạt cả vi->en và en->vi. Retry có
giới hạn không bảo đảm provider hết 503/429. Chưa push/deploy phiên này.
Các dependency advisory chưa có bản vá upstream ghi ở phần audit Maps bên dưới
vẫn chưa đóng. Phạm vi rà soát là repo/cấu hình/kiểm thử, không chứng nhận toàn OS.

## Bản đồ và rà soát hệ thống — 06/10/2026

Nhánh `feature/maps-integration-20261006`, tách tại `e02bbd7` từ nhánh
`fix/betravel-qa-20261005` đang ahead origin 14 commit. Không tự sửa lịch sử/push.
Tiến độ mã nguồn/kiểm tra local: `[######] 6/6`. Phát hành bản đồ Android:
**xong một phần**, còn key, định danh/chứng thư và nghiệm thu thiết bị.

| Bước | Trạng thái | Bằng chứng |
|---|---|---|
| Định vị cấu trúc/quy tắc | xong | CLAUDE, AGENTS mobile, Docs audit/master plan/tối ưu/B6, contracts, inventory ba workspace |
| Cấu hình Maps SDK | xong phần code | app.config.js nạp key vào plugin; iOS Apple Maps; Android thiếu key dùng list; native introspection đạt |
| Tính năng bổ trợ | xong local | Tìm không dấu/tên bản địa/địa chỉ; loại, bán kính 5/20/50 km; GPS chủ động; camera; list-only; ngày verify; gọi/chỉ đường/copy |
| Sửa lỗi/bảo vệ dữ liệu | xong local | Camera, GPS timeout/lỗi/cũ; cache list/nearby/hỏng/chưa verify; Favorites không lộ ID biên tập; warning test Explore |
| Kiểm tra ba workspace | xong local | Backend 266/266 tuần tự + golden 26/26; mobile 183/183 (43 suites); admin 18/18; lint/typecheck/build/exports |
| Ghi sổ bàn giao | xong | MAPS_SETUP, PROGRESS, OPTIMIZATION_REPORT, ACCEPTANCE, contracts, .env.example |

### Cấu trúc hiện hành để người/AI tiếp theo tiếp tục

| Khu vực | Luồng và giới hạn |
|---|---|
| Backend routes -> middleware/validators -> controllers -> services -> models | Express envelope/RBAC/Zod/Mongo; public SOS chỉ verified, $geoNear + index 2dsphere |
| Backend rag/translation | Retrieval/guard/provider/quota; giữ cờ phong tỏa luật/chat, không seed luật/điểm giả |
| Mobile app/components/styles | Expo Router/design system; Maps route /sos/map, phần chưa có data vẫn có màn chặn |
| Mobile lib/data/api/features | Mock/API qua công tắc; adapters giữ contract; cache/query tách quốc gia/mode, foreground GPS chủ động |
| Admin pages/components/lib | CRUD/CSV/verify, Leaflet picker; cùng model và [lng,lat], không dùng Places |
| Contracts/Docs/CI | Shape/fixtures, sổ bàn giao, CI lint/test/build ba workspace độc lập; không thêm migration/index/collection |

### Bằng chứng, phạm vi và việc còn mở

- Backend lint/format sạch; **266/266** qua
  `node --test --test-concurrency=1 --test-timeout=30000 test/*.test.js`; golden **26/26**,
  SOS/Favorites riêng **24/24**. DB tạm/provider mock, không đọc/sửa Atlas.
- Hai lần concurrency=2 gặp nhiễu localhost: HTTP parser nhận JDWP/HTTP2, test treo,
  mongod báo port đã dùng. Chạy riêng/tuần tự xanh; chưa chứng nhận ổn định concurrency=2 trên máy này.
- Mobile thiếu hai font từ phiên trước: `npm ci` khôi phục theo lockfile; không đổi font/design.
  Lint/typecheck, **183/183 (43 suites)** đạt. Admin **18/18**, lint/typecheck/build đạt.
- Vá `source-map-js@1.2.2` ở mobile/admin và `postcss-selector-parser@7.1.6` ở mobile;
  giữ SDK 57/native libraries. Native config introspection và iOS/Android export đạt.
  Artifact `/tmp/betravel-map-*-20261006`, không commit. NO_COLOR/FORCE_COLOR là warning môi trường.
- Dependency chưa khép: npm ci trước vá báo 68 (9 moderate/59 high), gồm lan truyền qua gói cha.
  Đã vá hai gói; bốn gói khác chưa có bản vá upstream (OPTIMIZATION_REPORT).
  Audit offline trả 0 nhưng không đủ dữ liệu advisory, **không coi là hết lỗ hổng**.
- Cần người: key Maps Android + quota/package/SHA-1, iOS bundle ID, SOS verified thật,
  nghiệm thu điện thoại. Hướng dẫn: [MAPS_SETUP.md](MAPS_SETUP.md).
- Phạm vi là repository/config/dependency/test ứng dụng. Không chứng nhận toàn macOS
  hoặc mọi lỗi tiềm ẩn đã hết; chưa triển khai production/native build ký.

## Màn chặn cho phần chưa hoàn thiện (06/10)

Theo yêu cầu: phần nào chưa làm được thì chặn bằng màn hình "đang hoàn thiện" (`ComingSoonScreen`, route `/coming-soon`) để app chạy được. Đã chặn: Khám phá, Tìm kiếm, chi tiết bài, AI Legal (khi backend phong tỏa tra cứu luật, `FEATURE_DISABLED`); Trang chủ ẩn mục bài luật thay vì báo lỗi mạng; liên kết Điều khoản và Chính sách bảo mật ở màn đăng ký mở màn chặn (chưa có văn bản, không tự soạn). Backend: `SMTP_DISABLED` thay cho dò `NODE_ENV` trong email; ghi log rõ khi gửi OTP thất bại.

Vẫn chưa làm được (cần dữ liệu từ người, xem `docs/USER_INPUT_FORM.md`): nội dung pháp lý KR, điểm SOS/GeoAlert, văn bản Điều khoản/Bảo mật, đóng gói số khẩn cấp offline, định danh app và triển khai.

## Tích hợp bản vá 05/10 vào GitHub (06/10)

Bản vá của ThanhDatDora (`fix/betravel-qa-20261005`) được gộp qua nhánh tích hợp. Hai chỗ bản vá khai nhưng thiếu/lỗi đã được bổ sung: `backend/test/setup.js` bỏ cờ `--nounixsocket` trên Windows (mongod Windows thoát mã 2, làm đỏ toàn bộ test backend), và thêm thật `.github/workflows/ci.yml` + `.gitattributes`. Kiểm tra trên Windows: backend 262/262, golden 26/26.

## Cập nhật 05/10/2026 — phiếu bổ sung

Đã áp dụng đề xuất kỹ thuật B1, B2, B4, B5, B6, B7, B8. Giữ nghiêm điều kiện nguồn có ngày công bố (B9), chưa seed hoặc sửa Atlas. Các sửa bổ sung: khóa công tắc khi tải cài đặt lỗi; xử lý lỗi font; tách cache alerts theo quốc gia/tài khoản; ẩn màn dev; ẩn ID biên tập khỏi API công khai; chặn đổi khóa Country/Topic đang được tham chiếu; email reset không gọi SMTP trong test và không lộ tài khoản khi SMTP lỗi; audit thao tác reindex; CI cho ba workspace và chuẩn hóa LF.

API tiến độ đổi sang `completedSteps: string[]` chứa `stepId`; phải cập nhật backend, admin và mobile cùng đợt. Tiến độ cũ dạng số được đổi theo thứ tự cũ trong transaction trước khi sửa workflow. Các bước của dữ liệu cũ không có ID được trả bằng ID legacy ổn định. Xuất bản và sửa workflow cần Mongo replica set (Atlas tương thích); có script read-only `backend/scripts/check-content-indexes.js` để kiểm tra trước khi triển khai.

Xem [PATCH_2026_10_05.md](PATCH_2026_10_05.md) cho hướng dẫn cài, bằng chứng kiểm tra và từng mục chưa thực hiện. Lịch sử QA bên dưới phản ánh thời điểm cũ, không thay thế báo cáo bản vá này.

## Phong tỏa tra cứu pháp luật tạm thời (29/09, theo yêu cầu người dùng)

Cờ `LEGAL_LOOKUP_ENABLED` (mặc định `false`) chặn `/api/legal/*` và `/api/chat/*` ở backend
(`FORBIDDEN` + `details.reason = FEATURE_DISABLED`); mobile hiện thông báo "tạm ngưng" ở Khám
phá, Tìm kiếm, chi tiết bài và AI Legal. Bật lại: đặt `LEGAL_LOOKUP_ENABLED=true`. Đã xóa khỏi Atlas
(database `test`) theo yêu cầu người dùng, 29/09: 8 bài luật KR (3 published + 5 draft), 12 chunk,
15 job reindex/purge. Chưa xóa: bản ghi Favorite trỏ tới bài cũ, cache AI (`ai_caches`). Dựng
lại nội dung: `npm run seed` (tạo lại 8 bài draft) rồi bổ sung nguồn thật và publish.

## Tính năng: gợi ý thành phố lớn ở wizard tạo chuyến đi (29/09)

Yêu cầu: bước 1 của wizard tạo chuyến đi (`mobile/src/app/trips/new.tsx`) chỉ có ô nhập tự do
cho "Thành phố / khu vực", không có danh sách gợi ý — người dùng dễ gõ sai hoặc không biết
thành phố lớn nào của nước đó. Bổ sung danh sách gợi ý theo quốc gia, gõ để lọc (không dấu),
chọn xong điền vào ô nhập; người dùng vẫn có thể gõ tự do tên không có trong danh sách.

Thay đổi:
- Backend: `Country.majorCities: string[]` (model + `admin.validator.js`). Cố ý **không** đặt
  `.default([])` trên field Zod vì `countryUpdateSchema` dùng `.partial()` của cùng schema —
  Zod 4 vẫn áp `.default()` khi field bị bỏ qua ở PATCH (đúng bẫy QA-5 đã gặp với
  incident/geo-alert), sẽ xóa mất danh sách mỗi khi admin sửa quốc gia mà không gửi lại
  `majorCities`. Có test tái hiện bẫy này ở `admin.test.js`.
- Seed: KR/JP/TH có sẵn danh sách thành phố lớn (kiến thức địa lý phổ thông, không phải nội
  dung pháp lý nên không áp Rule "8 bài có nguồn thật").
- Admin: `CountriesPage.tsx` thêm ô nhập thành phố cách nhau bởi dấu phẩy.
- Mobile: `trips/new.tsx` — danh sách gợi ý hiện khi focus vào ô, ẩn sau 150ms kể từ blur (để
  kịp nhận sự kiện chọn), lọc theo `stripDiacritics` đã có sẵn trong file.
- Contracts: `contracts/README.md` mục 8.1 + hai fixture `admin.country.json`/`public.country.json`.

### Kiểm tra

- Backend: 257 test xanh (+1 todo cũ), golden 26/26, lint + format sạch.
- Mobile: 156 test xanh (34 suite, +3 test mới), tsc + lint sạch, export Android OK.
- Admin: typecheck + build sạch (chưa thêm test riêng cho ô nhập mới — form đơn giản, theo
  đúng mẫu các field text khác trong cùng trang).

## Nhánh Quy — quét test và gộp main (29/09)

Gộp `main` (QA #21, dịch/chia sẻ vị trí #22) vào nhánh `Quy`; xung đột lấy
bản `main`. `main` đã tự sửa lỗi "đ" (gập d/đ lúc so khớp, không đổi
normalizeVi) nên bỏ cách sửa của nhánh này. Giữ lại phần không trùng:
- Guard: bước đối chiếu số tiền dùng chung `CURRENCY_UNIT` với bước phát hiện
  (bản main vẫn để "900.000₫ [S1]" hoặc "500$ [S1]" lọt khi nguồn ghi số khác).
- Chat: phát hiện tên nước khác theo ranh giới từ, giữ dấu (`containsPhrase`),
  tránh "Lào" chặn nhầm câu hỏi "lao động".
- Google login với email ngắn (username < 3 ký tự); `npm test` backend chạy
  trên Windows/Node 20; test không cần `backend/.env`.
- Kiểm tra: backend 255 pass (+1 todo có sẵn), mobile 153/153, admin 18/18
  (Node 22); lint/typecheck/build đạt. Máy local vẫn Node 20.19.6, cần >=22.13.

## Nhánh Quy — quét test và gộp main (29/09)

Gộp `main` (QA #21, dịch/chia sẻ vị trí #22) vào nhánh `Quy`; xung đột lấy
bản `main`. `main` đã tự sửa lỗi "đ" (gập d/đ lúc so khớp, không đổi
normalizeVi) nên bỏ cách sửa của nhánh này. Giữ lại phần không trùng:
- Guard: bước đối chiếu số tiền dùng chung `CURRENCY_UNIT` với bước phát hiện
  (bản main vẫn để "900.000₫ [S1]" hoặc "500$ [S1]" lọt khi nguồn ghi số khác).
- Chat: phát hiện tên nước khác theo ranh giới từ, giữ dấu (`containsPhrase`),
  tránh "Lào" chặn nhầm câu hỏi "lao động".
- Google login với email ngắn (username < 3 ký tự); `npm test` backend chạy
  trên Windows/Node 20; test không cần `backend/.env`.
- Kiểm tra: backend 255 pass (+1 todo có sẵn), mobile 153/153, admin 18/18
  (Node 22); lint/typecheck/build đạt. Máy local vẫn Node 20.19.6, cần >=22.13.

## Phiên 28–29/09 — dịch hai chiều và chia sẻ vị trí (hiện hành)

Tiến độ triển khai/kiểm tra local: `[######] 6/6`. Nghiệm thu thiết bị/dịch vụ thật: **còn mở**.

| Bước | Trạng thái | Bằng chứng |
|---|---|---|
| Đọc cấu trúc và quy tắc | xong | CLAUDE, AGENTS mobile, Docs kiến trúc/audit/tối ưu, contracts; giữ 3 workspace độc lập |
| Dịch Việt - Anh hai chiều | xong | Mười cặp câu Tatoeba offline, UD grammar, chuẩn hóa ngôn ngữ, quota và chống response cũ |
| Chia sẻ vị trí thực tế | xong | GPS foreground -> preview -> native share; bỏ công tắc giả SOS/Cài đặt; không cần backend mới |
| Rà soát lỗi và hồi quy | xong trong phạm vi local | Quyền/GPS sai-cũ/hủy/race; backend auth/RBAC/quota/data tests; admin lint/typecheck/test/build |
| Đóng gói | xong | Expo export iOS và Android thành công; không phải native build đã ký hoặc kiểm thử điện thoại |
| Ghi sổ bàn giao | xong | LOCATION_SHARING, TRANSLATION_SOURCES, OPTIMIZATION_REPORT, ACCEPTANCE và contracts |

### Bằng chứng kiểm tra phiên này

- Backend: lint sạch; **156/156 test** với MongoDB tạm và mock provider, không dùng Atlas.
- Mobile: lint/typecheck sạch; **124 test / 25 suites**; test nguồn offline, UI đổi chiều/response cũ và GPS/share.
- Admin: lint/typecheck sạch; **9/9 test / 4 files**, production build đạt.
- iOS export: `/tmp/betravel-share-ios-final-20260929`; Android: `/tmp/betravel-share-android-final-20260929` (artifact tạm, không commit).
- Metro in cảnh báo biến môi trường NO_COLOR/FORCE_COLOR trùng nhau; không có lỗi bundling. Không sửa thư viện chỉ để che cảnh báo môi trường.
- Lệnh thử `expo export --platform all` dừng vì thiếu `react-native-web`; đây là cấu hình mobile native hiện tại. Kiểm riêng hai nền tảng iOS/Android; chưa bổ sung hoặc chứng nhận mobile web.

### Điểm vào cho người/AI tiếp theo

- [Cách dùng và vận hành chia sẻ vị trí](LOCATION_SHARING.md): route `mobile/src/app/sos/share-location.tsx`; xử lý dữ liệu ở `features/sos/locationShare.ts`. Không streaming nền, không link thu hồi/hết hạn, không tự gửi tin.
- [Nguồn mở và kiến trúc dịch](TRANSLATION_SOURCES.md): UI `app/translate/index.tsx`, client `lib/api/translate.ts`, backend `services/translate.service.js`, resources `translation/vi-en.json`.
- Cấu trúc tổng thể ở bảng kiến trúc của phiên lịch sử ngay bên dưới vẫn áp dụng; không migration, không thêm collection hay npm dependency.
- Cần điện thoại iOS/Android/iPad để nghiệm thu native share, GPS approximate, timeout/chuyển nền, Zalo/SMS và phát âm. Cần build native mới để áp dụng chuỗi xin quyền iOS vừa sửa.
- Chưa đánh giá dịch tự do bằng provider thật; test mock chỉ chứng minh pipeline. Chưa kiểm Atlas/production hay dữ liệu SOS ngoài máy. Maps SDK key hiện là placeholder; link Google Maps của tính năng chia sẻ không cần key đó.
- npm audit vẫn chưa có kết quả mới: auto-review trước đó từ chối gửi metadata dependency tới registry. Không tự chạy lại để vượt hạn chế. Expo Doctor chưa có CLI local; không coi kết quả lịch sử là kết quả phiên này.
- Không xác nhận toàn hệ điều hành hoặc mọi lỗi có thể có; phạm vi đã rà là mã nguồn, cấu hình và kiểm thử ba workspace. Các phần cần dữ liệu/thao tác thật giữ trong ACCEPTANCE.

## Đợt QA (docs/07_QA_BugHunt.md) — chi tiết ở docs/QA_REPORT.md

| Phiên | Trạng thái | Ghi chú |
|---|---|---|
| QA-1 Pha 0 + Pha 1 + M01-M04 | xong | Nhánh `feature/qa-20260928`. Sửa 5 lỗi (2 S1 lộ PII/mật khẩu mặc định, 1 S2 xóa Country/Topic đang tham chiếu, 2 S3). Backend 174, mobile 95, admin 9 test xanh |
| QA-2 M05-M07 | xong | Sửa 10 lỗi: 3 S1 (guard bỏ sót 5 dạng định lượng; 2 bất biến RAG không có test bảo vệ -- phát hiện qua mutation testing), 5 S2 (lộ trường nội bộ bài luật, tìm `đ`, trộn embedding model, chat gửi trùng, bỏ qua needsOfficialHelp), 2 S3. Backend 198, mobile 99, admin 9 test xanh |
| QA-3 M08-M12 | xong | Sửa 4 lỗi: 1 S1 (mở app khi mất mạng --> SOS Hub trắng, nay cache quốc gia + màn dự phòng), 2 S2 (translate from/to không giới hạn vào prompt LLM; favorites lộ trường nội bộ bài luật), 1 S3 (backend cho trip tới nước coming_soon). Backend 211 (+1 todo nợ H-09.a), mobile 102, admin 9 |
| QA-4 M13-M15 | xong | Sửa 6 lỗi: 2 S2 (không có ErrorBoundary cấp route; admin xác minh hàng loạt điểm SOS/re-index không xác nhận), D17 admin hard-code quốc gia, 3 S3 (refresh lộ cờ `rotated` + fixture admin lệch; 7 chỗ gọi điện/link không bắt lỗi; màn hình import type từ @/mocks). Mọi fixture có backend + client. Backend 214 (+1 todo), mobile 111, admin 11 |
| QA-5 M16-M17 + Pha 3 + Pha 4 | xong | Sửa: PATCH incident/geo-alert xóa `steps`/`behaviorsToAvoid` (Zod 4 partial giữ default, phát hiện qua E2E); production fail fast khi AI mock/thiếu key/JWT ngắn; smoke test server.js; emoji/host/README; commit format riêng BASE-01. E2E 5 kịch bản + fuzz mọi route ghi (tự đề xuất vì 07 thiếu PHAN 6-7). Backend 227 (+1 todo), mobile 111, admin 11 |

**Đợt QA kết thúc.** Danh sách duy nhất các việc người cần làm/quyết định: `docs/QA_REPORT.md` mục 7.

Việc của người phát sinh từ QA-1 (chi tiết QA_REPORT mục 7): đổi ngay mật khẩu admin đã
seed; quyết định rewrite lịch sử git; chốt QA-D13 (SOS chưa xác minh), QA-M04-01 (đồ thị
trạng thái bài luật), QA-M04-03 (transaction publish); xác nhận partial unique index trên Atlas.
QA-2 thêm: chốt QA2-M06-04 (bí danh quốc gia -- "Ở Nhật..." hiện vẫn được trả lời bằng
luật KR) và QA2-M06-05; hợp đồng `public.legalArticle.json` đã bỏ trường nội bộ.
Thay đổi cấu hình: `SEED_ADMIN_PASSWORD` không còn giá trị mặc định -- để trống thì `npm run seed`
bỏ qua bước tạo admin.

## Lịch sử phiên 28/09 — bảo vệ dữ liệu và hoàn thiện favorites

Nhánh: `feature/audit-20260928`, tách từ `feature/trip-management` tại `bbe3378`.
Nhánh gốc ahead origin 18 commit trước phiên; không tự pull/rebase/push hoặc merge.

### Bàn giao phiên trước

Tiến độ mã nguồn và kiểm tra local: `[######] 6/6`.
Tiến độ phát hành/kiểm chứng ngoài máy: **xong một phần**, không phải 100% sản phẩm.

| Bước | Trạng thái | Bằng chứng |
|---|---|---|
| Đọc Docs, kiến trúc, nhánh và thay đổi có sẵn | xong | Working tree ban đầu sạch; đọc CLAUDE/AGENTS, audit, master plan, quy tắc, B9, contracts |
| Kiểm tra nền ba workspace | xong | Backend 145, mobile 85, admin 8 test; phát hiện 1 warning admin |
| Rà soát và sửa lỗi | xong trong phạm vi phiên | Favorites, incident/progress, GeoAlert, GPS/consent, dismiss, editor |
| Hoàn thiện phần không cần data mới | xong | Bộ lọc bài đã lưu thật + bản hiện hành; chống ghi đè workflow |
| Kiểm thử hồi quy/build local | xong | Backend 151, mobile 94, admin 9 test; lint/typecheck/build/export đạt |
| Ghi sổ và bàn giao | xong | Mục này, OPTIMIZATION_REPORT, ACCEPTANCE, contracts/fixture |

### Bản đồ cấu trúc để tiếp tục

| Thư mục | Trách nhiệm và đường đi chính |
|---|---|
| `backend/src/routes`, `validators`, `middleware` | Auth/RBAC, Zod body/query, rate limit trước controller |
| `backend/src/controllers`, `services`, `models` | Envelope --> nghiệp vụ --> Mongoose; không thêm workspace chung |
| `backend/src/rag` | Embedding/LLM provider, retrieval xác minh bài hiện hành, guard và fallback |
| `backend/test` | MongoDB tạm, mock provider, contract/RBAC/golden/hồi quy |
| `mobile/src/app`, `components`, `styles` | Expo Router, màn hình và design system hiện có |
| `mobile/src/lib/data.ts`, `lib/api`, `features` | Công tắc mock/thật, adapter API, hooks trạng thái và cache |
| `admin/src/pages`, `components`, `lib` | Trang quản trị, editor, React Query và API client |
| `contracts` | Nguồn API chung và fixture để kiểm cả backend/client |
| `docs`, `.github/workflows`, cấu hình deploy | Tiến độ/kiến trúc/QA; mới có workflow keepalive, chưa có CI test tự động |

### Những thay đổi trong phiên

1. Favorites chặn draft/pending_review/archived, location chưa verified,
   incident chưa published. Bookmark ẩn vẫn giữ trong DB, không xóa dữ liệu.
   Bài superseded chỉ trả metadata nhận diện, không trả nội dung pháp lý cũ;
   currentArticleId chỉ trỏ bản published + isCurrent. Contract/fixture cập nhật.
2. Bộ lọc bài đã lưu lấy bản công khai hiện hành theo quốc gia/chủ đề, gộp
   trùng theo slug. Bookmark cũ vẫn đánh dấu bản mới là đã lưu; bỏ lưu đúng ID
   cũ. Giữ nhánh mock và thêm trạng thái rỗng trên Explore.
3. Admin IncidentEditor không lấy refetch đè draft. Gửi updatedAt của bản
   bắt đầu sửa; backend kiểm bằng điều kiện nguyên tử trong UPDATE, stale
   trả 409. Sau lưu cập nhật revision mà vẫn giữ nội dung tiếp tục nhập.
4. Incident progress chỉ đọc/ghi workflow published; khi đọc lọc các chỉ số
   bước không còn tồn tại. Mobile chỉ chuyển NOT_FOUND thành null; lỗi mạng
   còn nguyên để UI báo lỗi/thử lại.
5. GeoAlert PATCH validate dữ liệu sau ghép, chặn area thiếu tâm/bán kính và
   ngày kết thúc trước ngày bắt đầu. API công khai bỏ bản ghi area cũ sai
   cấu trúc để không làm hỏng toàn danh sách. Không sửa DB thật.
6. GPS không đọc khi guest hoặc consent chưa tải; không poll khi app nền;
   bỏ kết quả cũ khi đổi consent/tài khoản/quốc gia. Tọa độ last-known quá
   5 phút không dùng; lúc đó chỉ tra cảnh báo cả nước. Không theo dõi nền.
   Banner tôn trọng tùy chọn safety. Đối chiếu Expo SDK 57 Location docs.
7. Dismiss cảnh báo chia theo tài khoản real, xếp hàng đọc-sửa-ghi tránh
   mất dấu đã đọc khi bấm liên tiếp; không nhận response của context cũ.
   Khóa dismiss cũ không rõ chủ sở hữu không được tự gán cho tài khoản mới.

### Kiểm chứng 28/09

- Backend: lint đạt; **151/151 test** (bao gồm 25 ca golden KR), MongoDB tạm,
  LLM/embedding mock. Test ban đầu trong sandbox bị EPERM mở cổng; chạy lại
  ngoài sandbox được phép và đạt. Không gọi Atlas/AI thật.
- Mobile: lint/typecheck đạt; **94/94 test, 21 suite**. Sửa cả timer GC trong
  test mutation để Jest kết thúc sạch, không dùng forceExit.
- Admin: lint không còn warning, typecheck đạt, **9/9 test**, build đạt.
  Test DOM chứng minh refetch không ghi đè draft và gửi đúng revision gốc.
- Expo export **iOS và Android đạt**, output tạm `/tmp/betravel-export-*-20260928`.
  Export `--platform all` không phù hợp: web thiếu react-native-web; phạm vi
  hiện tại là mobile native nên đã export riêng hai nền tảng, không thêm thư viện web.
- `git diff --check` đạt. Không sửa .env, không seed/migrate/ghi đè dữ liệu thật.
- npm audit **chưa kiểm được phiên này**: sandbox chặn mạng; auto-review từ
  chối chạy ngoài sandbox vì gửi metadata dependency tới npm registry.
  Cần người dùng cho phép trước khi thử lại. Không lấy số 0 advisory cũ làm
  kết quả mới. Expo Doctor chưa chạy: CLI không có local, npx lỗi DNS.
- Chưa thử thiết bị/GPS/gọi điện/map thật, chưa EAS build ký, chưa kiểm layout
  bằng screenshot trên nhiều kích thước; bundle/test không thay thế UAT.

### Việc tiếp theo còn làm được bằng code (chưa thực hiện)

- CI chạy lint/test/build ba workspace (hiện repo chỉ có keepalive).
- Thêm định danh/version ổn định cho bước incident: hiện lưu theo step.order,
  chỉ lọc bước bị xóa, chưa giải quyết việc admin đổi thứ tự nhưng giữ số bước.
- Mở rộng chống ghi đè đồng thời sang mọi loại CRUD admin. Incident updatedAt
  đang optional để không phá client cũ; client không gửi chưa được bảo vệ.
- Chat multi-turn, đo usage/tokens thật, tìm kiếm Atlas theo chunk vẫn chưa
  triển khai trong phiên; giữ nguyên các giới hạn ở mục bên dưới.
- Bộ lọc favorites fetch chi tiết từng slug (gộp trùng); cân nhắc phân trang
  khi số bookmark lớn. Chưa tự đổi contract sang batch endpoint.

Các quyết định lịch sử dưới đây giữ để truy vết; nếu mâu thuẫn, mục 28/09 này
là kết luận mới. Các dữ liệu pháp lý/SOS, key dịch vụ, UAT và deploy vẫn cần
người phụ trách như mục “Đang vướng”. Không khẳng định hệ thống không còn lỗi.

## Trạng thái hiện hành — đọc mục này trước

Các quyết định phía cuối là lịch sử theo ngày, không phải danh sách việc còn lỗi.
Kết luận mới ở phần này thay thế những ghi chú cũ mâu thuẫn với mã nguồn.

| Batch | Trạng thái | Ghi chú |
|---|---|---|
| B1 Auth thật | xong | Email hoặc số điện thoại + mật khẩu; refresh rotation, kiểm quyền hiện hành |
| B2 Content + Admin | xong | Kiểm duyệt, version, chống ghi đè, lọc HTML preview |
| B3 Public content + trips | xong | API thật, contract fixtures |
| B4 RAG + guardrails | xong | Truy hồi, cache theo bằng chứng, quota nguyên tử, fallback, golden test |
| B5 Chat + feedback | xong | Mobile đã có UI/API chat, feedback và lịch sử |
| B6 SOS | xong một phần | Mã nguồn đã triển khai; còn cần dữ liệu địa điểm được người phụ trách xác minh |
| B7 Incidents + dịch | xong | Backend + mobile + admin (A07 Workflow Builder) đã nối API thật |
| B8 Alerts + profile/favorites | xong | GeoAlert + favorites + preferences nối API thật; mobile không còn phụ thuộc `@/mocks/client` hay `@/mocks/fixtures` ở bất kỳ màn hình nào |
| B9 Hardening, build, demo/deploy | xong một phần | Seed/QA/security sweep/tài liệu bàn giao xong; ĐÃ chạy seed thật trên Atlas (xem "Đang vướng"); còn thiếu: triển khai thật (Render/Vercel/EAS), build ký, kiểm tra thiết bị thật |
| Rà soát 24/09 | xong | Các lỗi phát hiện trong phạm vi đã sửa và có kiểm tra; phần cần dữ liệu/thiết bị được tách riêng |

Tiến độ đợt rà soát: `[######] 6/6` — khảo sát, tái hiện, sửa, kiểm thử,
kiểm tra dependency/build, cập nhật tài liệu. Đây không phải phần trăm hoàn thành toàn sản phẩm.

## Kết quả kiểm tra phiên 24/09

- Backend: lint sạch; 110/110 test, bao gồm 25 ca golden KR và hồi quy mới.
- Mobile: lint/typecheck sạch; 74/74 test; Expo Doctor 21/21.
- Admin: lint/typecheck sạch; 8/8 test; production build thành công.
- Expo export iOS và Android: thành công, output tạm ngoài repo.
- Dependency: backend/admin 0 advisory; mobile đã vá 15 cảnh báo phụ thuộc từ
  2 advisory gốc (`uuid`, `decode-uri-component`), npm install báo 0 vulnerability.
- Không dùng DB Atlas thật, không gọi AI trả phí, không seed/publish dữ liệu trong phiên.
- Export bundle không tương đương thử GPS/cuộc gọi/MapView trên điện thoại hay EAS build đã ký.

## Những thay đổi cần người/AI tiếp theo biết

1. Giữ kiến trúc ba workspace độc lập, Express/service/model, Expo Router và
   design system hiện có. Đây là đợt sửa lỗi được người dùng yêu cầu trực tiếp;
   không triển khai thay B7/B8, không coi thiếu dữ liệu thật là lỗi cần tự bịa.
2. `validateQuery` dùng property riêng trên request để giữ kết quả Zod; bỏ
   cách mutate getter Express 5. JSON/ID sai trả 400; xung đột DB trả 409.
3. Backend kiểm role/isActive hiện tại trong DB ở mỗi request được xác thực.
   Refresh chỉ một request thắng CAS; OTP/reset token dùng một lần và không
   mở khóa tài khoản đã vô hiệu hóa. Client giữ token khi mạng/5xx tạm lỗi.
4. Quota global chuyển sang `aiquotas` (khóa ngày UTC, TTL); khởi tạo theo
   AiEvent đã có trong ngày để không reset ngân sách khi triển khai. User quota
   vẫn ở `users.aiUsage`. Cả hai tăng có điều kiện nguyên tử tại DB.
5. Job có lease token, heartbeat, nhận lại job `running` quá hạn, giới hạn
   attempts và backoff. Job không có handler báo failed, không giả thành công.
6. RAG giới hạn focusArticle cùng quốc gia; kiểm bài/phiên bản trước khi tính
   ngưỡng. Cache dùng chunkId, marker có thứ tự, nội dung, updatedAt, model;
   tự kiểm expiresAt và upsert khi request đồng thời. Giữ confidence/needsOfficialHelp.
7. Lỗi embedding/search cũng trả fallback. Các request provider có timeout
   `AI_PROVIDER_TIMEOUT_MS=30000` (đã thêm .env.example). Guard so số tiền
   với nguồn được dẫn và chặn khối định lượng thiếu marker; vẫn không phải
   bộ chứng minh ngữ nghĩa pháp lý, không hứa chính xác tuyệt đối.
8. Bài đã publish/supersede/archive không sửa nội dung trực tiếp: tạo bản nháp
   mới hoặc đổi về trạng thái biên tập. Quốc gia/slug không đổi giữa phiên bản.
   Điều kiện updatedAt đi cùng lệnh ghi DB. Admin giải thích ngay tại nút lưu.
9. CSV kiểm từng dòng bằng cùng schema tạo địa điểm; dòng sai không hỏng cả
   file. PATCH không được xóa hết phone/website. Nguồn/website chỉ HTTP(S).
10. Admin dùng DOMPurify sau Markdown; bản nháp chia theo tài khoản/bài,
    không autosave đè bản đang chờ khôi phục, remount khi đổi bài. Query cache
    được xóa khi đổi tài khoản ở cả admin/mobile.
11. Mobile sửa refs khi render ở form chuyến đi. Favorites/liên hệ/giấy tờ
    lưu theo email + mode mock/real và chia sẻ state giữa màn hình.
    Khóa local cũ không có chủ sở hữu không tự chuyển sang tài khoản đang mở
    (tránh gán nhầm dữ liệu). Không xóa dữ liệu cũ; chưa có đồng bộ cloud.
12. SOS không báo mở cửa/chia sẻ vị trí giả; không chỉ đường tới 0,0 khi thiếu
    tọa độ; dùng địa chỉ có sẵn hoặc vô hiệu hóa thao tác thiếu dữ liệu. Thông
    báo xin GPS nói đúng việc gửi tọa độ tới API tìm điểm gần, không theo dõi nền.
    Cache tách bộ lọc và tính lại khoảng cách khi người dùng di chuyển.
13. Quốc gia mặc định chọn từ dữ liệu active, không hard-code JP. URL API được
    khai báo rõ sẽ ưu tiên cả dev; bỏ URL để suy IP LAN từ Metro. Node >=22.13.
14. Mobile giữ Expo 57/React 19.2.3. Pin test-renderer 1.2.0 (React 19.2),
    override uuid 11.1.1 và decoder 0.5.0. `patch-package` sửa đúng một dòng
    CommonJS query-string để đọc `.default` của decoder ESM; postinstall tự áp.
    Jest cho phép transform decoder. Có test parse/stringify và bundle thật.
15. Đính chính tài liệu cũ: `login-phone.tsx` hiện đăng nhập bằng số điện thoại
    + mật khẩu thật; OTP SMS và Google UI chưa làm. Chat và SOS đã nối API.

## Đang vướng — cần dữ liệu, tài khoản hoặc thiết bị thật

- Theo sổ B6 trước phiên này, chưa có điểm SOS thật đã xác minh; cần người
  phụ trách cung cấp tọa độ, số liên lạc, xác minh địa điểm/giờ mở cửa.
  Mẫu: `docs/sos-locations-template.csv`. Không suy đoán để điền cho đủ.
- Kho pháp lý KR cần rà soát chuyên môn, bổ sung nguồn/ngày hiệu lực và duyệt
  các bài draft. Số lượng trong sổ lịch sử chưa được truy vấn lại trên Atlas.
- Google OAuth/SMTP/Android Maps key và cấu hình quota cần kiểm chứng trên
  tài khoản dịch vụ thực tế trước phát hành. Không in hay thay secret trong phiên.
- Tên database trong MONGODB_URI cần người sở hữu xác nhận nếu muốn đổi;
  giữ nguyên cấu hình đang có, không di chuyển dữ liệu.
- Cần nghiệm thu người dùng trên thiết bị thật: gọi điện, GPS/từ chối quyền,
  MapView khi mất mạng và thao tác soạn/khôi phục bản nháp trong trình duyệt.
- **(B9) Đã chạy `npm run seed` VÀ `npm run seed:demo` thật trên Atlas trong
  phiên này** (không phải test cô lập, dữ liệu còn tồn tại thật): tạo tài
  khoản admin seed theo `SEED_ADMIN_EMAIL` (mật khẩu mặc định lấy từ
  `SEED_ADMIN_PASSWORD` -- **PHẢI đổi ngay**, không ghi mật khẩu vào tài liệu
  public), 5 `IncidentType` (published),
  25 `QuickPhrase` KR (published). KHÔNG tạo `support_locations`/`geo_alerts`
  (giữ nguyên quyết định không bịa dữ liệu an toàn thời gian thực). Phát
  hiện thêm: Atlas đã có sẵn 4 countries/6 topics/8 legal articles (draft) từ
  trước, và 3 tài khoản do người dùng tạo (không liệt kê định danh trong repo
  public) -- không đụng tới các bản ghi này.
- **(B9) Chưa triển khai thật** lên Render/Vercel/EAS -- `docs/DEPLOY.md`,
  `backend/render.yaml`, `mobile/eas.json`, `.github/workflows/keepalive.yml`
  đã viết đầy đủ nhưng cần tài khoản dịch vụ thật của người phụ trách để
  thực thi. Xem `docs/ACCEPTANCE.md` AC-12.
- **(B9) Chưa kiểm tra responsive trên thiết bị thật** (iPhone SE 375px,
  Android thật) -- không có thiết bị/simulator trong môi trường này. Xem
  `docs/ACCEPTANCE.md` AC-11.

## Giới hạn còn lại / công việc tiếp theo

- B7 và B8 đã xong (xem "Quyết định phát sinh (B7)" và "(B8)"). Còn lại B9
  (hardening/seed/build/demo/deploy).
- Chat chưa dùng lịch sử làm ngữ cảnh multi-turn; chi phí/tokens analytics
  chưa tích hợp usage thật. Tìm kiếm công khai còn regex trên bài, chưa thay
  bằng Atlas Search. Không đánh dấu các hạng mục này là đã hoàn thành.
- Atlas Search/Vector Search không chạy được trên MongoDB memory test;
  cần kiểm chứng index thật khi triển khai. Golden mock kiểm pipeline,
  không đo chất lượng hay độ chính xác của model thật.
- Lưu trữ cục bộ chưa mã hóa giấy tờ theo cơ chế vault; hiện chỉ lưu trạng
  thái/ghi chú như phạm vi MVP, không ảnh tài liệu. Chưa đồng bộ nhiều máy.
- (B7) `POST /api/translate` nhận `mode:'text'|'phrase'` theo đúng contract
  nhưng service/prompt CHƯA phân biệt hành vi giữa hai mode -- trường tồn tại
  để tương thích tương lai (vd `phrase` có thể rút gọn/formal hơn), hiện xử
  lý giống hệt nhau. Không đánh dấu đây là đã hoàn thiện phân biệt 2 mode.
- (B8) `usePollAlerts` kiểm tra vị trí thay đổi bằng nhịp định kỳ 5 phút (đọc
  lại vị trí hiện tại mỗi lần), KHÔNG `watchPosition` liên tục để phát hiện
  đúng lúc di chuyển >500m -- xem quyết định 41. Trường hợp di chuyển nhanh
  giữa 2 lần đọc có thể trễ tối đa 5 phút trước khi nhận cảnh báo khu vực mới.
- (B8) "Chia sẻ vị trí khi SOS" (gửi liên hệ khẩn cấp) vẫn là toggle cục bộ,
  CHƯA nối với `preferences.locationConsent` hay backend nào -- hai khái niệm
  tách biệt (xem quyết định 42), tính năng "gửi vị trí cho liên hệ khẩn cấp"
  chưa có trong phạm vi B8.
- (B7) CTA loại `ai` chỉ prefill MỘT câu hỏi cố định vào ô nhập của màn hình
  chat (không kèm ngữ cảnh nhiều lượt của bước đang xem) -- giống hạn chế đã
  ghi ở trên về chat chưa dùng lịch sử làm ngữ cảnh multi-turn.
- Sau khi dữ liệu B6 đủ (điểm SOS đã xác minh): nghiệm thu B6 hoàn toàn.
  B9 còn demo/deploy, build ký và kiểm tra người dùng thực tế; không coi
  bundle export là APK/IPA.

## Lịch sử quyết định

Xem [PROGRESS_HISTORY.md](PROGRESS_HISTORY.md). Nội dung cũ được giữ nguyên để truy vết.

## Quyết định phát sinh (UI redesign 2026-10-06)

- Design tokens mobile đổi theo FRONTEND_UI_SPECIFICATION.md: Brand Blue `#1677FF`, nền `#F5F9FF`,
  chữ `#102A43`, SOS `#EF4444`; font Plus Jakarta Sans + JetBrains Mono (số liệu); bo góc 16/24.
  Thêm biến thể `*-strong` cho chữ xanh lá/vàng/đỏ vì màu gốc của spec không đủ tương phản trên nền trắng.
- Emoji trong spec (cờ, dấu tích) thay bằng icon `lucide-react-native` (Rule 12).
- Be.Travel AI tạm khóa bằng màn chờ theo quyết định của người dùng: `EXPO_PUBLIC_AI_CHAT_ENABLED`
  (mặc định false). Code chat chuyển sang `src/features/chat/ChatScreen.tsx`, không xóa.
- Người dùng cho phép publish 2 bài KR mẫu (`qua-han-luu-tru`, `bang-lai-nuoc-ngoai`) để xem giao diện:
  `npm run seed:samples`. Chỉ dùng bài đã có nguồn `gov`, không tạo nội dung mới; `reviewNote` ghi rõ
  CHƯA qua đối chiếu nguồn bởi người thật. Hai bài chưa được reindex cho RAG (AI đang khóa).

## Nợ kỹ thuật (UI redesign)

- Spec yêu cầu 11 chuyên mục pháp lý; DB hiện có 6 chủ đề KR. Cần seed thêm khi có bài có nguồn.
- Câu trả lời AI 4 phần cần đổi contract `ChatAnswer` + prompt/guard -- làm khi mở lại AI.
- Mẫu câu dịch chưa có trường danh mục (7 tình huống); alerts chưa có mức "Medium".
