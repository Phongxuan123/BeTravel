# BE.TRAVEL — BÁO CÁO RÀ SOÁT REPO

> Repo: `github.com/Phongxuan123/BeTravel` · nhánh `main` @ `79db16f` · rà soát 22/09/2026
> Đọc file này trước, rồi mới đọc master plan v2.

---

## 1. KẾT LUẬN NGẮN

Repo **tốt hơn kỳ vọng ở tầng giao diện** và **mới ở vạch xuất phát ở tầng dữ liệu**. Cụ thể:

- `mobile/` — **Expo/React Native**, 18 màn hình dựng xong, có design system, có test. Chất lượng khá.
- `backend/` — **JavaScript thuần**, chỉ có module xác thực. Không có nội dung pháp lý, không có RAG, không có SOS, không có admin.
- **Hai bên chưa nối với nhau.** Mobile chạy 100% trên dữ liệu giả (`src/mocks/`), kể cả đăng nhập.

Kế hoạch tôi lập hôm qua **giả định frontend là React web** — sai. Phải điều chỉnh lại toàn bộ phần frontend và cơ chế chia sẻ contract. Bộ tài liệu v2 đã sửa.

---

## 2. HIỆN TRẠNG CHI TIẾT

### 2.1. `backend/` — Node + Express 5 + Mongoose 9, **JavaScript ESM**

| Có | Chi tiết |
|---|---|
| Xác thực | register · login · Google login · link Google · refresh · logout · GET/PATCH me |
| Quên mật khẩu | OTP qua email (nodemailer) — 4 endpoint, hoạt động |
| Model | `User` (username, fullName, email, phone, googleId, password, role, isActive), `RefreshToken` (hash + TTL), `PasswordReset` |
| Bảo mật | helmet · cors · express-rate-limit (3 preset) · Zod 4 validator · bcrypt · trust proxy |
| Hạ tầng | `/api/health` · error middleware · kết nối Atlas (`WDPPROJECT01`) |

| Chưa có | Ghi chú |
|---|---|
| Toàn bộ nội dung pháp lý | countries, topics, articles, sources, version, status — **0 dòng code** |
| RAG / embedding / vector search | chưa có gì |
| SOS locations, incidents, alerts, quick phrases, favorites, trips | chưa có gì |
| Admin portal | **không tồn tại dưới bất kỳ hình thức nào** |
| Chat, feedback, translate | chưa có gì |
| Test / lint / typecheck | `package.json` chỉ có `dev` và `start` |

### 2.2. `mobile/` — Expo SDK 57 · RN 0.86 · React 19.2 · expo-router · NativeWind 4

**18 màn hình đã dựng:** welcome · login · login-phone · register · forgot-password · index (home) · explore · explore/[country]/[slug] · search · chat · translate · sos · sos/map · incidents · incidents/[slug] · alerts · trips · trips/new · profile · settings · _dev/design-system

**Design system hoàn chỉnh:** `styles/tokens.js` + `lib/theme.ts` (Be Vietnam Pro + Bricolage Grotesque, thang typography tính sẵn), 15 component UI (`Button`, `Card`, `Accordion`, `StepProgress`, `SegmentedTabs`, `Skeleton`…), 9 component common (`AppShell`, `BottomActionBar`, `DateRangeCalendar`, `EmptyState`…).

**Tầng dữ liệu giả có cấu trúc tốt:** `src/mocks/client.ts` mô phỏng đúng envelope `{ok, data}` + độ trễ giả; `src/mocks/schemas.ts` định nghĩa Zod cho 10 entity; 8 file fixture.

**Đã có test:** jest-expo, 6 file test (AppShell, DateRangeCalendar, StepProgress, AnswerCard, theme, fixtures).

**Thư viện đã cài sẵn và chưa dùng hết:** `react-native-maps`, `expo-speech`, `expo-clipboard`, `@gorhom/bottom-sheet`, `@tanstack/react-query`.

---

