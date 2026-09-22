# BE.TRAVEL — 9 PROMPT GIAO CHO CLAUDE CODE (v2, khớp repo thật)

> **Chuẩn bị một lần:**
> 1. Copy `01_CLAUDE_root.md` vào gốc repo, đổi tên thành `CLAUDE.md`. **Giữ nguyên `mobile/CLAUDE.md` và `mobile/AGENTS.md`.**
> 2. Tạo `docs/` ở gốc repo, copy vào đó: `00_BeTravel_MasterPlan_v2.md`, `03_Contracts_v2.md`, `04_Repo_Audit.md`.
> 3. Mở Claude Code ở gốc repo. Dán **Prompt B1**.
>
> **Quy tắc:** mỗi batch = một phiên (`/clear` giữa các batch). Không nhảy batch. Không gộp. Mỗi batch làm trên nhánh `feature/*` rồi PR vào `main` — giữ đúng nếp repo đang có.

---

## PROMPT B1 — Hợp nhất contract & nối auth thật

```
Đọc CLAUDE.md, docs/04_Repo_Audit.md (đặc biệt mục 3: 8 điểm xung đột) và
docs/03_Contracts_v2.md trước khi làm.

BỐI CẢNH: backend đã có auth hoạt động; mobile có 18 màn hình nhưng auth là GIẢ
(mobile/src/lib/auth.tsx chỉ ghi AsyncStorage, không gọi API). Batch này nối
hai bên lại và chốt contract cho mọi batch sau.

── PHẦN 1: contracts/ ──
1. Tạo contracts/README.md theo docs/03_Contracts_v2.md: đặc tả envelope,
   ErrorCode (10 giá trị, enum đóng), và toàn bộ endpoint auth hiện có.
2. Tạo contracts/fixtures/ với response mẫu cho: auth.register, auth.login,
   auth.refresh, auth.me, error.validation, error.unauthorized.

── PHẦN 2: backend ──
3. ★ ĐỔI ENVELOPE sang {ok, data} / {ok, error:{code,message,details}}.
   - Tạo src/core/envelope.js: ok(res,data,meta), fail(res,code,message,details)
   - Tạo src/core/errors.js: class AppError(code, httpStatus, message, details)
     + bảng ErrorCode → httpStatus
   - Sửa TOÀN BỘ src/controllers/auth.controller.js (hiện có ~20 chỗ
     res.status().json({success:...})) sang envelope mới. Giữ nguyên message
     tiếng Việt nhưng BỔ SUNG code máy đọc được.
   - Sửa src/middleware/error.middleware.js: ZodError → VALIDATION_ERROR,
     AppError → code của nó, còn lại → INTERNAL_ERROR. Prod không lộ stack.
   - /api/health trả {ok:true,data:{db,searchDriver,version,uptime}}.
4. ★ AUTH_TRANSPORT (xem master plan B.2):
   - src/utils/cookie.js giữ nguyên, thêm nhánh body.
   - refresh/login/register: nếu AUTH_TRANSPORT bao gồm 'body' thì trả
     refreshToken TRONG data; nếu bao gồm 'cookie' thì vẫn set cookie.
   - POST /api/auth/refresh đọc refresh token từ cookie HOẶC req.body.refreshToken.
   - Mặc định .env.example: AUTH_TRANSPORT=body
5. ★ BẬT XOAY VÒNG REFRESH TOKEN (sửa src/services/refreshToken.service.js —
   comment hiện tại nói không xoay vòng vì React StrictMode, lý do đó KHÔNG
   áp dụng cho React Native):
   - Thêm field vào RefreshToken model: family (String), revokedAt (Date),
     replacedByHash (String).
   - Mỗi lần refresh: cấp token mới cùng family, đánh dấu token cũ revokedAt.
   - CỬA SỔ ÂN HẠN: token đã revoked nhưng revokedAt trong vòng
     REFRESH_ROTATION_GRACE_SECONDS (mặc định 10s) → vẫn chấp nhận, trả lại
     replacedBy hiện hành. Đây là cách xử lý race đúng đắn.
   - Ngoài cửa sổ ân hạn mà token đã revoked → TÁI SỬ DỤNG: thu hồi TOÀN BỘ
     family, trả 401 UNAUTHORIZED.
6. Thêm scripts vào backend/package.json: lint (eslint), test (node --test
   hoặc vitest — chọn một và ghi rõ trong README), và cấu hình tương ứng.
7. Thêm src/core/env.js: validate toàn bộ env bằng Zod lúc khởi động, fail fast.
   Cập nhật backend/.env.example đầy đủ theo master plan Phần F.
8. Mongoose connect: thêm maxPoolSize: 10.
9. Xoá host cluster thật khỏi backend/README.md, thay bằng <cluster-host>.

── PHẦN 3: mobile ──
10. npx expo install expo-secure-store
11. Tạo mobile/src/lib/api/:
    - http.ts: fetch wrapper hiểu envelope {ok,data}; tự unwrap; ném ApiError
      mang code; tự gắn Bearer; tự refresh khi 401 (hàng đợi, chỉ refresh 1 lần);
      đọc EXPO_PUBLIC_API_URL.
    - auth.ts: register, login, refresh, logout, me, updateProfile.
    - tokenStore.ts: access token trong memory, refresh token trong
      expo-secure-store (KHÔNG dùng AsyncStorage cho refresh token).
12. ★ VIẾT LẠI mobile/src/lib/auth.tsx để gọi API thật. GIỮ NGUYÊN chữ ký
    AuthContextValue hiện tại (login, loginWithPhone, register, updateProfile,
    logout, user, isGuest, isLoading) để 18 màn hình KHÔNG phải sửa.
    - login(email, password) → gọi API thật (hiện đang bỏ qua password).
    - register(name, email, password) → map sang backend: username, fullName,
      email, phone, password. ĐỌC src/validators/auth.validator.js để biết
      backend đang bắt buộc field nào (phone đang bắt buộc khi đăng ký).
    - loginWithPhone: backend CHƯA hỗ trợ đăng nhập bằng số điện thoại.
      Giữ màn hình nhưng hiện thông báo "tính năng đang phát triển", HOẶC
      thêm hỗ trợ ở backend nếu làm được gọn. Chọn một, ghi rõ lý do.
    - Khôi phục phiên khi mở app: đọc refresh token từ secure-store → refresh.
13. ★ Sửa mobile/src/mocks/schemas.ts: đổi mọi `__mock: z.literal(true)`
    thành `__mock: z.literal(true).optional()` (10 chỗ). Không đụng màn hình.
14. Tạo mobile/src/lib/data.ts: re-export từ '@/mocks/client' hoặc '@/lib/api'
    tuỳ EXPO_PUBLIC_USE_MOCKS. Đổi import ở 18 màn hình từ '@/mocks/client'
    sang '@/lib/data'. CHỈ đổi dòng import, không đổi logic component.
    Ở batch này api/ mới chỉ có auth — phần còn lại data.ts vẫn trỏ về mocks.
15. Cập nhật mobile/.env.example thêm EXPO_PUBLIC_USE_MOCKS.

KHÔNG LÀM: nội dung pháp lý, admin portal, RAG, SOS.

DEFINITION OF DONE:
□ backend: npm run lint && npm run test xanh
□ mobile: npx tsc --noEmit && npx expo lint && npm test xanh
□ Đăng ký tài khoản mới trên app → user xuất hiện trong MongoDB
□ Đăng nhập → đóng app → mở lại → VẪN đăng nhập (phiên khôi phục được)
□ Access token hết hạn → tự refresh, người dùng không thấy gì
□ Dùng lại refresh token cũ sau 10s → cả family bị thu hồi, trả 401
□ Mọi response khớp fixture trong contracts/fixtures/
□ EXPO_PUBLIC_USE_MOCKS=true vẫn chạy được toàn bộ app (đường lùi)

In ra cuối cùng: danh sách việc THỦ CÔNG con người phải làm.
```

