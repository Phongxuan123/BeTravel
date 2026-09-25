# TIEN DO BE.TRAVEL

Cập nhật lần cuối: 2026-09-25 · Phiên: B8 Alerts + Profile/Favorites
Nhánh: `feature/b8-alerts-profile-favorites`.

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
| B9 Hardening, build, demo/deploy | xong một phần | Đã sửa lỗi và kiểm tra bundle; chưa ký native build, triển khai, kịch bản demo |
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

## Lịch sử quyết định (giữ để truy vết)

Các ghi chú "mới", "chưa có", "đang vướng" dưới đây thuộc thời điểm lịch sử.
Đọc trạng thái hiện hành phía trên trước khi lên kế hoạch.

## Quyết định phát sinh

1. **[DA CHOT theo phan hoi nguoi dung] Phone bắt buộc khi đăng ký.** Bản đầu
   B1 tự ý đổi thành optional vì UI thiếu ô nhập — người dùng yêu cầu giữ bắt
   buộc và bổ sung UI thay vì nới lỏng backend. Đã khôi phục
   `phone: vietnamPhoneSchema` (bắt buộc) ở `auth.validator.js`, khôi phục
   kiểm trùng phone vô điều kiện ở `auth.service.js`. Thêm ô "Số điện thoại"
   vào `register.tsx` (giữa Email và Mật khẩu), validate cùng định dạng với
   backend (`^(0|\+84)[0-9]{9}$`). Chữ ký `register()` trong `AuthContextValue`
   đổi thành `(name, email, password, phone)`.
2. **[DA CHOT theo phan hoi nguoi dung] `login-phone.tsx` đổi thành màn hình
   chặn tĩnh** "Tính năng đang phát triển" với nút "Đăng nhập bằng email" thay
   vì giữ luồng nhập SĐT + OTP giả. Không còn gọi `loginWithPhone` — hàm này đã
   bị XOÁ khỏi `AuthContextValue` (không còn nơi nào dùng, dọn theo Rule 10).
   Lý do gốc không đổi: OTP SMS thật ngoài phạm vi MVP. Lưu ý: màn hình hiện
   hướng người dùng dùng "email" (không phải nút "Đăng nhập Google" — mobile
   CHƯA có UI cho Google Sign-In, dù backend đã hỗ trợ `/auth/google`). Nếu
   muốn hướng đúng nghĩa "dùng Google", cần làm thêm một hạng mục riêng: tích
   hợp `expo-auth-session` + OAuth client ID cho iOS/Android (cần thêm thông
   tin từ Google Cloud Console) — chưa làm ở B1, đề xuất cân nhắc ở batch sau
   nếu cần.
3. **`EXPO_PUBLIC_USE_MOCKS=true` cũng làm auth chạy giả** (không chỉ nội
   dung). `lib/auth.tsx` tách thành `useMockAuthValue` / `useRealAuthValue`
   theo đúng flag — đây là đường lùi khi demo lỗi, phải bao trùm toàn bộ app
   kể cả đăng nhập, không riêng nội dung.
4. **Test backend dùng `mongodb-memory-server`** thay vì Atlas thật. Atlas
   bắt buộc cho Vector Search (từ B4) nhưng auth/CRUD thường không cần —
   test nhanh, chạy offline, không tốn kết nối Atlas M0 vốn đã eo hẹp.
5. **Rate limit middleware `skip` trong `NODE_ENV=test`.** Test gọi
   `/register`/`/login` hàng chục lần trong một tiến trình, dùng chung state
   rate-limit theo IP — không tắt thì các test chạy sau bị 429 giả.
6. **`REFRESH_ROTATION_GRACE_SECONDS` mặc định trong môi trường test là 1
   giây** (không phải 10 giây như production) vì `core/env.js` đóng băng giá
   trị này lúc import đầu tiên — test không đổi được giữa chừng bằng cách gán
   lại `process.env`. Test "ngoài cửa sổ ân hạn" chờ hơn 1 giây thay vì đổi env.

### B2

7. **Publish thiếu điều kiện trả `409 CONFLICT`, không phải `422` như văn bản
   prompt B2 nói.** `ErrorCode` là enum đóng 10 giá trị (CLAUDE.md Phần 4.1),
   không có mã nào ánh xạ sang HTTP 422. Dùng `CONFLICT` (409) — đúng ngữ
   nghĩa hơn "422 Unprocessable Entity" cho một xung đột trạng thái nghiệp vụ,
   và giữ đúng enum đã chốt. Theo luật "prompt vs CLAUDE.md, CLAUDE.md thắng".
8. **AuditLog ghi tường minh ở cuối mỗi controller admin, KHÔNG dùng Express
   middleware "bắt" response chung.** Lý do: middleware chung không biết chính
   xác before/after của từng loại entity mà không đọc lại DB (thêm round-trip
   và vẫn có thể sai nếu response không phải JSON thuần). Gọi tường minh ở
   đúng nơi đã có before/after là cách chắc chắn nhất để "không bao giờ bị bỏ
   sót" — xem comment trong `services/auditLog.service.js`.
9. **Countries/Topics/Locations dùng chung một factory CRUD**
   (`core/adminCrudController.js` phía backend, `lib/resource.ts` phía admin)
   — ba resource có cùng khuôn list/get/create/update/remove + audit log,
   gom lại theo Rule 3 (DRY) thay vì lặp lại 3 lần gần như giống hệt nhau.
   `LegalArticle` KHÔNG dùng factory vì có logic riêng (máy trạng thái,
   optimistic concurrency, versioning).
10. **Admin SPA dùng Tailwind v4** (`@tailwindcss/vite`, không phải v3 +
    postcss.config) — dự án mới, không có ràng buộc tương thích ngược, cấu
    hình v4 đơn giản hơn nhiều.
