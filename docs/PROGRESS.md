# TIEN DO BE.TRAVEL

Cập nhật lần cuối: 2026-09-23 · Phiên: B3 + đợt rà soát tương tác toàn mobile (ngoài lộ trình batch, theo yêu cầu trực tiếp)

| Batch | Trạng thái | Ngày | Ghi chú |
|---|---|---|---|
| B1 Auth thật            | xong | 2026-09-22 | Envelope {ok,data}, auth thật nối mobile, refresh xoay vòng + ân hạn |
| B2 Content + Admin      | xong | 2026-09-22 | Models + admin API + máy trạng thái + admin SPA (Vite/React/TS/Tailwind) |
| B3 Public content       | xong | 2026-09-22 | API công khai countries/topics/articles/search + trips thật, seed 4 nước + 6 chủ đề + 8 bài draft KR có nguồn thật, mobile nối API thật |
| B4 RAG + guardrails     | chưa làm | | |
| B5 Chat + feedback      | chưa làm | | |
| B6 SOS                  | chưa làm | | |
| B7 Incidents + dịch     | chưa làm | | |
| B8 Alerts + profile     | chưa làm | | |
| B9 Hardening            | chưa làm | | |

Trạng thái hợp lệ: `chưa làm` · `đang làm` · `xong` · `xong một phần`

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

## Đang vướng

- **[B3, ĐÃ SEED, 2/8 ĐÃ PUBLISH theo yêu cầu người dùng] Đã có 8 bài luật KR
  có nguồn thật trong Atlas** (chạy `npm run seed` — idempotent, chạy lại
  không tạo trùng), theo đúng nội dung `docs/06_Legal_Content_Seed_KR.md`:
  nhập cảnh/visa (K-ETA vs C-3), quá hạn lưu trú, bằng lái nước ngoài/IDP, ma
  túy (cảnh báo, thiếu trích dẫn điều luật — ưu tiên thấp nhất để publish),
  hải quan, lao động EPS/lương tối thiểu 2026, số khẩn cấp, mất hộ chiếu/Đại
  sứ quán VN tại Seoul.
  **Trạng thái hiện tại (23/09/2026):** 2 bài đã `published` theo yêu cầu
  trực tiếp của người dùng để xem app với dữ liệu thật ngay — `qua-han-luu-tru`
  (Nhập cảnh) và `lao-dong-eps-luong-toi-thieu` (Lao động), cả hai đều đủ
  điều kiện CƠ HỌC (có `effectiveFrom` + ít nhất 1 nguồn đủ url/authority/
  publishedAt). **Đây KHÔNG đồng nghĩa nội dung đã được người có chuyên môn
  kiểm chứng đầy đủ** — chỉ là đủ điều kiện kỹ thuật để xuất bản, một số
  nguồn trong 2 bài này vẫn là `kind:'secondary'` (xem `foreignerNotes` từng
  bài) — nên đối chiếu lại với `.go.kr` khi có thời gian. 6 bài còn lại vẫn
  `draft`, thiếu `effectiveFrom` hoặc nguồn có ngày công bố — cần người
  (CPO/nhóm nội dung) bổ sung qua Admin Portal trước khi publish được. Cũng
  cần viết `bodyMd` đầy đủ cho cả 8 bài (hiện để tạm bằng `summaryVi`, chưa
  đủ chất lượng cho chunk RAG ở B4). Đã xác nhận thật qua Atlas: cả 2 bài
  xuất hiện đúng ở `/api/legal/articles`, `/api/legal/articles/KR/:slug`, và
  đếm đúng ở `/api/legal/topics` (Nhập cảnh: 1, Lao động: 1). Vẫn KHÔNG thay
  thế việc thu thập đủ 15–20 bài luật KR ở Phần D.2
  `00_BeTravel_MasterPlan_v2.md`.
- **[B3, MỚI] `JP`/`TH`/`SG` seed với `status:'coming_soon'` và `embassy: {}`
  rỗng** (chỉ có `emergencyNumbers` — đây là kiến thức phổ thông đã kiểm
  chứng, không phải dữ liệu pháp lý cần nguồn riêng). Khi nhóm nội dung mở
  một trong ba nước này, cần bổ sung `embassy.address/phone` thật qua Admin
  Portal (Countries) trước khi đổi `status` sang `active`.
- **[B3, MỚI] Embassy KR trong seed lấy theo nguồn của bài `mat-ho-chieu-ho-tro-cong-dan`**
  (`123 Bukchon-ro, Jongno-gu, Seoul`), khác địa chỉ cũ trong mock UI trước đây
  (`28 Dongbinggo-ro, Yongsan-gu, Seoul`). Chưa có tọa độ `lat/lng` đã kiểm
  chứng cho địa chỉ mới — để trống thay vì đoán; cần người điền qua Admin
  Portal nếu bản đồ đại sứ quán cần hiển thị chính xác (dùng ở B6/B8).