---

## PROMPT B2 — Content backbone + Admin Portal ★ (batch mở khoá nhập liệu)

```
Đọc CLAUDE.md và docs/00_BeTravel_MasterPlan_v2.md (Phần C: mô hình dữ liệu).

MỤC TIÊU KINH DOANH: sau batch này nhóm nội dung BẮT ĐẦU NHẬP LIỆU ĐƯỢC.
Đây là đường găng dài nhất của dự án. Ưu tiên form dùng được hơn form đẹp.

── PHẦN 1: backend — model & API quản trị ──
1. Models mới theo master plan Phần C (JavaScript, Mongoose, đặt trong
   backend/src/models/): Country, LegalTopic, LegalArticle, SupportLocation,
   AuditLog, Job.
   - LegalArticle: unique (countryCode, slug, version)
     + PARTIAL UNIQUE (countryCode, slug) WHERE isCurrent:true
     + indexState
   - SupportLocation: location GeoJSON Point + index 2dsphere.
     GeoJSON là [lng, lat] — KHÔNG phải [lat, lng].
2. Module admin (backend/src/modules/admin/ hoặc theo cấu trúc routes/
   controllers/services sẵn có — GIỮ ĐÚNG quy ước đặt tên hiện tại của repo:
   <name>.controller.js, <name>.service.js, <name>.routes.js):
   CRUD /api/admin/countries, /topics, /legal/articles, /locations
   Tất cả qua requireRole('admin') Ở BACKEND. Zod validate. Phân trang.
3. ★ Máy trạng thái nội dung:
   POST /api/admin/legal/articles/:id/status { status, note }
   - Sang 'published' BẮT BUỘC pass validate: >=1 source đủ
     url+authority+publishedAt, summaryVi không rỗng, effectiveFrom có giá trị,
     topicSlug tồn tại. Không đạt → 422 CONFLICT, details liệt kê field thiếu.
   - Publish version N → isCurrent=true cho N; set isCurrent=false +
     status='superseded' cho mọi version trước của cùng (countryCode, slug).
   - Publish → enqueue job 'reindex_article'
   - Unpublish/supersede → enqueue job 'purge_chunks'
   (worker thật làm ở B4; giờ chỉ ghi vào collection jobs + handler stub log ra)
4. POST /api/admin/legal/articles/:id/new-version → clone sang version+1 ở
   trạng thái draft, set supersedesId, bản cũ giữ nguyên.
5. ★ Chống ghi đè: request sửa bài gửi kèm updatedAt đang xem; backend so sánh,
   khác → CONFLICT kèm thông tin ai sửa lúc nào. Nhập liệu là việc tốn công
   nhất dự án, mất bài vì ghi đè là thiệt hại thật.
6. AuditLog: middleware ghi mọi POST/PATCH/DELETE trên /api/admin/*
   (actor, action, entityType, entityId, diff before/after, ip). TTL 180 ngày.
7. Job queue: collection jobs + worker skeleton (setInterval 3s,
   findOneAndUpdate để lock, retry 3 lần). Handler thật để trống.
8. Script tạo admin đầu tiên: npm run create-admin -- --email --password
   (hoặc nâng role user có sẵn).

── PHẦN 2: admin/ — dựng mới SPA quản trị ──
9. Tạo thư mục admin/ ở gốc repo: Vite + React 18 + TypeScript + Tailwind +
   React Router + TanStack Query. KHÔNG dùng npm workspaces — đây là dự án
   npm độc lập, cài riêng.
   - lib/apiClient.ts: hiểu envelope {ok,data}, gắn Bearer, tự refresh.
     AUTH_TRANSPORT=cookie dùng được ở đây (admin là web thật).
   - Đăng nhập dùng chung /api/auth/login, kiểm role==='admin' mới cho vào.
   - Layout: sidebar + breadcrumb + user menu.
10. A01 Dashboard: đếm bài theo status, số country, số location, job failed.
    Query thật, không mock.
11. A02 Countries & Topics: bảng + form CRUD.
12. ★ A03 Legal Articles — MÀN HÌNH QUAN TRỌNG NHẤT CỦA CẢ DỰ ÁN:
    - Bảng: lọc country/topic/status, tìm theo title, phân trang.
    - Form soạn bài đủ field theo master plan C.3: title, slug (tự sinh từ
      title, sửa được), summaryVi, bodyMd (textarea + preview markdown),
      keyPoints (list động, có severity normal|criminal), penalties (bảng động),
      exceptions, foreignerNotes, riskLevel, tags, effectiveFrom/To.
    - SOURCES: editor danh sách động (title, url, authority, kind, publishedAt,
      accessedAt). Hiện CẢNH BÁO ĐỎ ngay trên form nếu chưa đủ điều kiện publish.
    - Thanh trạng thái: badge + nút chuyển trạng thái + confirm dialog.
    - Nút "Tạo phiên bản mới".
    - Autosave draft vào localStorage mỗi 10s (nhập một bài mất 30 phút).
13. A05 SOS Locations: bảng + form CRUD, chọn toạ độ bằng bản đồ
    (Leaflet + OpenStreetMap, click đặt marker — KHÔNG dùng Places API).
    Có cờ verified + verifiedAt + source.
14. A-Audit: bảng audit log, lọc theo entityType/actor/ngày.

── PHẦN 3: contracts ──
15. Bổ sung contracts/README.md + fixtures cho toàn bộ endpoint admin mới.

KHÔNG LÀM: RAG/embedding thật, màn hình mobile, feedback, alerts, incidents.

DEFINITION OF DONE:
□ backend lint+test xanh · admin typecheck+build xanh
□ Non-admin gọi mọi /api/admin/* → 403 FORBIDDEN (test tự động duyệt route)
□ Publish bài thiếu source → 422, details liệt kê ĐÚNG field thiếu
□ Publish bài hợp lệ → status published, isCurrent=true, job reindex xuất hiện
□ Publish version 2 → version 1 tự động superseded + isCurrent=false
□ Partial unique index chặn được 2 bản cùng isCurrent
□ Hai tab cùng sửa 1 bài → tab thứ hai nhận CONFLICT, không ghi đè
□ Mọi thao tác admin ghi đúng audit log
□ Nhập thử 1 bài luật KR thật từ đầu đến publish trong dưới 15 phút
```