11. **Admin SPA giữ nguyên `oxlint`** (linter mặc định của Vite scaffold mới)
    thay vì đổi sang ESLint như backend/mobile — dự án admin là mới hoàn
    toàn, không có "convention có sẵn" để tuân thủ (Rule 5 chỉ áp dụng khi
    project đã có config), và oxlint chạy nhanh hơn, đủ dùng cho quy mô này.
12. **Refresh token phía admin lưu ở `localStorage`**, không phải
    `httpOnly cookie` riêng và cũng không dùng `expo-secure-store` như mobile.
    Chấp nhận rủi ro XSS thấp hơn mức cần thiết cho app công khai vì đây là
    công cụ nội bộ, chỉ admin dùng — nhưng `apiClient.ts` vẫn gửi
    `credentials:'include'` nên nếu backend bật `AUTH_TRANSPORT=cookie` thì
    cookie httpOnly cũng hoạt động song song, không cần đổi code.

### B3

13. **Search tách theo TỪNG TỪ (AND), không so khớp nguyên cụm.** Prompt B3
    mô tả `$regex` trên `titleNorm/summaryNorm`, nhưng so khớp nguyên cụm quá
    cứng ("phat vape" không khớp "Mức phạt ... (vape)" vì hai từ không liền
    nhau). Tách `q` thành từng từ, MỖI từ phải xuất hiện ở titleNorm hoặc
    summaryNorm (không cần liền kề) — vẫn dùng `$regex` như prompt yêu cầu,
    chỉ đổi cách ghép điều kiện. Xem `publicContent.service.js#searchArticles`.
14. **`titleNorm`/`summaryNorm` tính lại tự động trong hook `pre('save')` của
    `LegalArticle`**, không tính thủ công ở service — đảm bảo không bao giờ
    lệch với `title`/`summaryVi` hiện tại dù sửa qua đường nào (admin CRUD,
    script seed, hay sau này qua job).
15. **`Trip` model dùng partial unique index `{userId}` where `isCurrent:true`**
    — cùng mẫu phòng thủ với `LegalArticle` (Phần B2, quyết định gốc ở
    `docs/00_...`). `createTrip` LUÔN đặt `isCurrent:false` (giống hệt hành vi
    `mocks/client.ts` hiện có) — người dùng tự đặt "chuyến đi chính" qua
    `PUT .../:id/current`; đây KHÔNG phải bug, là parity có chủ đích với mock.
16. **Sửa 3 file KHÔNG phải "màn hình" nhưng chặn hoàn toàn việc nối API
    thật:** `lib/countryContext.tsx`, `app/trips/index.tsx`,
    `app/trips/new.tsx` đều import thẳng `mocks/fixtures/countries` thay vì đi
    qua `lib/data.ts` — nghĩa là dù bật `EXPO_PUBLIC_USE_MOCKS=false`, TOÀN BỘ
    thông tin quốc gia trong app (kể cả số khẩn cấp, đại sứ quán) vẫn luôn là
    dữ liệu mock. Đây là bug thật (không phải khác biệt cosmetic), sửa lại
    dùng `fetchCountries()` từ `lib/data.ts` qua React Query — không đổi UI/
    logic hiển thị nào khác trong 3 file này.
17. **`region`/`currentCity`/`embassy.openTime,closeTime,distanceKm` ở mobile
    Country KHÔNG có trong model backend** (`docs/00_...` Phần C.2 không định
    nghĩa các field này — chúng là nhãn trình bày UI cũ của bản mock). Xử lý ở
    `lib/api/adapters.ts#adaptCountry`: `region`/`currentCity` tra theo bảng
    tĩnh nhỏ (4 nước KR/JP/TH/SG), `embassy.openTime/closeTime/distanceKm` để
    rỗng/0 thay vì bịa số (cần vị trí người dùng thật, dự kiến B6/B8).
    `regulationsCount` là SỐ THẬT (đếm bài `published+isCurrent` mỗi nước,
    tính ở `publicContent.service.js`), không phải số tĩnh như mock cũ.
18. **`trips/new.tsx` bước 1 chặn chọn quốc gia `coming_soon`** (disable +
    badge "Sắp ra mắt") — đúng yêu cầu DoD B3 "xử lý country chưa hỗ trợ, hiện
    trạng thái rõ ràng, không lỗi". Đây là thay đổi UI có chủ đích theo đúng
    mục 12 của prompt B3, không phải mở rộng phạm vi tự ý.
19. **`iconKey` của Topic (enum đóng 6 giá trị ở mobile) suy ra từ `topicSlug`
    qua bảng tĩnh trong adapters.ts**, không đọc field `icon` tự do của
    backend (dành cho admin nhập, không đảm bảo khớp enum). `lao-dong` và
    `hai-quan` tạm dùng chung icon `documents` vì mobile chưa có icon riêng
    cho hai chủ đề này.

### B4 (23/09/2026)

26. **MockEmbedding không phải vector ngẫu nhiên mà là bag-of-words băm từ
    (djb2) có loại bỏ ~90 từ chức năng tiếng Việt phổ biến** (xem
    `rag/embedding/mock.embedding.js`) rồi chuẩn hoá L2 — 2 đoạn text càng
    chung nhiều từ ĐẶC TRƯNG càng có cosine similarity cao. Không lọc từ chức
    năng thì mọi bài luật (đều nói về "người Việt", "Hàn Quốc", "quy định")
    có cosine similarity cao giả tạo bất kể chủ đề, golden test không phân
    biệt được must_answer/must_refuse. Đây là mô phỏng hành vi hạ trọng số từ
    phổ biến (IDF thấp) của embedding thật, không phải "gian lận" để test qua.