- **`backend/.env` đã được điền** (MONGODB_URI Atlas thật) và đã SMOKE TEST
  THÀNH CÔNG bằng `curl` thật: register → login → `/me` → refresh xoay vòng →
  replay trong cửa sổ ân hạn, cả 5 bước đều đúng kỳ vọng trên Atlas thật (dữ
  liệu test đã được dọn sạch khỏi DB sau khi xong). Vẫn CHƯA chạy qua Expo Go
  trên thiết bị/emulator thật (cần `EXPO_PUBLIC_API_URL` trỏ IP LAN từ máy
  chạy Expo) — người cần tự kiểm bước cuối này.
- **[!] `MONGODB_URI` trong `.env` hiện không có tên database trong URI**
  (`.../` thay vì `.../WDPPROJECT01`) → Mongoose tự nối vào database mặc định
  tên **`test`**, không phải `WDPPROJECT01` như tài liệu mô tả
  (`docs/00_BeTravel_MasterPlan_v2.md` Phần F). Không tự sửa vì đây có thể là
  chủ đích (ví dụ đang dùng chung cluster cho môi trường dev/test khác) — cần
  người xác nhận: nếu muốn đúng `WDPPROJECT01`, thêm `/WDPPROJECT01` vào cuối
  URI trước dấu `?`.
- **Google Client ID / SMTP**: chưa rõ đã điền hay chưa trong `.env` mới — các
  luồng Google login và quên mật khẩu giữ nguyên logic cũ (B1 chỉ đổi envelope
  bọc ngoài), chưa có test tích hợp riêng cho hai luồng này.
- **B2: chưa click-test admin SPA trong trình duyệt thật.** Không có công cụ
  trình duyệt (headless hay có giao diện) trong phiên làm việc này. Đã xác
  minh: `tsc -b` sạch, `vite build` thành công, `oxlint` sạch (1 warning chấp
  nhận được), mọi file `.tsx` compile qua Vite dev transform không lỗi cú
  pháp/import, và toàn bộ API phía sau (login, CRUD, publish, CORS với origin
  `localhost:5173`) đã smoke test thật bằng `curl` trên Atlas. Nhưng hành vi
  React runtime thực tế (state, re-render, form UX, bản đồ Leaflet hiển thị
  đúng vị trí click...) **chưa được người dùng hoặc công cụ trình duyệt xác
  nhận trực tiếp**. Đề nghị người dùng tự chạy `cd admin && npm run dev` và
  thử qua ít nhất luồng: đăng nhập → tạo quốc gia → tạo chủ đề → soạn bài
  luật → thêm nguồn → xuất bản → xem lại nhật ký.