---

## PROMPT B3 — Public content API + nối mobile Explore/Search/Article

```
Đọc CLAUDE.md. Nối tầng nội dung của mobile vào DB thật.

── backend: API công khai (không cần token, LUÔN filter
   status:'published' VÀ isCurrent:true) ──
1. GET /api/countries · GET /api/countries/:code
2. GET /api/legal/topics?country=
3. GET /api/legal/articles?country=&topic=&page=&limit=
4. GET /api/legal/articles/:country/:slug  (+ relatedArticles cùng topic, tối đa 4)
5. GET /api/legal/search?q=&country=&topic=&page=
   - Batch này dùng $regex trên field titleNorm/summaryNorm (lowercase + bỏ dấu
     bằng normalize('NFD').replace(/\p{Diacritic}/gu,'')). Chưa có legal_chunks.
   - ★ Kiến trúc qua interface SearchDriver trả về shape CHUẨN HOÁ SearchHit
     (docs/03_Contracts_v2.md). B4 sẽ thay driver sang Atlas Search trên
     legal_chunks mà KHÔNG được phải sửa controller hay màn hình.
   - Empty state: trả gợi ý topic phổ biến của country đó.
6. Trips & preferences thật: CRUD /api/users/trips, PUT .../:id/current
   (đảm bảo chỉ 1 trip isCurrent mỗi user, xử lý ở service layer).
7. Seed tối thiểu để mobile có dữ liệu chạy: 4 countries (KR active;
   JP/TH/SG coming_soon), 6 legal_topics KR.

── mobile: nối API thật, KHÔNG SỬA MÀN HÌNH ──
8. ★ mobile/src/lib/api/adapters.ts — cầu nối mô hình dữ liệu
   (master plan C.3). Ánh xạ response API sang đúng shape mà màn hình đang dùng:
     sources[0]  → source { name, agency, url }
     penalties[] → fines: string[]   (dùng amountText)
     summaryVi   → summary
     topicSlug   → topicKey
     effectiveFrom/updatedAt → updatedAt (chuỗi hiển thị)
   Viết adapter thành pure function, có unit test đối chiếu
   contracts/fixtures/.
9. mobile/src/lib/api/content.ts: fetchCountries, fetchCountry, fetchTopics,
   fetchArticles, fetchArticle, searchArticles, fetchTrips, createTrip,
   setCurrentTrip, deleteTrip — CÙNG CHỮ KÝ với mocks/client.ts.
10. Cập nhật mobile/src/lib/data.ts để các hàm trên trỏ sang api/ khi
    EXPO_PUBLIC_USE_MOCKS=false.
11. Kiểm tra lại 6 màn hình: index, explore, explore/[country]/[slug], search,
    trips, trips/new — chạy đúng với dữ liệu thật. Chỉ sửa component nếu
    THỰC SỰ vỡ, và ghi rõ lý do.
12. Xử lý country chưa hỗ trợ (coming_soon): hiện trạng thái rõ ràng,
    KHÔNG bịa nội dung, không lỗi.

DEFINITION OF DONE:
□ Bài draft/superseded KHÔNG xuất hiện ở bất kỳ endpoint công khai nào
  (test riêng cho từng endpoint)
□ Đổi country trên app → explore/search/context đổi đúng
□ Search tiếng Việt KHÔNG DẤU ra kết quả ("phat vape" → "phạt vape")
□ EXPO_PUBLIC_USE_MOCKS=false: 6 màn hình chạy bằng dữ liệu thật
□ EXPO_PUBLIC_USE_MOCKS=true: vẫn chạy như cũ
□ adapters.ts có test đối chiếu contracts/fixtures/
```

---

## PROMPT B4 — RAG engine + guardrails + golden test ★ (trái tim sản phẩm)