27. **Ngưỡng RAG cho môi trường TEST được hạ riêng** (`RAG_MIN_TOP_SCORE=0.27`,
    `RAG_MIN_SOFT_SCORE=0.2`, `RAG_MIN_CHUNKS=1` trong `test/setup.js`, cùng
    mẫu với `REFRESH_ROTATION_GRACE_SECONDS` ở B1) — ngưỡng mặc định
    0.62/0.55 trong `.env.example` được hiệu chỉnh cho hình học cosine của
    Gemini embedding thật, không áp dụng được cho MockEmbedding (đo thực tế
    qua smoke test Atlas: câu hỏi đúng chủ đề chỉ đạt ~0.19–0.65 tuỳ độ trùng
    từ vựng). Ngưỡng production KHÔNG đổi.
28. **`chat.service.js` tự phát hiện câu hỏi nhắc tên một quốc gia KHÁC với
    quốc gia của phiên chat, chặn TRƯỚC cả retrieval** (không để LLM tự quyết
    định) — deterministic, không tốn chi phí gọi LLM, và không phụ thuộc chất
    lượng provider để tuân thủ đúng quy tắc 5 của system prompt (CLAUDE.md
    mục 4.2). Phát hiện bằng so khớp chuỗi đã chuẩn hoá (`normalizeVi`) với
    tên các quốc gia khác trong DB, không phải suy luận ngữ nghĩa.
29. **Golden test dùng LẠI chính nội dung 8 bài luật KR trong
    `scripts/seed-content.js`** (export `KR_ARTICLES`/`buildBodyMd`, guard
    `if (process.argv[1] && import.meta.url === pathToFileURL(...).href)` để
    import không tự chạy `run()`) thay vì bịa một bộ dữ liệu test song song —
    Rule 3 (DRY), và tránh hai nguồn "sự thật" về nội dung KR lệch nhau.
30. **[BUG THẬT, phát hiện khi viết golden test]** Guard ban đầu dùng
    `` `file://${process.argv[1]}` `` để tự phát hiện "đang chạy trực tiếp
    hay bị import" — vỡ trên Windows vì đường dẫn có khoảng trắng
    (`K9 WDP`) và dùng `\` thay vì `/`. Sửa bằng `pathToFileURL()` (Node
    `node:url`) thay vì tự ghép chuỗi — phát hiện được nhờ `npm run seed`
    không in gì ra sau khi thêm guard, đã chạy lại xác nhận in đúng log
    "[bo qua] ..." như cũ.
31. **`bodyMd` của 8 bài luật KR được viết lại có cấu trúc heading**
    (`## Tổng quan` / `## Điểm cần lưu ý` / `## Trường hợp ngoại lệ` / `## Lưu
    ý cho người nước ngoài`) thay vì chỉ là bản sao `summaryVi` — trước đó
    không chunk được gì có ích (`rag/chunking.js` cắt theo heading markdown).
    Script seed CHỈ backfill bodyMd khi phát hiện còn đúng placeholder cũ
    (`bodyMd === summaryVi`), không ghi đè nếu admin đã tự sửa qua Portal. Đã
    chạy thật trên Atlas — cả 8 bài (kể cả 2 bài `published`) đã có bodyMd mới.
32. **Smoke test Gemini thật (lần 1) thất bại: key được cấp trả về `401
    ACCESS_TOKEN_TYPE_UNSUPPORTED`** — định dạng key (`AQ.Ab8...`) không phải
    API key chuẩn của Gemini Developer API (thường bắt đầu `AIzaSy...`). Toàn
    bộ pipeline vẫn được xác nhận chạy đúng end-to-end bằng `LLM_PROVIDER=mock`
    + `EMBEDDING_PROVIDER=mock` qua job worker thật trên Atlas (reindex 2 bài
    published, sinh đúng số chunk, gọi `/api/chat/...` trả lời có trích dẫn
    đúng bài). `.env` đã trả về `mock`/`mock` sau khi test.
33. **Smoke test Gemini thật (lần 2, key đúng định dạng) thành công** —
    xác nhận key `AIzaSy...`. Phát hiện `LLM_MODEL=gemini-2.5-flash` (default
    cũ) bị Google trả `404` với key mới ("no longer available to new users"),
    đổi default sang `gemini-3.6-flash` (model còn hoạt động, xác nhận bằng
    gọi REST thật) ở `backend/.env` và `backend/.env.example`. Chốt để
    `.env` chạy `LLM_PROVIDER=gemini`/`EMBEDDING_PROVIDER=gemini` làm mặc định
    dev thay vì mock, vì mock chỉ bắt buộc cho code/test/CI theo CLAUDE.md
    §4.1, không bắt buộc cho `.env` cục bộ khi đã có key thật hoạt động.
    Chi tiết ở "Đang vướng".

### B5 (Chat mobile + feedback, 23/09/2026)

34. **`askLegalAssistant()` giữ NGUYÊN kiểu trả về `Promise<ChatAnswer>`** (đúng
    spec B5 mục 1) dù cần trả thêm `sessionId`/`messageId` cho màn hình dùng ở
    feedback/báo sai — giải quyết bằng 2 getter riêng
    `getActiveChatSessionId()`/`getLastChatMessageId()` (`lib/api/chat.ts`),
    đọc ngay sau khi `askLegalAssistant()` resolve. An toàn vì mỗi lượt hỏi
    luôn `await` tuần tự, input bị khoá trong lúc chờ — không có race.
35. **Disclaimer bị lặp nếu không xử lý**: backend (`rag/guard.js`) gắn cố định
    `\n\n---\n${DISCLAIMER}` vào CUỐI câu trả lời thật, còn màn hình chat đã có
    disclaimer cố định riêng ở chân khung chat (spec mục 5). `chat.ts` cắt bỏ
    khối này (`stripTrailingDisclaimer`) trước khi hiển thị, tránh hiện 2 lần.
36. **Quản lý session bằng state module-level trong `lib/api/chat.ts`**, không
    phải Context/Redux — mở màn hình chat tự tiếp tục phiên gần nhất của quốc
    gia đang chọn (gọi `GET /chat/sessions`, lọc theo `countryCode`, lấy phiên
    mới nhất vì backend đã sort `updatedAt desc`); CTA "Hỏi AI về bài này"
    (có `focusArticleId`) luôn bắt đầu phiên MỚI thay vì tiếp tục phiên cũ,
    vì câu hỏi đó tập trung vào 1 bài luật cụ thể, trộn vào lịch sử cũ sẽ gây
    nhiễu ngữ cảnh.
37. **Module feedback (`Feedback` model, `/api/feedback`, A08) TÁCH RIÊNG với
    `ChatMessage.feedback`** (thumbs nhanh, không note, đã có từ B4) — thumbs
    lên/xuống chỉ ghi 1 field, còn "Báo sai" cần note + vào hàng đợi cho đội
    nội dung xem xét (câu hỏi, câu trả lời, chunk đã truy hồi kèm score).
    `targetId` được xác minh thuộc đúng user gọi (qua `sessionId.userId`),
    không tin client — chặn 1 user báo cáo/spam trên tin nhắn người khác.
38. **`AiEvent` thêm field `question`** (lưu nguyên văn, không chỉ hash) — "Top
    câu hỏi bị fallback" (A01 Dashboard) cần hiển thị được cho đội nội dung
    đọc, hash một chiều không dùng được cho việc này.
39. **[BUG THẬT, phát hiện qua smoke test Atlas] `validateQuery` middleware
    không thực sự coerce được giá trị vào `req.query`** — thực nghiệm xác nhận
    `req.query === req.query` là `false` trong Express bản đang dùng (mỗi lần
    đọc `req.query` trả về MỘT OBJECT MỚI), nên `Object.assign(req.query, parsed)`
    trong `validate.middleware.js` ghi vào một bản sao rồi mất ngay — controller
    đọc `req.query` sau đó luôn thấy giá trị string gốc chưa qua coerce. Bug này
    có từ B2 (dùng chung cho mọi `validateQuery`) nhưng vô hại tới giờ vì mọi
    nơi khác hoặc tự parse lại (`pagination.js#parsePagination` dùng
    `Number.parseInt` riêng) hoặc chỉ dùng field kiểu string. Lộ ra lần đầu ở
    `GET /admin/analytics/overview?days=` (field `days` trả về `"7"` thay vì
    `7`). Sửa CỤC BỘ trong `adminAnalytics.controller.js` (tự `Number()` lại,
    không tin middleware) để không đụng vào file dùng chung — xem "Nợ kỹ thuật"
    để sửa gốc ở B9.