- **[GIẢI QUYẾT MỘT PHẦN ở B3]** DoD B2 dòng cuối ("nhập thử 1 bài luật KR
  thật từ đầu đến publish") — đã smoke test bằng `curl` với NỘI DUNG THẬT
  (bài `qua-han-luu-tru` trong seed B3, có nguồn `.go.kr` thật, publish →
  xuất hiện đúng ở API công khai → revert lại `draft`). Vẫn CHƯA có ai thao
  tác qua giao diện Admin Portal thật (chuột/bàn phím qua trình duyệt) — vẫn
  cần người tự làm ít nhất 1 lần qua UI để xác nhận trải nghiệm soạn thảo
  (autosave, markdown preview, StatusBar) hoạt động đúng, không chỉ API phía
  sau.
- **[B3, MỚI] Chưa click-test mobile app qua Expo Go/emulator thật với API
  thật trong phiên này** — không có công cụ chạy React Native/thiết bị ảo
  trong môi trường làm việc. Đã xác minh: `tsc --noEmit` sạch, `expo lint`
  sạch, 61 test Jest xanh (bao gồm test đối chiếu `contracts/fixtures/` mới
  cho countries/topics/articles/search/trips), và toàn bộ 8 endpoint mới đã
  smoke test thật bằng `curl` trên Atlas (bao gồm CRUD trips, publish/revert
  1 bài luật). Nhưng hành vi runtime thật trên mobile (loading/empty/error
  state hiển thị đúng, ô "Sắp ra mắt" ở bước 1 tạo chuyến đi không cho chọn
  được, Explore/Search hiển thị đúng dữ liệu KR) **chưa được xác nhận trực
  tiếp qua Expo Go**. Đề nghị người dùng chạy `cd mobile && npx expo start -c`
  với `EXPO_PUBLIC_USE_MOCKS=false` và thử qua: xem Home/Explore quốc gia KR,
  tạo chuyến đi (thử chọn JP để thấy trạng thái "Sắp ra mắt"), tìm kiếm
  "qua han" sau khi publish thử 1 bài qua Admin Portal.

## Nợ kỹ thuật

- **[23/09/2026, sau đợt rà soát] 6/12 chỗ thiếu trạng thái lỗi mạng rõ ràng
  chưa xử lý** — `alerts/index.tsx` và `incidents/index.tsx` (còn 100% mock,
  rủi ro thấp vì mock không thể lỗi mạng thật), `settings/index.tsx` (danh
  sách quốc gia trong picker chọn mặc định im lặng rỗng nếu lỗi), và
  `trips/index.tsx` (`countriesQuery` bên trong từng thẻ chuyến đi — lỗi thì
  thẻ tự ẩn thay vì báo, chấp nhận được vì không crash, chỉ mất một thẻ).
  Không chặn vì đều là suy giảm nhẹ nhàng (graceful), không phải treo màn
  hình hay crash — nên ưu tiên thấp hơn 26 vấn đề đã xử lý cùng đợt.
- **[23/09/2026] "Lưu quy định" (favorites) hiện là tính năng cục bộ
  (AsyncStorage), không đồng bộ giữa các thiết bị/khi cài lại app** — B8 cần
  thay bằng API thật (`/api/users/favorites` hoặc tương tự) và di chuyển dữ
  liệu cũ trong AsyncStorage lên server khi user đăng nhập, không chỉ thêm
  API mới song song.
- **[BUG DA SUA]** `src/config/db.js` import sai đường dẫn (`./env.js` thay vì
  `../core/env.js`) khiến `npm run dev` crash ngay khi khởi động — không bị
  test bắt vì test tích hợp kết nối DB trực tiếp qua `test/setup.js`, không đi
  qua `connectDB()`. Phát hiện khi chạy smoke test thật, đã sửa và xác minh
  lại bằng `npm run dev` + curl thật.
- Mobile CHƯA có UI "Đăng nhập bằng Google" (backend đã hỗ trợ `/auth/google`
  từ trước B1). Nếu muốn `login-phone.tsx` thật sự hướng người dùng sang
  Google (không chỉ email), cần thêm hạng mục tích hợp `expo-auth-session` +
  OAuth client ID cho iOS/Android — ngoài phạm vi B1, cần thông tin từ Google
  Cloud Console.
- **[GIẢI QUYẾT MỘT PHẦN ở B3]** `mobile/src/lib/data.ts`: countries/topics/
  legal articles/search/trips đã đổi sang mẫu `USE_MOCKS ? mock.fn : real.fn`.
  Phần còn lại (incidents/alerts/quick-phrases/support-locations/chat/
  translate) vẫn 100% mock — sẽ đổi dần ở B5/B6/B7 khi backend có endpoint
  tương ứng.
- **B3**: tính năng "đã lưu quy định" (`saved`/`savedOnly`) thuộc B8
  (favorites), chưa có API. `adaptArticle` luôn trả `saved:false`;
  `fetchArticles(..., {savedOnly:true})` ở `lib/api/content.ts` trả mảng rỗng
  ngay (không gọi API) để tránh vỡ màn hình Explore khi bấm nút "Đã lưu" —
  cần thay bằng truy vấn thật khi B8 có API favorites.
- **B3**: `publicContent.service.js#searchArticles` dùng `$regex` không có
  index hỗ trợ tốt (chỉ có index thường trên `titleNorm`, không phải text/
  Atlas Search index) — đủ nhanh với vài chục bài hiện tại, nhưng sẽ chậm dần
  khi số bài tăng. Đây CHÍNH LÀ điểm B4 sẽ thay bằng Atlas Search trên
  `legal_chunks` (đã ghi rõ trong code + `contracts/README.md` mục 8.2),
  không phải nợ kỹ thuật cần xử lý riêng.
- **B2**: job worker (`services/job.service.js`) mới có handler rỗng (log +
  đánh dấu `done`) — B4 phải cắm handler thật cho `reindex_article` và
  `purge_chunks` qua `registerJobHandler()`, không cần sửa lại phần lock/retry.
- **B2**: `admin/` chưa có test cho từng trang React (chỉ có test đối chiếu
  contract ở `lib/schemas.ts`). Với quy mô B2 (form CRUD, không có logic phức
  tạp phía client — máy trạng thái thật nằm ở backend đã có test), chấp nhận
  đánh đổi này để không kéo dài batch quá mức; nên bổ sung test component
  (React Testing Library) nếu về sau `admin/` có thêm logic phía client.
- Google login (`googleLogin`, `linkGoogle`) và quên mật khẩu chưa có test
  tích hợp — B1 chỉ đổi envelope bọc ngoài, logic nghiệp vụ giữ nguyên từ
  trước, rủi ro thấp nhưng nên bổ sung test khi có `GOOGLE_CLIENT_ID`/SMTP thật.