```
Đọc CLAUDE.md mục 7 (hợp đồng chống ảo giác) và docs/00_BeTravel_MasterPlan_v2.md
phần B.3–B.9, C.4, C.5. Batch này quyết định sản phẩm có khác ChatGPT hay không.

1. Model legal_chunks theo master plan. Field embedding khai select:false.

2. backend/src/rag/embedding/: interface EmbeddingProvider + GeminiEmbedding
   + OpenAIEmbedding + MockEmbedding (hash-based, tất định, cho test).
   Provider thật ép dims=768. Batch tối đa 50 text/lần, retry backoff.

3. backend/src/rag/llm/: interface LlmProvider + GeminiLlm + OpenAiLlm
   + ★ MockLlm (LLM_PROVIDER=mock, tất định) + MockLlm.hallucinating()
   (cố tình sinh marker [S9] không tồn tại và một con số tiền không nguồn —
   dùng để TEST rằng guard thật sự chặn được).
   BẮT BUỘC có mock, nếu không golden test và CI phải đốt quota thật.

4. backend/src/rag/chunking.js theo master plan C.5:
   - Cắt theo heading markdown; >1200 ký tự cắt theo câu overlap 15%;
     <200 ký tự gộp với section kế.
   - PREPEND dòng ngữ cảnh vào text đem đi embed (không lưu vào text hiển thị).
   - Mỗi penalty sinh thêm 1 chunk "Hành vi ... → mức phạt ...".
   - Sinh textNorm cho mọi chunk.

5. backend/src/rag/search/: interface SearchDriver, 2 implementation:
   - AtlasSearchDriver: $vectorSearch (filter countryCode + status,
     numCandidates, limit, $meta vectorSearchScore) và $search (txt_idx).
   - MemorySearchDriver: chunk trong RAM, cosine + regex textNorm.
     CÙNG shape kết quả. Cache module TTL 60s, invalidate sau re-index.
   - Ghi docs/atlas-indexes.md chứa JSON vec_idx + txt_idx
     (docs/03_Contracts_v2.md §5) kèm hướng dẫn tạo trên Atlas UI và
     LƯU Ý phải chờ trạng thái ACTIVE mới chạy reindex.

6. backend/src/rag/retrieval.js:
   - retrieve(question, ctx) → { chunks, topScore, passed, reason }
   - ★ PHÒNG THỦ HAI LỚP: sau $vectorSearch PHẢI $lookup về legal_articles và
     $match { 'a.status':'published', 'a.isCurrent':true }. KHÔNG tin field
     status copy trên chunk (job purge có thể thất bại). Lấy luôn
     sources/title/updatedAt từ lookup để dựng citation.
   - Ngưỡng RAG_MIN_TOP_SCORE / RAG_MIN_SOFT_SCORE / RAG_MIN_CHUNKS.
     KHÔNG ĐẠT → trả sớm, KHÔNG gọi LLM.
   - Hybrid: vector + keyword song song, hợp nhất bằng Reciprocal Rank Fusion
     tự cài (k=60). KHÔNG dùng $rankFusion (cần MongoDB 8.0, không chắc có trên M0).
   - Ngưỡng áp lên score GỐC của vector search, KHÔNG áp lên fusedScore.
   - focusArticleId: chạy retrieval bình thường, SONG SONG lấy chunk của bài đó,
     đưa vào RRF thành list thứ ba weight 0.5. KHÔNG dùng làm filter.

7. backend/src/rag/prompt.js: system prompt lấy NGUYÊN VĂN từ
   docs/03_Contracts_v2.md §7. Context render thành khối [S1]..[Sn].
   Ép LLM trả JSON { answer, usedSources[], confidence, needsOfficialHelp }.

8. ★ backend/src/rag/guard.js — HẬU KIỂM BẰNG CODE, PHẦN QUAN TRỌNG NHẤT.
   Code mẫu ở docs/03_Contracts_v2.md §8. Viết thành pure function để test dễ.
   a. Marker [Sn] không thuộc tập truy hồi → xoá + đếm violation + log.
   b. answer chứa tuyên bố định lượng (regex: số tiền + đơn vị KRW|won|THB|
      baht|USD|SGD|JPY|yen|₫|VNĐ|đồng, /điều \d+/, /\d+ năm tù/, /phạt/,
      /cấm/) mà usedSources rỗng → HẠ CẤP xuống fallback INSUFFICIENT_EVIDENCE,
      KHÔNG trả answer của LLM.
   c. Luôn gắn disclaimer từ config.

9. backend module chat:
   - POST/GET /api/chat/sessions, GET /api/chat/sessions/:id/messages,
     POST /api/chat/sessions/:id/messages, DELETE session
   - ★ TRẢ MỘT LẦN, KHÔNG STREAMING (master plan B.7 — fetch của React Native
     không hỗ trợ ReadableStream ổn định). Thiết kế sẵn tham số ?stream=true
     cho admin web/Phase 2 nhưng mặc định tắt.
   - Lưu message kèm citations, retrieval metadata, model, latency, tokens,
     fallbackReason.
   - Rate limit theo user + ★ QUOTA LƯU DB: users.aiUsage {date,count}, chặn
     khi vượt AI_DAILY_QUOTA_USER (→ QUOTA_EXCEEDED); van toàn hệ thống
     AI_DAILY_QUOTA_GLOBAL. Rate limit RAM reset khi restart nên KHÔNG được
     là cơ chế duy nhất bảo vệ chi phí.
   - ai_cache: key sha256(normalize(q)+country+sortedChunkIds), TTL 24h.
   - ai_events: telemetry đầy đủ.
   - Retrieval fail → message fallback có gợi ý (mở SOS / xem cẩm nang topic
     liên quan / gọi cơ quan bảo hộ). KHÔNG BAO GIỜ đoán điều luật.

10. Job worker thật: handler reindex_article (chunk → embed → upsert chunks →
    cập nhật indexState) và purge_chunks. Idempotent: re-index xoá chunk cũ của
    (articleId, version) trước khi ghi mới.
    Thêm POST /api/admin/rag/reindex-country, GET /api/admin/rag/status.
    Màn hình admin A04 RAG Index: bảng trạng thái từng bài + nút re-index +
    hiển thị lỗi.

11. ★ GOLDEN TEST: backend/test/golden/kr.json + npm run test:golden,
    chạy với SEARCH_DRIVER=memory và LLM_PROVIDER=mock.
    - 15 câu must_answer: citations chứa expectedArticleSlug
    - 6 câu must_refuse (nước chưa hỗ trợ / điều luật bịa / ngoài phạm vi):
      fallbackReason=INSUFFICIENT_EVIDENCE và answer KHÔNG chứa số tiền
      hay "điều \d+"
    - 4 câu country_isolation: context KR, hỏi về Thái → không trả dữ liệu KR
      như thể là của Thái
    Tạo 8 bài luật KR mẫu (đánh dấu RÕ là dữ liệu mẫu, seed ở trạng thái draft
    nếu chưa có nguồn thật) để golden test có gì mà chạy.

KHÔNG LÀM: UI chat mobile (B5), translator, feedback UI.

DEFINITION OF DONE:
□ npm run test:golden xanh 100%
□ ★ Test guard với MockLlm.hallucinating(): guard PHẢI xoá marker giả VÀ
  hạ cấp xuống fallback. Không có test này thì không ai biết guardrail có chạy.
□ Admin sửa bài + re-index → truy vấn ngay được dữ liệu mới (test tự động)
□ Bài chuyển superseded → chunk bị xoá VÀ $lookup chặn được kể cả khi job
  purge chưa chạy (test CẢ HAI lớp phòng thủ)
□ Câu hỏi về nước chưa có dữ liệu → INSUFFICIENT_EVIDENCE, không bịa
□ SEARCH_DRIVER=memory và =atlas cho cùng shape kết quả
□ Response chat KHÔNG chứa field embedding
□ LLM_PROVIDER=mock chạy toàn bộ test không gọi API thật
```