## 3. ★ 8 ĐIỂM XUNG ĐỘT PHẢI XỬ LÝ TRƯỚC KHI ĐI TIẾP

Đây là phần quan trọng nhất của báo cáo. Mỗi điểm, nếu để nguyên, sẽ khiến phải sửa lại nhiều lần.

### X1. Hai envelope khác nhau — phải chọn một

| Phía | Dạng trả về |
|---|---|
| Backend | `{ success: true, message: "...", data? }` |
| Mobile mock | `{ ok: true, data }` |

**Quyết định: chọn `{ok, data}`.** Lý do: 18 màn hình mobile đã dựng trên dạng này; backend mới có 1 module. Sửa backend rẻ hơn sửa mobile gấp nhiều lần. Kèm theo đó là bộ mã lỗi đóng (`ErrorCode`) thay cho `message` tiếng Việt tự do — hiện backend đang trả chuỗi tiếng Việt, mobile không thể phân nhánh xử lý theo chuỗi được.

### X2. ★ Refresh token chỉ đi qua cookie — sai với React Native

Backend đặt refresh token vào **httpOnly cookie** (`utils/cookie.js`, path `/api/auth`, `sameSite:'none'` ở production). Đây là thiết kế cho **trình duyệt**, không phải cho app native:

- Trên Android, cookie jar của OkHttp **không tự động bền vững qua lần khởi động app**, trừ khi cấu hình thêm. Người dùng sẽ bị đăng xuất mỗi lần mở lại app.
- Trên Expo Web, cookie này là third-party → Safari chặn.
- Không đọc/xoá/kiểm tra được từ phía JS, nên xử lý lỗi rất khó.

**Quyết định:** backend trả refresh token **trong response body** khi client là app (`AUTH_TRANSPORT=body`), mobile lưu bằng `expo-secure-store`. Giữ nguyên nhánh cookie cho admin web. Backend đọc refresh token từ **cookie HOẶC body** — viết một lần, chạy cả hai.

### X3. Refresh token cố ý **không xoay vòng** — lý do đã không còn đúng

`refreshToken.service.js` có comment giải thích không xoay vòng để tránh race condition của React StrictMode. Nhưng client là React Native, **không có StrictMode double-render như React web DOM**. Mất lý do biện minh, chỉ còn lại nhược điểm: token bị lộ dùng được tới 30 ngày.

**Quyết định:** bật xoay vòng + phát hiện tái sử dụng, kèm **cửa sổ ân hạn 10 giây** (token vừa bị thay vẫn chấp nhận trong 10s) để chống race thật sự mà không mất tính bảo mật.

### X4. Auth phía mobile là **giả hoàn toàn**

`mobile/src/lib/auth.tsx` ghi rõ: *"Auth giả lập cho track UI — không gọi API thật"*. Nó chỉ ghi `{name, email}` vào AsyncStorage. Backend auth đã xong nhưng **chưa ai nối vào**.

Đây là việc phải làm đầu tiên, và nó là phép thử tốt cho toàn bộ cơ chế contract.

### X5. ★ `__mock: z.literal(true)` sẽ làm hỏng validate khi nối API thật

Mọi schema trong `mobile/src/mocks/schemas.ts` đều bắt buộc có `__mock: true`. API thật sẽ không trả field này → `parse()` ném lỗi ở cả 10 entity.

**Quyết định:** đổi thành `__mock: z.literal(true).optional()`. Một dòng mỗi schema, không đụng màn hình nào.

### X6. Mô hình dữ liệu bài luật của FE **thiếu thứ làm nên giá trị sản phẩm**

| FE mock đang có | Vấn đề |
|---|---|
| `source: { name, agency, url }` — **một** nguồn | Một quy định pháp luật thường phải dẫn nhiều nguồn |
| `fines: string[]` | Không lọc/so sánh/kiểm chứng được |
| `updatedAt: string` | Thiếu `effectiveFrom` — không biết luật còn hiệu lực hay không |
| `status: z.literal('active')` | Không có vòng đời draft → published → superseded |
| Không có `version` | Không truy vết được lịch sử thay đổi luật |