40. **[BUG THẬT] `topFallbackQuestions` hiện `question: null`** cho các
    `AiEvent` cũ tạo TRƯỚC khi thêm field `question` (dữ liệu smoke test B4) —
    filter `question: { $ne: "" }` không loại được trường hợp field bị THIẾU
    HẲN (khác với rỗng). Sửa thành `{ $exists: true, $ne: "" }`.
41. **Sửa 2 lần dùng `{ new: true }` (API cũ, phát cảnh báo deprecated) thành
    `{ returnDocument: "after" }`** ở `chat.service.js#setMessageFeedback`
    (file B5 có đụng tới, dù code cũ từ B4) và `feedback.service.js` mới, để
    đồng bộ 1 kiểu trong cùng codebase thay vì để 2 API khác nhau cho cùng một
    việc.

### B6 (SOS locations + map, 24/09/2026)

42. **Validate "publish location" bắt buộc `address` + ÍT NHẤT 1 trong
    `phone`/`website`** (`locationCreateSchema.refine`, tách khỏi
    `locationBaseSchema` để `locationUpdateSchema`/`.partial()` không bị kẹt
    theo ràng buộc refine của Zod) — đúng yêu cầu prompt B6 mục 3. Sửa kèm test
    `admin.test.js` cũ (tạo location không có `address`/`phone`) cho khớp quy
    tắc mới.
43. **Bulk import CSV xử lý TỪNG DÒNG độc lập, dòng lỗi bị bỏ qua kèm lý do
    thay vì làm hỏng cả file** (`bulkImportLocations`) — dữ liệu CSV do người
    tự gõ tay, khả năng cao có vài dòng lỗi; "tất cả hoặc không gì" sẽ buộc
    sửa lại toàn bộ file chỉ vì 1 dòng sai.
44. **Public `/support-locations/nearby` không tự tin `req.query.lat/lng/...`
    đã là number sau `validateQuery`** — áp dụng đúng cách né bug đã ghi ở
    quyết định 39 (B5): tự `Number()` lại trong controller.
45. **`/support-locations/nearby` sắp xếp theo KHOẢNG CÁCH tăng dần là chính,
    `verified` chỉ là tiêu chí phụ khi bằng khoảng cách** — đọc sát nghĩa đen
    câu spec "sắp xếp tăng dần. verified=true ưu tiên", và vì tình huống SOS
    thì điểm THẬT SỰ gần nhất quan trọng hơn nhãn "đã kiểm chứng".
46. **Không có điểm trong bán kính → 1 lần fallback KHÔNG giới hạn khoảng
    cách (toàn bộ quốc gia)**, không phải vòng lặp mở rộng dần nhiều lần —
    đơn giản hơn (Rule 9 KISS) mà vẫn đúng yêu cầu "SOS không được phép
    'không tìm thấy gì'".
47. **[BUG THẬT, phát hiện qua test] `$geoNear` báo lỗi "requires a 2d or
    2dsphere index"` khi chạy test đầu tiên** — Mongoose xây index nền
    (`autoIndex`) không đồng bộ với `mongoose.connect()`, nên test gọi
    `$geoNear` ngay sau khi kết nối có thể chạy TRƯỚC khi index dựng xong.
    Sửa bằng `await SupportLocation.init()` trong `before()` của
    `supportLocation.test.js` trước khi test.
