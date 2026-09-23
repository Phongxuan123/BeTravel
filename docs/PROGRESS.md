# TIEN DO BE.TRAVEL

Cập nhật lần cuối: 2026-09-23 · Phiên: B4 (RAG + guardrails)

| Batch | Trạng thái | Ngày | Ghi chú |
|---|---|---|---|
| B1 Auth thật            | xong | 2026-09-22 | Envelope {ok,data}, auth thật nối mobile, refresh xoay vòng + ân hạn |
| B2 Content + Admin      | xong | 2026-09-22 | Models + admin API + máy trạng thái + admin SPA (Vite/React/TS/Tailwind) |
| B3 Public content       | xong | 2026-09-22 | API công khai countries/topics/articles/search + trips thật, seed 4 nước + 6 chủ đề + 8 bài draft KR có nguồn thật, mobile nối API thật |
| B4 RAG + guardrails     | xong | 2026-09-23 | Embedding/LLM provider (mock bắt buộc + Gemini/OpenAI), chunking, retrieval 2 lớp phòng thủ, guard.js hậu kiểm, chat API backend, job reindex/purge thật, admin A04 RAG Index, golden test 25/25 |
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

- **[B4, ĐÃ XONG] Smoke test Gemini thật đã xác nhận chạy đúng end-to-end**
  (2026-09-23) — key mới (`AIzaSy...`, đúng định dạng REST API key) hoạt động.
  Phát hiện thêm: `LLM_MODEL=gemini-2.5-flash` (giá trị mặc định cũ trong
  `.env.example`) bị Google trả `404 NOT_FOUND` với key mới ("no longer
  available to new users"), đã đổi default sang `gemini-3.6-flash` ở cả
  `backend/.env` và `backend/.env.example`. Đã reindex 2 bài KR bằng
  `gemini-embedding-001` thật (`POST /api/admin/rag/reindex-country`), gửi
  câu hỏi thật qua `/api/chat/sessions/:id/messages` — trả lời đúng, trích
  dẫn đúng bài (`[S3][S4][S7]`), guard không phải can thiệp (không có marker
  bịa/tuyên bố không nguồn). `.env` hiện để `LLM_PROVIDER=gemini` +
  `EMBEDDING_PROVIDER=gemini` (dùng AI thật cho dev thực tế); test/golden
  test KHÔNG bị ảnh hưởng vì ép override bằng `__setLlmProviderForTest`/
  `__setEmbeddingProviderForTest` trong code, không đọc từ `.env` — đã chạy
  lại `npm run test` (78/78) và `npm run test:golden` (25/25) sau khi đổi,
  vẫn xanh. Gặp 1 lần lỗi `503 UNAVAILABLE` (Google quá tải tạm thời, không
  phải bug) khi gọi LLM lần đầu — retry thành công ngay sau đó; guard đã xử lý
  đúng bằng cách hạ xuống `fallbackReason:PROVIDER_ERROR` thay vì crash, đúng
  thiết kế.
- **[B4, MỚI] Chat backend đã xong nhưng CHƯA có UI mobile** (đúng phạm vi
  B4 — UI chat thuộc B5). `/api/chat/*` đã có thể gọi thẳng qua Postman/curl
  để demo cho giảng viên nếu cần trước khi làm B5.
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
  (CPO/nhóm nội dung) bổ sung qua Admin Portal trước khi publish được.
  **[CẬP NHẬT B4]** `bodyMd` cả 8 bài đã được viết lại có cấu trúc heading
  (không còn là bản sao `summaryVi`) — đủ để chunk cho RAG, xem quyết định
  31. Đã xác nhận thật qua Atlas: cả 2 bài
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
- **[XONG Ở B4]** ~~B2: job worker handler rỗng~~ — `reindex_article`/
  `purge_chunks` đã có handler thật (`rag/jobs/`), đã smoke test qua Atlas.
- **[B4, MỚI] `AtlasSearchDriver` (`rag/search/atlas.driver.js`) CHƯA có test
  tự động** — không chạy được trên `mongodb-memory-server` (không hỗ trợ
  `$vectorSearch`/`$search`), chỉ xác minh được bằng tay trên Atlas thật sau
  khi tạo 2 index (`docs/atlas-indexes.md`). `MemorySearchDriver` (dùng trong
  toàn bộ test + golden test) có test đầy đủ và cùng shape kết quả, nhưng
  không chứng minh được cú pháp aggregation `$vectorSearch`/`$search` đúng
  100% cho tới khi chạy thật trên Atlas với index đã ACTIVE.
- **[B4, MỚI] `chat.service.js` không dùng lịch sử hội thoại (multi-turn)
  khi build prompt** — mỗi câu hỏi được xử lý độc lập (không có "câu trên nói
  gì"). Phù hợp cho MVP (câu hỏi pháp lý thường độc lập) nhưng nếu B5 cần hỏi
  nối tiếp kiểu "còn với trường hợp X thì sao?", cần thêm ngữ cảnh hội thoại
  vào `buildUserPrompt`.
- **[B4, MỚI] `promptTokens`/`completionTokens`/`costEstimateUsd` trong
  `ChatMessage`/`AiEvent` luôn là 0** — provider Gemini/OpenAI trả về usage
  metadata thật (`usageMetadata`/`usage` trong response) nhưng chưa được đọc
  và lưu lại. Không chặn chức năng (chỉ là telemetry), nên làm khi cần đối
  soát chi phí thật.
- **[B4, MỚI] `AiCache` không phân biệt user** — cache theo
  `sha256(question+country+chunkIds)` dùng chung cho MỌI user hỏi cùng câu
  với cùng ngữ cảnh, đúng theo thiết kế (`docs/03_Contracts_v2.md` mục 11).
  Đây là quyết định có chủ đích (câu trả lời pháp lý không phụ thuộc vào
  danh tính người hỏi), không phải sơ suất.
- **B2**: `admin/` chưa có test cho từng trang React (chỉ có test đối chiếu
  contract ở `lib/schemas.ts`). Với quy mô B2 (form CRUD, không có logic phức
  tạp phía client — máy trạng thái thật nằm ở backend đã có test), chấp nhận
  đánh đổi này để không kéo dài batch quá mức; nên bổ sung test component
  (React Testing Library) nếu về sau `admin/` có thêm logic phía client.
- Google login (`googleLogin`, `linkGoogle`) và quên mật khẩu chưa có test
  tích hợp — B1 chỉ đổi envelope bọc ngoài, logic nghiệp vụ giữ nguyên từ
  trước, rủi ro thấp nhưng nên bổ sung test khi có `GOOGLE_CLIENT_ID`/SMTP thật.