Toàn bộ định vị "dữ liệu đã kiểm chứng" nằm ở mấy field này. Bỏ chúng là bỏ sản phẩm.

**Quyết định — không bắt FE sửa 7 màn hình:** API trả mô hình đầy đủ (`sources[]`, `penalties[]`, `status`, `version`, `effectiveFrom`, `isCurrent`), và mobile có **một file adapter duy nhất** (`src/lib/api/adapters.ts`) ánh xạ về đúng shape mà màn hình đang dùng. Màn hình không phải sửa. Khi nào FE rảnh thì nâng cấp UI để hiển thị nhiều nguồn.

### X7. Dữ liệu mẫu đang là **Nhật Bản**, nhưng cả pitch deck lẫn business case là **Hàn Quốc**

`mocks/fixtures/` có 3 quốc gia (JP, KR, TH) nhưng **6/7 bài viết mẫu là JP**, và mọi màn hình demo đều xoay quanh Nhật.

Pitch deck nói rõ: go-to-market Hàn Quốc, 62,5% khảo sát ưu tiên Hàn, "kiến trúc dữ liệu pháp lý Hàn Quốc đã được chuẩn hóa".

**Quyết định: nội dung thật làm Hàn Quốc trước.** Fixture Nhật giữ nguyên làm placeholder UI cho tới khi API thật thay thế — đổi fixture không đáng công, vì chúng sẽ bị bỏ. Nhưng **kịch bản demo và toàn bộ công sức thu thập nguồn dồn vào KR**, để khớp với luận điểm kinh doanh đã trình bày.

### X8. Không có chỗ nào để nhập liệu

Admin Portal không tồn tại. Mà **nhập và kiểm chứng nội dung pháp lý là đường găng dài nhất của dự án** — dài hơn code nhiều lần. Không có admin thì nhóm nội dung không thể bắt đầu, và mọi thứ khác sẽ phải chờ ở cuối.

**Quyết định:** dựng `admin/` — một SPA **Vite + React + TypeScript** riêng, deploy Vercel, dùng chung backend. Không nhét vào app mobile (soạn thảo văn bản dài trên điện thoại là bất khả thi) và không server-render từ Express (mất thời gian vô ích).

---

## 4. NHỮNG QUYẾT ĐỊNH TRONG PLAN V1 CÒN ĐÚNG

Rà lại thì phần lớn vẫn giữ nguyên giá trị, chỉ đổi chỗ áp dụng:

| Quyết định v1 | Trạng thái |
|---|---|
| Atlas M0 chỉ cho **3 search index** → dồn `vec_idx` + `txt_idx` vào `legal_chunks` | ✅ giữ nguyên |
| Atlas Search **không có analyzer tiếng Việt** → tự viết `vi_folded` (icuFolding) | ✅ giữ nguyên |
| Hợp đồng chống ảo giác + **hậu kiểm bằng code** + golden test | ✅ giữ nguyên, quan trọng nhất |
| `SEARCH_DRIVER=atlas\|memory` | ✅ giữ nguyên |
| Embedding 768 chiều, provider trừu tượng | ✅ giữ nguyên |
| `LLM_PROVIDER=mock` để CI chạy không tốn tiền | ✅ giữ nguyên |
| Vòng đời nội dung + `isCurrent` + audit log | ✅ giữ nguyên |
| Job queue bằng collection, không cần Redis | ✅ giữ nguyên |
| Quota AI lưu **trong DB**, không chỉ rate limit RAM | ✅ giữ nguyên |
| `AUTH_TRANSPORT=body\|cookie` | ✅ **đúng hơn dự kiến** — X2 chứng minh nó cần thiết |
| SSE bằng `fetch` + `ReadableStream`, không `EventSource` | ⚠️ **đổi**: RN không hỗ trợ streaming `fetch` ổn định → xem mục 5 |
| Bản đồ: không dùng Places API | ✅ giữ nguyên, nhưng cơ chế đổi — xem mục 5 |
| `packages/shared` monorepo chia sẻ Zod | ❌ **bỏ** — Metro bundler của Expo và monorepo là nguồn lỗi lớn cho nhóm sinh viên. Thay bằng `contracts/` + fixture JSON kiểm bằng test ở cả hai phía |