48. **`askLegalAssistant`-style "cùng chữ ký + mở rộng optional" áp dụng lại
    cho `fetchSupportLocations`/`fetchNearbyLocations`** (`lib/api/sos.ts`) —
    nhất quán với quyết định 34 (B5).
49. **Cache offline lưu Ở TẦNG DATA (`lib/api/sos.ts`), không phải ở màn
    hình** — `fromCache?: boolean` là field mở rộng optional trên envelope,
    màn hình chỉ đọc cờ này để hiện banner, không tự quản lý AsyncStorage.
50. **Khoảng cách đại sứ quán ở SOS Hub (`sos/index.tsx`) tính bằng Haversine
    phía client** thay vì gọi lại `/support-locations/nearby` — dữ liệu
    `Country.embassy` là sub-document riêng trên `Country`, KHÔNG phải một
    `SupportLocation`; hợp nhất 2 mô hình này là thay đổi kiến trúc lớn hơn
    phạm vi B6, để dành cho batch sau nếu cần. Giải quyết đúng phần đã bị
    flag ở quyết định 17 ("dự kiến B6").
51. **[BUG THẬT, phát hiện qua test tự viết] `Number('')` bằng `0`, không
    phải `NaN`** trong `admin/src/lib/csv.ts#parseLocationsCsv` — dòng CSV bỏ
    trống cột `lat`/`lng` bị gán nhầm toạ độ `[0,0]` ("null island") thay vì
    được coi là "chưa có toạ độ". Sửa bằng kiểm tra chuỗi rỗng trước khi gọi
    `Number()`. Phát hiện TRƯỚC khi đưa vào dùng thật nhờ viết test cho parser.
52. **Parser CSV tự viết (không thêm thư viện, Rule 9 KISS) phải xử lý field
    bọc trong `"..."` chứa dấu phẩy bên trong** (địa chỉ thật luôn có dấu
    phẩy) — bản đầu chỉ `split(',')` đơn giản sẽ cắt sai cột ngay với dòng dữ
    liệu thật đầu tiên (`docs/sos-locations-template.csv`). Tách hẳn logic
    parse CSV sang `admin/src/lib/csv.ts` (không phải trong `LocationsPage.tsx`)
    để test được bằng Vitest mà không phải nạp Leaflet (cần `window`, môi
    trường test admin không có `jsdom`).
53. **KHÔNG tự seed toạ độ GPS cho `support_locations`** dù đã có sẵn tên/địa
    chỉ/SĐT đã có nguồn thật của Đại sứ quán VN tại Seoul (từ
    `scripts/seed-content.js#COUNTRIES`, trước đó cũng cố tình để trống toạ độ
    — xem quyết định 17) — đoán sai toạ độ GPS cho tính năng SOS có thể gây
    hại thật (chỉ sai đường tới đại sứ quán/bệnh viện lúc khẩn cấp). Tạo
    `docs/sos-locations-template.csv` với dữ liệu ĐÃ CÓ NGUỒN, để trống
    `lat`/`lng` cho người có bản đồ điền, import qua tính năng "Nhập CSV" mới
    xây. Xem "Đang vướng".

### Đợt rà soát tương tác toàn mobile (23/09/2026, ngoài lộ trình batch — người dùng yêu cầu trực tiếp: "kiểm tra lại từ đầu đến cuối, tìm và fix")

Sau khi B3 nối API thật, người dùng phát hiện nhiều nút/chip không phản hồi
khi bấm và một số thao tác bị "treo loading" khi API lỗi. Dùng agent con rà
soát TOÀN BỘ 21 màn hình mobile + component dùng chung, tìm ra 32 vấn đề chia
3 nhóm — đã xử lý 26/32:

20. **11/11 "nút chết" (không có `onPress`) đã nối hành vi.** Phần lớn là UI
    dựng sẵn từ commit gốc (trước B1), chưa bao giờ gắn hành vi — không phải
    lỗi do các batch trước gây ra. Xử lý theo 3 cách tùy tính chất:
    - **Có hành vi thật, ý nghĩa rõ ràng** → nối thật: chip đổi quốc gia/lọc
      chủ đề ở Explore + Search (mở `SimpleSheet`), nút lưu bài luật (xem mục
      21), nút "Định vị lại" và chạm vào dòng địa điểm ở SOS map (dùng
      `mapRef.animateToRegion`).
    - **Cần tính năng chưa xây (out of scope batch hiện tại)** → thông báo rõ
      ràng "Tính năng đang phát triển" thay vì im lặng: lịch sử phiên chat,
      tăng tương phản, cập nhật vị trí GPS, tìm trong danh sách sự cố, "Xem
      chi tiết"/"Báo sai" ở câu trả lời AI (những tính năng này thuộc phạm vi
      B5/B6/B7/B8, không tự mở rộng làm ở đây).
    - **Nút hiện ra nhưng không còn ý nghĩa** → chỉ hiện khi có tác dụng:
      "Xem tất cả" ở Explore giờ chỉ hiện khi đang lọc theo chủ đề (bấm vào
      sẽ bỏ lọc), biến mất khi không có gì để "xem tất cả" thêm.