---

## PROMPT B5 — Nối chat mobile + feedback + admin queue

```
Đọc CLAUDE.md. Nối màn hình chat có sẵn vào RAG thật.

BỐI CẢNH: mobile/src/app/chat/index.tsx đã dựng xong, đang gọi
askLegalAssistant() từ mocks/client.ts. Kiểu trả về ChatAnswer đã có 2 biến thể
'answered' và 'insufficient_evidence' — TRÙNG với thiết kế backend. Tận dụng.

── mobile ──
1. mobile/src/lib/api/chat.ts: askLegalAssistant CÙNG CHỮ KÝ và CÙNG kiểu trả về
   ChatAnswer như mock. Adapter map response API sang ChatAnswer:
     fallbackReason != null → { status:'insufficient_evidence', reason, suggestions }
     ngược lại            → { status:'answered', updatedAt, content, sources[] }
   Bổ sung session: tạo/lấy session, lưu lịch sử. Nếu cần mở rộng ChatAnswer thì
   mở rộng THÊM field optional, không đổi field cũ.
2. Cập nhật data.ts. Kiểm tra chat/index.tsx + features/chat/AnswerCard.tsx
   chạy đúng với dữ liệu thật.
3. ★ Marker [S1] trong nội dung: làm clickable, mở bài luật tương ứng
   (router.push tới explore/[country]/[slug]). AnswerCard đã render sources —
   kiểm tra và bổ sung nếu thiếu.
4. ★ Trạng thái fallback: hiển thị KHỐI RIÊNG BIỆT (màu khác, icon cảnh báo),
   kèm 3 CTA: Xem cẩm nang <topic> · Mở SOS · Gọi cơ quan bảo hộ.
   TUYỆT ĐỐI không hiển thị câu trả lời phỏng đoán.
5. Disclaimer cố định ở chân khung chat.
6. Feedback: mỗi câu trả lời có Hữu ích / Không hữu ích / Báo sai.
   "Báo sai" mở modal nhập ghi chú. Gọi POST /api/feedback.
   (chat/index.tsx đã có state `feedback` — nối vào API)
7. Danh sách session + "Cuộc trò chuyện mới" (dùng @gorhom/bottom-sheet đã cài).
8. CTA "Hỏi AI về bài này" từ màn hình article → prefill câu hỏi + truyền
   focusArticleId.

── backend ──
9. Module feedback: POST /api/feedback (user), GET/PATCH /api/admin/feedback.
   Lưu targetType, targetId, rating, note, context{countryCode, question},
   status, reviewerId, reviewerNote. Rate limit chống spam.

── admin ──
10. A08 Feedback Queue: bảng lọc theo rating/status/country; xem chi tiết
    (câu hỏi, câu trả lời, các chunk đã truy hồi kèm score); đổi status;
    ghi chú reviewer; LINK TRỰC TIẾP tới bài luật liên quan để sửa.
11. A01 Dashboard nâng cấp: số liệu từ ai_events — số lượt chat, tỉ lệ fallback,
    ★ TOP CÂU HỎI BỊ FALLBACK (đây là danh sách việc cần nhập liệu bổ sung,
    rất giá trị cho nhóm nội dung), latency trung bình, ước tính chi phí
    AI theo ngày, số feedback chờ xử lý. GET /api/admin/analytics/overview.

DEFINITION OF DONE:
□ Hỏi AI trên app thật → nhận câu trả lời có nguồn từ DB thật
□ Hỏi câu ngoài dữ liệu → khối fallback riêng biệt, không có câu trả lời đoán
□ Marker [S1] bấm được, mở đúng bài luật
□ Gửi feedback → admin thấy → resolve → luồng khép kín
□ Vượt quota → QUOTA_EXCEEDED, app hiện thông báo rõ ràng
□ Feedback KHÔNG tự động sửa knowledge base
```

---

## PROMPT B6 — SOS: locations API + admin + map thật

