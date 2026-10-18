# ACCEPTANCE CRITERIA — BE.TRAVEL

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