21. **[MỚI] Tính năng "Lưu quy định" (bookmark) làm THẬT bằng AsyncStorage
    cục bộ** (`features/explore/useSavedArticles.ts`), dùng chung giữa màn
    Explore và màn chi tiết bài luật (trước đó màn chi tiết dùng
    `useState(false)` riêng, luôn reset khi mở lại — cũng là một dạng "nút
    chết về mặt dữ liệu"). Chưa có backend favorites thật (thuộc B8) nên chưa
    đồng bộ giữa các thiết bị — ghi rõ trong comment code, không giả vờ đây
    là tính năng đã hoàn chỉnh.
22. **9/9 thao tác async thiếu `try/catch` đã được bọc lại**, theo đúng mẫu
    đã lập ở B3 (`trips/new.tsx`): `login`, `register`, `saveName` (profile),
    `logout`, `runTranslate`, `askLegalAssistant` (chat), `setCurrentTrip`,
    `markAlertRead`/`markAllAlertsRead`. Trước đó Promise bị reject không ai
    xử lý → nút bấm treo loading vĩnh viễn, không báo lỗi, đúng loại lỗi
    người dùng đã gặp phải với `trips/new.tsx` trước khi B3 vá.
23. **[BUG THẬT, không chỉ thiếu try/catch] `logout()` để lại UI sai trạng
    thái nếu mất mạng lúc đăng xuất.** `authApi.logout()` xóa token cục bộ
    trong `finally` nhưng VẪN ném lỗi tiếp nếu lệnh gọi API thu hồi phiên thất
    bại — khiến `lib/auth.tsx#logout()` bỏ qua bước xóa `user` khỏi state
    (vì ném lỗi trước khi chạy tới đó), để UI hiển thị "vẫn đăng nhập" trong
    khi token đã mất thật. Sửa: `lib/auth.tsx` tự nuốt lỗi từ `authApi.logout()`
    trước khi xóa state cục bộ — đăng xuất phía client giờ LUÔN thành công dù
    API thu hồi có lỗi hay không.
24. **6/12 chỗ thiếu trạng thái lỗi rõ ràng (phân biệt "đang tải" / "lỗi
    mạng" / "rỗng thật") đã thêm banner đỏ**, ưu tiên các màn hình đã nối API
    thật: Trang chủ, Explore, Search, Trips, chi tiết bài luật, chi tiết sự
    cố. 6 chỗ còn lại (Alerts, Incidents danh sách, Settings/Trips-cards đọc
    quốc gia trong picker) CHƯA làm — xem "Nợ kỹ thuật".

## Quyết định phát sinh (tiếp)

25. **[23/09/2026, theo yêu cầu trực tiếp] Thêm màn chặn dùng chung
    `ComingSoonScreen` (route `app/coming-soon.tsx`) thay cho `Alert.alert`
    rời rạc ở 6 điểm tính năng chưa triển khai** — lý do: Alert biến mất ngay
    sau khi đóng, không rõ ràng bằng một màn hình riêng khi cần phân biệt
    "đã xong" và "đang làm" trong lúc test. Thông điệp cố định: "Tính năng
    đang trong quá trình nâng cấp và hoàn thiện." Áp dụng cho: lịch sử phiên
    chat (`chat/index.tsx`), tìm trong danh sách sự cố (`incidents/index.tsx`),
    tăng tương phản + cập nhật vị trí GPS (`sos/index.tsx`), "Xem chi tiết"
    + "Báo sai" ở câu trả lời AI (`features/chat/components/AnswerCard.tsx`).
    Không áp dụng cho toàn bộ màn hình nào (không có màn hình nào ở mobile
    hiện tại là "hoàn toàn chưa làm" — 21 màn hình đều chạy được, chỉ một số
    nút/thao tác lẻ bên trong là stub) — chỉ áp dụng đúng ở các nút stub đã
    liệt kê. `login-phone.tsx` KHÔNG còn là màn chặn tĩnh — PR #8
    (`feature/backend`, merge sau phiên B3) đã làm thật đăng nhập bằng số
    điện thoại, ghi đè quyết định B1 cũ (mục 2 ở trên, nay đã lỗi thời).

## Quyết định phát sinh (B7)

26. **`IncidentType.status: 'draft'|'published'`, dù prompt B7 không yêu cầu
    máy trạng thái** -- áp dụng nguyên tắc "Pre-filter nội dung" ở CLAUDE.md
    mục 4.1 (vốn viết cho `legal_articles`) sang incidents: workflow admin
    đang soạn dở không được lọt ra `/api/incidents` công khai. Không có bước
    duyệt/phân quyền riêng như bài luật -- admin tự đổi trạng thái trực tiếp
    trên form, đơn giản hơn máy trạng thái 5 bước của LegalArticle vì rủi ro
    thấp hơn nhiều (không phải nội dung pháp lý cần kiểm chứng nguồn).
27. **Tiến độ xử lý sự cố lưu theo `step.order` (mảng số), KHÔNG lưu theo
    từng mục checklist** -- mô hình đơn giản nhất khớp với `StepProgress`
    (thanh tiến độ theo BƯỚC, không phải theo dòng checklist). Mỗi bước có
    một checkbox "Đánh dấu đã xong" duy nhất; việc tick từng dòng checklist
    bên trong bước (nếu có) vẫn là state cục bộ, không đồng bộ server -- tách
    biệt hai khái niệm để giữ hợp đồng API đơn giản (Rule 9 KISS).
28. **`setProgress` lọc bỏ `step.order` không còn tồn tại trong workflow hiện
    hành** -- admin có thể sửa/xoá bước sau khi người dùng đã tick; giữ
    nguyên số cũ sẽ làm sai lệch `completedSteps.length` so với
    `steps.length` hiển thị trên `StepProgress`. Đánh đổi: nếu admin xoá một
    bước ĐÃ ĐƯỢC nhiều người tick, tiến độ của họ với đúng bước đó bị mất --
    chấp nhận được vì workflow sự cố ít khi sửa sau khi đã publish.
29. **Guest xem được toàn bộ nội dung `/api/incidents` (không cần đăng
    nhập), chỉ endpoint tiến độ (`/api/users/incident-progress/*`) yêu cầu
    đăng nhập** -- đúng theo PROMPT B7 mục 6 ("Guest xem được workflow
    nhưng không lưu progress"). Màn hình mobile không chặn toàn màn hình như
    `chat/index.tsx` (nơi cả nội dung LẪN thao tác đều cần đăng nhập) mà chỉ
    thay vùng checkbox tiến độ bằng banner mời đăng nhập.
30. **CTA từng bước (`map`/`call`/`ai`/`link`) lưu `payload` dạng
    `Record<string, unknown>` tự do thay vì tách field cứng theo từng loại**
    -- một schema cứng (vd `mapPayload{locationType}`, `callPayload{phone}`)
    sẽ phải đổi mỗi khi thêm loại CTA mới; `payload` tự do đơn giản hơn,
    validate ở tầng Zod chỉ ép `type`/`label` bắt buộc, còn nội dung
    `payload` do từng loại CTA tự diễn giải phía client (xem
    `mobile/src/app/incidents/[slug].tsx#runCta`).
31. **Dịch (`/api/translate`) tái dùng `getLlmProvider()` của RAG (B4) thay
    vì thêm provider dịch thuật riêng** -- một endpoint dịch duy nhất, prompt
    "CHỈ DỊCH, không trả lời câu hỏi trong văn bản" (tránh trường hợp người
    dùng dán một câu hỏi và LLM trả lời thay vì dịch). `MockLlm.complete()`
    mở rộng thêm nhánh đọc field `task:'translate'` để test/CI không cần
    `GEMINI_API_KEY` (bắt buộc theo CLAUDE.md mục 4.1).
32. **Dịch bắt buộc đăng nhập, cùng mức rate limit RAM như chat (`chatRateLimit`
    pattern), không có quota DB riêng** -- câu dịch tối đa 500 ký tự, không
    có bước truy hồi/embedding tốn kém như RAG nên rate limit RAM (reset khi
    restart server) được coi là đủ cho MVP; khác với chat vốn cần lớp quota
    DB thứ hai vì retrieval + LLM tốn nhiều hơn hẳn.
33. **Admin A07 Incident Workflow Builder dùng nút lên/xuống để sắp xếp lại
    bước, KHÔNG dùng thư viện kéo thả (drag-and-drop)** -- dù prompt B7 mục 3
    viết "kéo thả sắp xếp bước". Project chưa có sẵn thư viện DnD nào; thêm
    một dependency mới chỉ để đổi thứ tự mảng là không cân xứng (Rule 9
    KISS). Nút lên/xuống đạt cùng mục tiêu nghiệp vụ (đổi thứ tự bước) với
    ít rủi ro hơn. Server luôn chuẩn hoá lại `order` theo đúng vị trí trong
    mảng `steps` gửi lên khi lưu, bất kể client sắp xếp bằng cách nào.
34. **Picker chọn `contactRefs`/`articleRefs` trong A07 là ô lọc-tìm-kiếm +
    danh sách checkbox cuộn được, KHÔNG phải combobox/autocomplete chuyên
    dụng** -- cùng lý do Rule 9 KISS ở trên, không thêm thư viện UI mới cho
    một thao tác chọn nhiều mục từ danh sách đã tải sẵn (tối đa 100 mục theo
    `limit` hiện có của `locationsApi`/`articlesApi`).
35. **`mocks/schemas.ts#incidentStepSchema` bỏ field `checked` trên từng mục
    checklist (trước đây fixture set sẵn `true`/`false`)** -- server thật
    không có khái niệm "checklist item đã tick sẵn từ trước", tick luôn bắt
    đầu từ trạng thái trống theo từng phiên xem của người dùng. Giữ field cũ
    sẽ tạo cảm giác sai rằng máy chủ nhớ được trạng thái này.
36. **Smoke test thật trên Atlas + Gemini (14/15 việc kiểm tra xanh)**: tạo
    admin/user thật, tạo incident + quick phrase qua API admin, xác nhận
    public list/get đúng, tiến độ tách riêng theo user, RBAC chặn non-admin,
    dịch >500 ký tự bị chặn -- tất cả đúng như thiết kế. Việc còn lại
    (`POST /api/translate` với văn bản hợp lệ) trả `UPSTREAM_ERROR` do chính
    Gemini báo `503 UNAVAILABLE` ("high demand") tại thời điểm test, không
    phải lỗi code -- đã thêm `console.error` log nguyên nhân thật ở
    `translate.service.js` (trước đó nuốt lỗi hoàn toàn) để dễ chẩn đoán lần
    sau. Toàn bộ 127 test tự động (dùng `LLM_PROVIDER=mock` theo CLAUDE.md
    mục 4.1) không phụ thuộc tình trạng Gemini nên không bị ảnh hưởng.
    Dữ liệu smoke test đã được xoá sạch khỏi Atlas ngay sau khi kiểm tra.

## Quyết định phát sinh (B8)

37. **`GeoAlert.severity` tái dùng enum `RiskLevel` đã có (`info`/`warn`/
    `danger`) thay vì định nghĩa enum mới** -- cùng thang đo với
    `LegalArticle.riskLevel`, tránh 2 khái niệm "mức độ nghiêm trọng" song
    song trong cùng hệ thống (Rule 3 DRY, Rule 6 không magic string).
    `GET /api/alerts/applicable` lọc theo bán kính bằng Haversine tính
    TRONG ỨNG DỤNG (không dùng `$geoWithin`/`$centerSphere` của Mongo) --
    mỗi `GeoAlert` có bán kính RIÊNG, không phải một bán kính cố định cho cả
    truy vấn như $centerSphere yêu cầu. Số lượng alert `scope:'area'` đang
    published của một quốc gia rất nhỏ (vài chục), tính tay trong Node đơn
    giản hơn hẳn dựng một pipeline aggregate phức tạp cho cùng kết quả
    (Rule 9 KISS).
38. **`Favorite.targetId` không dùng `ref` cố định của Mongoose (không phải
    `ref: 'LegalArticle'` tĩnh)** -- một document có thể trỏ tới 1 trong 3
    model tuỳ `targetType`; thay vì Mongoose `refPath` (thêm độ phức tạp cho
    một lần populate), `favorite.service.js` tự truy vấn riêng từng loại rồi
    ghép lại bằng `Map` theo `targetId` (Rule 9 KISS, dữ liệu không lớn).
39. **`preferences` là subdocument nhúng trực tiếp trên `User`, không tách
    collection riêng** -- một user chỉ có đúng một bộ preferences, không có
    lịch sử/nhiều bản ghi cần truy vấn độc lập, nhúng đơn giản hơn hẳn tách
    bảng (Rule 9 KISS, giống `aiUsage` đã nhúng sẵn trên User từ B4).
40. **`PUT /api/users/preferences` chỉ ghi đè field được gửi, không phải PUT
    thay thế toàn bộ (dù dùng verb PUT)** -- tránh việc client quên gửi một
    nhóm field (vd gửi `{locationConsent:false}` mà không kèm `alerts`) làm
    mất toàn bộ preferences khác về giá trị mặc định. Đánh đổi: không đúng
    ngữ nghĩa REST thuần tuý của PUT, chấp nhận được vì đây là API nội bộ
    cho đúng 1 client (mobile), không phải API công khai cho bên thứ ba.
41. **`usePollAlerts` dùng nhịp định kỳ 5 phút (đọc lại vị trí mỗi lần) thay
    vì `expo-location#watchPosition` liên tục để phát hiện "di chuyển đáng
    kể >500m"** -- `watchPosition` tốn pin đáng kể khi chạy nền dài, và
    PROMPT B8 mục 5 tự đặt yêu cầu "KHÔNG poll liên tục (tốn pin, tốn
    quota)" mạnh hơn yêu cầu phát hiện dịch chuyển tức thời. Đánh đổi: nhận
    diện di chuyển có độ trễ tối đa 5 phút, ghi rõ ở "Giới hạn còn lại".
42. **"Chia sẻ vị trí khi SOS" (toggle cũ, gửi 2 liên hệ khẩn cấp) và
    "Cảnh báo theo vị trí" (`preferences.locationConsent`, mới ở B8) là HAI
    khái niệm tách biệt, không gộp chung một toggle** -- cái đầu về việc
    chia sẻ toạ độ cho người thân lúc khẩn cấp (chưa có backend, ngoài phạm
    vi B8), cái sau về việc `usePollAlerts` có được đọc GPS để tìm cảnh báo
    khu vực hay không. Gộp chung sẽ khiến người dùng tắt nhầm tính năng này
    khi chỉ muốn tắt tính năng kia.
43. **Bookmark bài luật đổi từ khoá cục bộ `countryCode:slug` sang khoá
    `article.id` (ObjectId thật)** -- `useSavedArticles()` giữ NGUYÊN tên 2
    hàm `isSaved`/`toggleSaved` (không đổi API bề ngoài với 2 màn hình gọi
    nó) nhưng đổi THAM SỐ nhận vào, vì backend `Favorite.targetId` bắt buộc
    là ObjectId thật của bài luật, không suy ra được từ countryCode+slug ở
    tầng service mà không tốn thêm 1 lượt truy vấn. Đây là thay đổi tối
    thiểu tại 2 điểm gọi (`explore/index.tsx`, `explore/[country]/[slug].tsx`)
    bắt buộc phải làm để nối API thật, không phải sửa màn hình tuỳ tiện.
44. **Bài luật đã lưu (favorite) mà bị thay thế (superseded) điều hướng vẫn
    dùng CHÍNH `countryCode`+`slug` cũ, không cần `currentArticleId` để mở
    đúng bản hiện hành** -- API công khai `GET /api/legal/articles/:country/
    :slug` LUÔN trả bản `isCurrent:true` của đúng slug đó (slug ổn định
    xuyên suốt các version), nên mở lại đường dẫn cũ tự động ra bản mới nhất.
    `currentArticleId` trong response favorites chỉ dùng để HIỂN THỊ badge
    "Đã có bản mới", không dùng để điều hướng.
45. **`AlertBanner` (banner/modal AppShell) gọi `usePollAlerts()` ở MỌI màn
    hình bọc `AppShell`, kể cả khi `isGuest`** -- hook tự tắt truy vấn alert
    khi guest (`enabled: !isGuest`) nên không gọi API thừa, nhưng vẫn gọi
    hook để giữ SỐ LƯỢNG hook cố định qua các lần render (Rule Rules of
    Hooks), tương tự mẫu `useMockAuthValue`/`useRealAuthValue` đã dùng trước đó.
46. **Test `AppShell.test.tsx` mock hẳn `usePollAlerts` thay vì dựng đủ
    `QueryClientProvider`+`AuthProvider`+`CountryProvider`+network mock** --
    test này chỉ kiểm tra thanh điều hướng hiển thị đúng, không quan tâm nội
    dung cảnh báo; dựng đủ 3 provider + mock network cho một thứ không được
    test tới là công sức thừa (Rule 9 KISS).
47. **[Sửa lỗi có thật, phát hiện khi thêm B8] `package.json#jest.moduleNameMapper`
    thiếu ánh xạ mock cho `@react-native-async-storage/async-storage`** --
    trước B8 chưa có test nào render một cây component chạm tới
    `lib/storage.ts` MÀ KHÔNG tự `jest.mock('@/lib/storage', ...)` ở file đó
    (`sos.test.ts`, `translate.test.ts`, `incidents.test.ts` đều tự mock).
    `AppShell.test.tsx` render `AlertBanner` (qua `lib/data.ts` import
    TOÀN BỘ module `lib/api/*` ở đầu file, kể cả khi hook liên quan đã được
    mock) lần đầu tiên chạm tới AsyncStorage native module thật trong Jest,
    lộ ra khoảng trống cấu hình có sẵn từ trước. Sửa MỘT LẦN ở cấu hình Jest
    chung (dùng mock chính thức của thư viện,
    `@react-native-async-storage/async-storage/jest/async-storage-mock.js`)
    thay vì mock riêng lẻ từng file — sửa tận gốc, áp dụng cho mọi test
    tương lai.