```
Đọc CLAUDE.md mục 10 (không dùng Places API) và master plan B.8.

BỐI CẢNH: mobile/src/app/sos/index.tsx và sos/map.tsx đã dựng,
react-native-maps đã cài và CHẠY ĐƯỢC TRONG EXPO GO SDK 57.

── backend ──
1. GET /api/support-locations/nearby?lat&lng&country&type&radiusKm&limit
   → $geoNear, trả kèm distanceMeters, sắp xếp tăng dần. verified=true ưu tiên.
   ★ $geoNear PHẢI là stage ĐẦU TIÊN; bộ lọc countryCode/status/type đặt trong
     `query` của chính $geoNear, KHÔNG dùng $match phía trước.
   ★ GeoJSON là [lng, lat]. Viết test với toạ độ THẬT của Đại sứ quán VN tại
     Seoul (37.5385, 126.9715) để bắt lỗi đảo thứ tự.
2. GET /api/support-locations?country=&type= → fallback khi từ chối GPS.
3. Validate publish location: có name, address, >=1 phone HOẶC website,
   toạ độ hợp lệ.

── mobile ──
4. mobile/src/lib/api/sos.ts: fetchSupportLocations CÙNG CHỮ KÝ mock,
   thêm fetchNearbyLocations(lat,lng,...). Cập nhật data.ts.
5. Xin quyền vị trí: npx expo install expo-location. GIẢI THÍCH RÕ vì sao cần
   vị trí TRƯỚC khi xin quyền — không xin ngay lúc vào app.
6. sos/map.tsx: MapView với PROVIDER_DEFAULT (Apple Maps trên iOS — miễn phí,
   không cần key). Marker theo type có màu/icon khác nhau.
7. Chi tiết điểm: tên, tên bản địa, địa chỉ, phone, giờ mở cửa, khoảng cách,
   badge "Đã kiểm chứng" + ngày kiểm chứng.
8. Nút GỌI (Linking tel:) · CHỈ ĐƯỜNG (deep link: maps:// trên iOS,
   google.com/maps/dir/?api=1 trên Android) · COPY địa chỉ
   (expo-clipboard đã cài — hữu ích khi đưa tài xế taxi xem).
9. ★ SOS phải vào được trong <=2 thao tác từ mọi màn hình chính.
   Kiểm tra AppShell/BottomActionBar đã có nút SOS chưa; nếu chưa thì thêm.
10. ★ XỬ LÝ 3 TRƯỜNG HỢP HỎNG:
    - Từ chối GPS → chọn thành phố/khu vực thủ công
    - Không có điểm gần → tự mở rộng bán kính, rồi hiện toàn bộ của quốc gia
    - Map lỗi/không tải được → tự chuyển sang danh sách contact thuần text
      (PHẢI test bằng cách ngắt mạng)
11. Cache danh sách location của country hiện tại vào AsyncStorage, hiện được
    khi mất mạng (banner "dữ liệu ngoại tuyến"). Tình huống SOS rất hay mất mạng.

── admin ──
12. Hoàn thiện A05: bulk import CSV location, nút verify hàng loạt.

DEFINITION OF DONE:
□ SOS <=2 thao tác từ Home, Explore, Chat
□ Cho phép GPS → danh sách đúng thứ tự khoảng cách
□ Từ chối GPS → vẫn dùng được qua chọn thủ công
□ Ngắt mạng → fallback danh sách text + cache hoạt động
□ tel: và deep link chỉ đường mở đúng ứng dụng
□ Test $geoNear với toạ độ thật, không bị đảo lat/lng
□ Chạy được trong Expo Go trên cả iOS và Android
```

---

## PROMPT B7 — Incidents + Translator

```
Đọc CLAUDE.md. Nối 2 nhóm màn hình đã dựng sẵn.

── PHẦN 1: INCIDENTS ──
backend:
1. Model IncidentType với steps[] NHÚNG (order, title, body[], checklist[],
   contactRefs[] → support_locations, articleRefs[] → legal_articles,
   ctas[{type:'map'|'call'|'ai'|'link', payload}]). countryCode null = toàn cục.
2. GET /api/incidents?country= (gộp toàn cục + theo country)
   GET /api/incidents/:slug
   GET/PUT /api/users/incident-progress/:incidentId
3. Admin A07 Incident Workflow Builder: thêm/xoá/kéo thả sắp xếp bước,
   soạn checklist, gắn contact/article ref bằng picker có tìm kiếm.

mobile:
4. lib/api/incidents.ts cùng chữ ký mock. Cập nhật data.ts.
5. incidents/[slug].tsx: progress lưu SERVER khi đã đăng nhập (hiện đang là
   state cục bộ), resume đúng sau khi đăng nhập lại. StepProgress component
   đã có — nối vào API.
6. Guest xem được workflow nhưng không lưu progress → banner mời đăng nhập.
7. Mỗi bước có CTA ngữ cảnh: "Tìm đồn cảnh sát gần nhất" (→ sos/map lọc
   type=police), "Gọi Đại sứ quán" (tel:), "Hỏi AI về bước này" (→ chat prefill).
8. Country chưa có workflow → điều hướng sang SOS + hotline + AI, không trang trắng.

── PHẦN 2: TRANSLATOR ──
backend:
9. POST /api/translate { text, from, to, mode:'text'|'phrase' }
   - LLM với prompt CHỈ DỊCH (không trả lời, không bình luận)
   - Giới hạn 500 ký tự, rate limit riêng, lỗi upstream → UPSTREAM_ERROR
10. Model QuickPhrase + GET /api/quick-phrases?country=
    Seed >=25 câu KR: mất hộ chiếu, cần cảnh sát, cần bệnh viện, cần liên hệ
    Đại sứ quán Việt Nam, tôi không nói được tiếng Hàn, tôi cần phiên dịch,
    tôi bị mất cắp, xin gọi giúp số này...
11. Admin: CRUD quick phrases.

mobile:
12. lib/api/translate.ts cùng chữ ký mock. Cập nhật data.ts.
13. ★ Nút PHÓNG TO TOÀN MÀN HÌNH chữ lớn cho bản dịch — để đưa điện thoại cho
    cảnh sát/người bản địa đọc. Chi tiết nhỏ nhưng đúng use case thật.
14. ★ expo-speech đã cài sẵn: nút đọc to bản dịch. Rất hữu ích khi người nghe
    không đọc được màn hình.
15. Copy bản dịch (expo-clipboard đã cài).
16. ★ OFFLINE: quick phrases của country hiện tại cache vào AsyncStorage,
    dùng được khi mất mạng hoặc API dịch lỗi. Mất mạng là tình huống rất
    thường gặp ở nước ngoài.

DEFINITION OF DONE:
□ Progress lưu/resume đúng theo từng user, không lẫn giữa 2 user
□ Guest xem workflow được, không lưu được progress
□ CTA từ step mở đúng sos/map đã lọc type / đúng chat prefill
□ Dịch 2 chiều hoạt động; input rỗng và >500 ký tự bị chặn rõ ràng
□ Ngắt API dịch → quick phrases offline vẫn dùng được
□ expo-speech đọc được bản dịch
```