---

## 5. HAI ĐIỀU CHỈNH KỸ THUẬT DO ĐỔI NỀN TẢNG

### 5.1. Streaming chat trên React Native

React Native chưa hỗ trợ `response.body.getReader()` một cách đáng tin cậy (`fetch` của RN không trả `ReadableStream` ở mọi nền tảng). Ba lựa chọn:

| Cách | Đánh giá |
|---|---|
| `react-native-sse` / polyfill EventSource | Thêm thư viện, vẫn vướng vấn đề header (phải dùng bản hỗ trợ custom headers) |
| `expo/fetch` streaming API | Expo SDK 52+ có `fetch` hỗ trợ streaming — **nên kiểm chứng trên SDK 57 trước khi cam kết** |
| **Không streaming ở MVP** | Trả một lần, hiện skeleton "đang tra cứu nguồn…" |

**Quyết định: MVP không streaming.** Lý do: câu trả lời pháp lý ngắn (≤250 từ), thời gian chờ 2–4 giây, và màn hình chat đã có sẵn trạng thái `pending`. Đổi lại loại bỏ hoàn toàn một lớp rủi ro kỹ thuật. Backend vẫn thiết kế sẵn cả hai chế độ (`?stream=true` dùng cho admin web và cho Phase 2).

### 5.2. Bản đồ — `react-native-maps`, đã cài sẵn

Tin tốt: `react-native-maps` **chạy được trong Expo Go ở SDK 57**, không cần dev build để dev và demo.

| Nền tảng | Provider | Chi phí |
|---|---|---|
| iOS | `PROVIDER_DEFAULT` → **Apple Maps** | **0 đ, không cần API key** |
| Android | Google Maps (bắt buộc với react-native-maps) | Tính tiền theo lượt tải bản đồ |

**Quyết định:**
1. Dùng `PROVIDER_DEFAULT` (Apple Maps trên iOS) — demo trên iPhone là miễn phí tuyệt đối.
2. Android: tạo API key **có đặt hạn mức cứng (quota cap) trong Google Cloud Console**. Đây là việc bắt buộc, không phải tùy chọn — nó là thứ duy nhất chặn được hóa đơn bất ngờ.
3. **Vẫn không dùng Places API.** Tìm điểm hỗ trợ gần nhất = `$geoNear` trên dữ liệu của chính mình.
4. Chỉ đường = deep link (`maps://` trên iOS, `geo:` hoặc Google Maps URL trên Android) — miễn phí.

---

## 6. VIỆC CẦN LÀM NGAY (trước khi mở batch đầu tiên)

| # | Việc | Ai | Ghi chú |
|---|---|---|---|
| 1 | Xoá host cluster thật (`wdp.w0bnsxm.mongodb.net`) khỏi `backend/README.md` | CTO | Repo public — nên để `<cluster-host>` |
| 2 | Bật Atlas Vector Search trên cluster hiện tại, kiểm tra còn đủ slot index | CTO | M0 tối đa 3 |
| 3 | Lấy API key Gemini | CTO | Cho embedding + LLM |
| 4 | Tạo Android Maps API key **có quota cap** | CTO | Xem 5.2 |
| 5 | Chốt: nội dung thật làm **Hàn Quốc** trước | Cả nhóm | Khớp pitch deck |
| 6 | Bắt đầu thu thập nguồn pháp lý KR | CPO + nội dung | **Đường găng — bắt đầu ngay, song song với code** |