---

## PROMPT B8 — Alerts + Trips/Favorites/Profile thật (bỏ nốt mock cuối cùng)

```
Đọc CLAUDE.md. Sau batch này mobile KHÔNG CÒN phụ thuộc src/mocks/ nữa.

── PHẦN 1: ALERTS ──
backend:
1. Model GeoAlert: countryCode, scope 'country'|'area', center Point + radiusM
   (2dsphere), title, message, severity, behaviorsToAvoid[], linkedArticleId,
   effectiveFrom/To, status.
2. GET /api/alerts/applicable?country=&lat=&lng=
   - Có toạ độ → alert scope 'area' trong bán kính + alert scope 'country'
   - Không có toạ độ → chỉ alert scope 'country'
   - LUÔN lọc status published + còn hiệu lực. Sắp xếp severity giảm dần.
3. Admin A06 Geo Alert CRUD: chọn tâm + bán kính trên bản đồ Leaflet (vẽ circle),
   khoảng hiệu lực, gắn linkedArticle bằng picker, preview như user sẽ thấy.

mobile:
4. lib/api/alerts.ts cùng chữ ký mock (fetchAlerts, markAlertRead,
   markAllAlertsRead). Cập nhật data.ts.
5. Hook usePollAlerts: gọi khi app active + đổi country + đổi vị trí đáng kể
   (>500m). KHÔNG poll liên tục (tốn pin, tốn quota). Tối thiểu 5 phút/lần.
6. Banner alert ở AppShell (severity danger = modal chặn, warn/info = banner).
   Nội dung: lý do, hành vi cần tránh, nguồn, CTA "Xem chi tiết".
7. Dismiss lưu AsyncStorage theo alertId, không hiện lại trong 24h.
8. Setting bật/tắt cảnh báo vị trí trong settings, tôn trọng quyền hệ thống.
9. Không có alert → KHÔNG hiện placeholder gây nhiễu.
10. MVP KHÔNG làm push khi app đóng (master plan Phần G).

── PHẦN 2: PROFILE / FAVORITES / TRIPS ──
backend:
11. GET/POST/DELETE /api/users/favorites (targetType: article|location|incident)
12. Favorite trỏ tới bài đã superseded → vẫn trả nhưng gắn cờ isOutdated +
    link tới version hiện hành.
13. PUT /api/users/preferences (locale, alert, location consent).

mobile:
14. profile/index.tsx và settings/index.tsx: nối API thật — thông tin cá nhân,
    quản lý trips, preferences, đổi mật khẩu, đăng xuất.
    (settings hiện đang import countries từ mocks/fixtures — chuyển sang API)
15. Tab Favorites: gom nhóm theo loại, bài lỗi thời có badge "Đã có bản mới".
16. Tab Lịch sử chat: mở lại session, đổi tên, xoá.
17. ★ PRIVACY: khối giải thích "Chúng tôi dùng vị trí của bạn để làm gì" +
    nút tắt rõ ràng + nút xoá lịch sử chat. Không lưu location history.

── DỌN DẸP ──
18. ★ Kiểm tra KHÔNG còn màn hình nào import trực tiếp từ '@/mocks/client'
    hoặc '@/mocks/fixtures' (grep toàn bộ src/app). Tất cả phải qua '@/lib/data'.
19. Giữ lại src/mocks/ làm đường lùi cho EXPO_PUBLIC_USE_MOCKS=true và cho test.

DEFINITION OF DONE:
□ Alert hết hạn/inactive không xuất hiện
□ Từ chối GPS → vẫn nhận alert cấp quốc gia
□ Dismiss không hiện lại trong 24h
□ Favorites/preferences/history còn nguyên sau khi đăng nhập lại
□ Favorite bài superseded → cờ lỗi thời + link bản mới
□ grep '@/mocks' trong src/app → 0 kết quả
□ EXPO_PUBLIC_USE_MOCKS=true vẫn chạy toàn bộ app
```

---

## PROMPT B9 — Hardening, seed, build & demo

```
Đọc CLAUDE.md. Batch cuối: làm cho sản phẩm SẴN SÀNG NỘP và không vỡ trước hội đồng.

1. SEED (backend/src/seed/):
   - npm run seed: 1 admin, 4 countries (KR active; JP/TH/SG coming_soon),
     6 legal_topics KR, >=15 legal_articles KR, 12 support_locations KR,
     5 incident_types, 6 geo_alerts, 25 quick_phrases.
   - ★ MỖI BÀI LUẬT PHẢI CÓ NGUỒN THẬT. Nếu nhóm chưa cung cấp, tạo
     seed/data/kr-articles.json với đầy đủ cấu trúc, trường source ĐỂ TRỐNG +
     chú thích rõ "CẦN NGƯỜI ĐIỀN NGUỒN THẬT TRƯỚC KHI PUBLISH", và seed ở
     trạng thái 'draft' chứ KHÔNG published. TUYỆT ĐỐI KHÔNG BỊA NGUỒN.
   - npm run seed:demo = seed + reindex toàn bộ. Seed idempotent.

2. QA & SECURITY SWEEP:
   - Rà MỌI endpoint đọc nội dung: có filter status:'published' + isCurrent:true
     chưa? Viết test cho từng cái.
   - Rà MỌI route /api/admin/*: có requireRole chưa? Test tự động DUYỆT DANH
     SÁCH ROUTE và assert, không kiểm thủ công.
   - CORS whitelist prod, helmet header, rate limit từng nhóm, quota DB.
   - grep toàn repo: secret hard-code, console.log thừa, TODO còn sót.
   - Prod: không trả stack trace, không lộ tên collection trong message lỗi.
   - Xác nhận backend/README.md không còn host cluster thật.

3. MOBILE POLISH:
   - Mọi màn hình có đủ loading / empty / error state.
   - Mất mạng: banner offline, dữ liệu cache vẫn xem được.
   - ErrorBoundary + màn hình lỗi chung.
   - Kiểm tra trên màn hình nhỏ (iPhone SE 375px) và màn hình lớn.
   - Vùng chạm nút SOS >=44px, tương phản >=4.5:1.
   - npx expo-doctor sạch.

4. E2E thủ công theo kịch bản demo:
   đăng ký → chọn KR → mở cẩm nang (thấy nguồn + ngày) → search → mở bài →
   hỏi AI (có nguồn) → hỏi câu ngoài dữ liệu (fallback) → SOS <=2 thao tác →
   map → incident mất hộ chiếu → tick step → admin sửa bài + re-index →
   AI dùng dữ liệu mới → user report → admin resolve.
   Viết thành docs/DEMO_SCRIPT.md, từng bước bấm gì nói gì.

5. DEPLOY & BUILD:
   - backend lên Render: render.yaml, biến môi trường, /api/health.
   - ★ .github/workflows/keepalive.yml: cron */10 ping /api/health
     (chống Render ngủ 50s). Xác nhận đã chạy ít nhất 1 lần.
   - admin lên Vercel.
   - mobile: cấu hình EAS (eas.json), build preview APK/IPA để nộp bài.
     app.json thêm plugin react-native-maps với androidGoogleMapsApiKey.
   - docs/DEPLOY.md: từng bước từ zero, KỂ CẢ cách tạo 2 Atlas search index
     và lưu ý phải chờ trạng thái ACTIVE mới reindex.

6. ★ docs/DEMO_SCRIPT.md phải có mục "CHECKLIST TRƯỚC DEMO 30 PHÚT":
   - Warm-up API (gọi /api/health vài lần cho Render thức dậy)
   - Kiểm tra quota AI còn lại; chuẩn bị key dự phòng
   - Chạy seed:demo trên môi trường demo
   - Mở sẵn tab admin đã đăng nhập
   - Chuẩn bị SEARCH_DRIVER=memory làm phương án dự phòng nếu Atlas trục trặc
   - Sạc đầy điện thoại demo, tắt thông báo, bật chế độ không làm phiền

7. TÀI LIỆU BÀN GIAO:
   - README.md gốc: kiến trúc 3 workspace, cách chạy từng cái, cách thêm
     quốc gia mới.
   - docs/API.md: bảng endpoint + request/response mẫu.
   - docs/ACCEPTANCE.md: bảng AC-01..AC-12 của Use Case Spec, mỗi dòng ghi
     cách chứng minh (test nào / thao tác nào).

DEFINITION OF DONE:
□ backend lint+test+test:golden xanh
□ mobile tsc+lint+test xanh, expo-doctor sạch
□ admin typecheck+build xanh
□ Deploy public: backend + admin + DB tách biệt, không secret trong source
□ Build được APK/IPA cài lên máy thật
□ AC-01 → AC-12 có bằng chứng trong docs/ACCEPTANCE.md
□ Chạy thử toàn bộ DEMO_SCRIPT.md một lượt trên môi trường production
```

---

## PHỤ LỤC A — PROMPT SỬA LỖI GIỮA CÁC BATCH

```
Đọc CLAUDE.md. Tôi cần sửa: <mô tả>.

RÀNG BUỘC:
- Nếu phải đổi hình dạng API, sửa contracts/ TRƯỚC, rồi backend và client
  trong CÙNG commit. Liệt kê cho tôi mọi chỗ bị ảnh hưởng TRƯỚC KHI sửa.
- Không tạo thêm Atlas Search/Vector index (đã dùng 2/3 trên M0).
- Không sửa component màn hình mobile trừ khi có lý do nghiệp vụ rõ ràng —
  khác biệt dữ liệu xử lý ở src/lib/api/adapters.ts.
- Không thêm dependency mới nếu chưa giải thích vì sao thư viện hiện có
  không làm được. Mobile: dùng `npx expo install`, KHÔNG dùng npm install.
- Không mở rộng sang các tính năng trong "KHÔNG làm ở MVP".
- Chạy lint + typecheck + test trước khi báo xong.
```

## PHỤ LỤC B — THỨ TỰ ƯU TIÊN NẾU HẾT THỜI GIAN

Nếu tới hạn mà chưa xong hết, cắt theo thứ tự này (cắt từ dưới lên):

| Ưu tiên | Hạng mục | Lý do |
|---|---|---|
| 1 | B1 auth thật + B2 admin + B3 nội dung | Không có cái này thì không có sản phẩm |
| 2 | B4 RAG + guardrail + golden test | Đây là điểm khác biệt duy nhất so với ChatGPT |
| 3 | B5 chat mobile | Hiện thực hoá điểm khác biệt trên |
| 4 | B6 SOS | Giá trị cao, dễ demo, ít rủi ro |
| 5 | B9 hardening tối thiểu + seed | Để demo được |
| 6 | B7 incidents + translator | Đẹp nhưng cắt được — UI đã có, chạy mock vẫn demo được |
| 7 | B8 alerts + favorites | Cắt được đầu tiên |

Màn hình đã dựng sẵn chạy trên mock vẫn **demo được**. Cái không giả được là
**AI có nguồn và biết từ chối** — đó là lý do B4 không bao giờ được cắt.
