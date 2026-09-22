# CLAUDE.md — Be.Travel

> **Đặt file này ở GỐC repo** (`BeTravel/CLAUDE.md`). Claude Code tự đọc mỗi phiên.
> Đây là file điều phối duy nhất. Đọc xong, bạn tự biết dự án đang ở đâu và phải làm gì tiếp.
> `mobile/CLAUDE.md` --> `mobile/AGENTS.md` (hướng dẫn Expo) **giữ nguyên**. Khi làm trong `mobile/`, tuân thủ cả hai.
> `docs/01_CLAUDE_root.md` đã bị file này thay thế — **xóa nó đi** để tránh hai nguồn sự thật.

---

# PHAN 0 — QUY TRINH TU VAN HANH

Mỗi phiên làm việc, dù người dùng nói gì (kể cả chỉ nói "tiếp tục", "làm tiếp đi", "chạy đi"), **luôn chạy đủ 4 bước theo thứ tự**:

```
BƯỚC 1  ĐỊNH VỊ   --> Dự án đang ở đâu?            (Phần 2)
BƯỚC 2  CHỌN VIỆC --> Batch tiếp theo? Đủ điều kiện? (Phần 3)
BƯỚC 3  THỰC THI  --> Mở prompt tương ứng, thi hành  (Phần 4)
BƯỚC 4  GHI SỔ    --> Nghiệm thu + quét tối ưu + ghi sổ + commit (Phần 5)
```

**Chế độ mặc định: làm MỘT batch rồi dừng, báo cáo.** Mỗi batch rất lớn; làm liên tiếp sẽ tràn context và chất lượng tụt. Chỉ làm nhiều batch liên tiếp khi người dùng nói rõ.

**Không hỏi lại những gì có thể tự tra được trên đĩa.** Chỉ dừng hỏi khi rơi vào Phần 8.

---

# PHAN 1 — SAN PHAM & CAU TRUC

Be.Travel là **app mobile** hỗ trợ pháp lý cho người Việt du lịch nước ngoài. Bốn lớp:

1. **Kho tri thức pháp lý đã kiểm chứng** — có nguồn, có version, có ngày hiệu lực
2. **Trợ lý AI dùng RAG** — luôn trích dẫn nguồn, **từ chối khi không đủ dữ liệu**
3. **Hỗ trợ tại chỗ** — SOS map, workflow sự cố, cảnh báo vị trí, dịch khẩn cấp
4. **Admin Portal** — nơi duy trì dữ liệu của lớp 1

Thị trường đầu tiên **Hàn Quốc (KR)**, nhưng **không hard-code KR vào business logic** — mọi thứ country-driven qua dữ liệu.

```
BeTravel/
├─ CLAUDE.md          <-- file này
├─ contracts/         nguồn sự thật API (README.md + fixtures/*.json). Tạo ở B1
├─ backend/           Express 5 · Mongoose 9 · Zod 4 · JAVASCRIPT ESM
├─ mobile/            Expo 57 · expo-router · NativeWind · TypeScript
├─ admin/             Vite · React · TS · Tailwind. Tạo ở B2
└─ docs/
   ├─ 00_BeTravel_MasterPlan_v2.md       kiến trúc, mô hình dữ liệu, rủi ro
   ├─ 02_ClaudeCode_Batch_Prompts_v2.md  [!] 9 prompt chi tiết — nguồn việc
   ├─ 03_Contracts_v2.md                 code mẫu: envelope, guard, index JSON, prompt AI
   ├─ 04_Repo_Audit.md                   hiện trạng + 8 xung đột đã chốt cách xử lý
   ├─ 05_ToiUuHeThong.md                 [!] 13 quy tắc Clean Code — chuẩn viết code
   ├─ PROGRESS.md                        [!] sổ tiến độ — tự tạo & tự cập nhật
   └─ OPTIMIZATION_REPORT.md             [!] sổ tối ưu — tự tạo & tự cập nhật
```

Ba workspace là **ba dự án npm độc lập**, `npm install` riêng. **Không dựng npm workspaces** — Metro bundler của Expo cộng monorepo là nguồn lỗi lớn, không đáng đánh đổi.

---

# PHAN 2 — BUOC 1: TU DINH VI

### 2.1. Đọc sổ tiến độ
```bash
cat docs/PROGRESS.md 2>/dev/null || echo "CHUA_CO_SO"
```
Chưa có --> tạo theo mẫu ở Phần 5.4, đánh dấu tất cả batch là `chưa làm`.

### 2.2. Dò dấu vết trên đĩa — **đĩa là sự thật, sổ chỉ là tham khảo**

| Batch | Dấu hiệu ĐÃ XONG (phải có **tất cả**) |
|---|---|
| **B1** Auth thật | `backend/src/core/envelope.js` · `backend/src/core/errors.js` · `backend/.prettierrc` · `contracts/fixtures/` có file · `mobile/src/lib/api/` có file · `mobile/src/lib/auth.tsx` **không còn** chuỗi `Auth giả lập` · `mobile/src/lib/data.ts` |
| **B2** Content + Admin | `backend/src/models/LegalArticle.js` · `backend/src/models/Job.js` · `admin/package.json` · route `/api/admin/legal` |
| **B3** Public content | route `/api/legal/articles` · `mobile/src/lib/api/content.ts` · `mobile/src/lib/api/adapters.ts` |
| **B4** RAG | `backend/src/rag/guard.js` · `backend/src/rag/retrieval.js` · `backend/test/golden/kr.json` · `docs/atlas-indexes.md` |
| **B5** Chat + feedback | `mobile/src/lib/api/chat.ts` · backend module feedback · màn hình admin feedback |
| **B6** SOS | route `/api/support-locations/nearby` · `mobile/src/lib/api/sos.ts` |
| **B7** Incident + dịch | `backend/src/models/IncidentType.js` · route `/api/translate` · `mobile/src/lib/api/incidents.ts` |
| **B8** Alerts + profile | `backend/src/models/GeoAlert.js` · `grep -rl '@/mocks' mobile/src/app` --> **rỗng** |
| **B9** Hardening | `docs/DEMO_SCRIPT.md` · `docs/DEPLOY.md` · `.github/workflows/keepalive.yml` |

```bash
# Lệnh dò nhanh
ls backend/src/core/envelope.js backend/src/rag/guard.js admin/package.json 2>/dev/null
ls contracts/fixtures/ 2>/dev/null | head
grep -l "Auth giả lập" mobile/src/lib/auth.tsx 2>/dev/null
grep -rl '@/mocks' mobile/src/app 2>/dev/null | head
ls docs/DEMO_SCRIPT.md docs/OPTIMIZATION_REPORT.md 2>/dev/null
git log --oneline -15
```

**Đĩa mâu thuẫn với sổ --> tin đĩa**, sửa lại sổ cho đúng và nói rõ trong báo cáo.

### 2.3. Đọc tài liệu nền — lần đầu hoặc sau khi đã `/clear`

Bắt buộc, theo thứ tự:
1. `docs/04_Repo_Audit.md` — hiện trạng + 8 xung đột đã chốt cách xử lý
2. `docs/00_BeTravel_MasterPlan_v2.md` — kiến trúc, mô hình dữ liệu
3. `docs/05_ToiUuHeThong.md` — 13 quy tắc Clean Code phải tuân theo khi viết code

### 2.4. Kiểm tra sức khỏe workspace
```bash
ls backend/node_modules mobile/node_modules >/dev/null 2>&1 || echo "THIEU node_modules"
ls backend/.env >/dev/null 2>&1 || echo "THIEU backend/.env"
```
Thiếu `.env` --> xem Phần 8, có thể phải dừng hỏi người.

---

# PHAN 3 — BUOC 2: CHON VIEC

## 3.1. Lộ trình & điều kiện tiên quyết

| Batch | Tên | Chỉ bắt đầu khi |
|---|---|---|
| **B1** | Hợp nhất contract & nối auth thật | — (luôn làm trước tiên) |
| **B2** [!] | Content backbone + **Admin Portal** | B1 xong |
| **B3** | Public content API + nối Explore/Search | B2 xong |
| **B4** [!] | RAG engine + guardrails + golden test | B2 xong |
| **B5** | Chat mobile + feedback | B4 xong |
| **B6** | SOS: locations + map | B2 xong |
| **B7** | Incidents + Translator | B6 xong |
| **B8** | Alerts + Profile/Favorites | B3 và B6 xong |
| **B9** | Hardening, seed, build, demo + quét tối ưu toàn hệ thống | B1–B8 xong |

```
B1 --> B2 --> B3 --> B4 --> B5
        │             └----> B8
        └--> B6 --> B7
                     └----> B9
```

**Quy tắc chọn:** batch nhỏ nhất chưa xong mà đã đủ điều kiện tiên quyết.

## 3.2. Nếu thời gian gấp — thứ tự cắt

| Ưu tiên | Giữ | Vì sao |
|---|---|---|
| 1 | B1 + B2 + B3 | Không có thì không có sản phẩm |
| 2 | **B4** | Điểm khác biệt duy nhất so với ChatGPT — **không bao giờ cắt** |
| 3 | B5 | Hiện thực hóa điểm khác biệt trên |
| 4 | B6 | Giá trị cao, dễ demo, ít rủi ro |
| 5 | B9 tối thiểu + seed | Để demo được |
| 6 | B7 | UI đã có, chạy mock vẫn demo được |
| 7 | B8 | Cắt được đầu tiên |

Màn hình đã dựng sẵn chạy trên mock **vẫn demo được**. Cái không giả được là **AI có nguồn và biết từ chối** — đó là lý do B4 bất khả xâm phạm.

---

# PHAN 4 — BUOC 3: THUC THI

1. Mở `docs/02_ClaudeCode_Batch_Prompts_v2.md`, tìm mục `PROMPT B<n>`.
2. **Thi hành nguyên văn prompt đó** như thể người dùng vừa dán nó vào. Prompt là đặc tả công việc, không phải gợi ý.
3. Prompt bảo đọc `docs/03_Contracts_v2.md` mục nào --> đọc đúng mục đó trước khi viết code liên quan.
4. **Viết code theo 13 quy tắc Clean Code** (Phần 4.3). Tối ưu tại nguồn, không để dồn về cuối.
5. Xung đột giữa prompt và file này --> **file này thắng**, và nói rõ chỗ xung đột trong báo cáo.

## 4.1. Luật bất di bất dịch khi viết code

**Contract trước, code sau.** Đổi hình dạng API --> sửa `contracts/README.md` + `contracts/fixtures/*.json` **trước**, rồi backend và client trong **cùng một commit**.

**Envelope thống nhất:**
```jsonc
{ "ok": true,  "data": <T>, "meta": { "page":1, "limit":20, "total":57 } }
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": {} } }
```
`ErrorCode` là enum **đóng**, không tự nghĩ mã mới:
`VALIDATION_ERROR` · `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` · `CONFLICT` · `RATE_LIMITED` · `QUOTA_EXCEEDED` · `UPSTREAM_ERROR` · `INSUFFICIENT_EVIDENCE` · `INTERNAL_ERROR`

**Pre-filter nội dung.** Mọi truy vấn user-facing (API công khai, search, RAG retrieval) **phải** lọc `status:'published'` **và** `isCurrent:true`. Nội dung `draft`/`pending_review`/`superseded` lọt ra ngoài là **bug nghiêm trọng**, xử lý ngay theo Rule 13B.

**Ngân sách 3 search index trên Atlas M0.** Đã dùng 2: `vec_idx` + `txt_idx`, **cả hai trên `legal_chunks`**. Không tạo thêm Atlas Search/Vector index ở collection khác.

**RBAC ở backend.** Mọi `/api/admin/*` qua `requireRole('admin')` **phía backend**. Ẩn nút ở client không tính là bảo vệ.

**Không sửa màn hình mobile khi nối API.** 18 màn hình đang chạy trên `src/mocks/client.ts`. Nối API thật = tạo `src/lib/api/` **cùng chữ ký hàm** + `src/lib/data.ts` chuyển đổi theo `EXPO_PUBLIC_USE_MOCKS`. Khác biệt mô hình dữ liệu xử lý ở **`src/lib/api/adapters.ts`**, không sửa component.

**Không hard-code** quốc gia, ngưỡng RAG, tên model, secret, URL. Tất cả qua env hoặc DB. (Đây cũng chính là Rule 6.)

**Embedding đồng nhất.** Mọi chunk cùng `embeddingModel` và cùng `dims` (768). Đổi model --> re-index **toàn bộ**.

**Không hứa "100% chính xác"** ở bất kỳ đâu. Wording chuẩn:
> "Trả lời dựa trên nguồn đã kiểm chứng, luôn kèm trích dẫn. Khi dữ liệu chưa đủ, hệ thống nói rõ thay vì suy đoán. Đây là công cụ hỗ trợ thông tin, không thay thế tư vấn pháp lý chính thức."

**Nguyên tắc nội dung: 8 bài có nguồn thật tốt hơn 20 bài bịa nguồn.** Không bao giờ sinh dữ liệu luật giả, kể cả để seed hay demo. Chưa có nguồn thật --> seed ở trạng thái `draft` kèm ghi chú cần người điền.

## 4.2. Hợp đồng chống ảo giác — bắt buộc với mọi code liên quan AI

```
1. Retrieval: $vectorSearch, filter { countryCode, status:'published' },
   topK=RAG_TOP_K, numCandidates=RAG_NUM_CANDIDATES
2. [!] $lookup về legal_articles, $match { status:'published', isCurrent:true }
   — KHÔNG tin field status copy trên chunk (job purge có thể đã thất bại)
3. Ngưỡng: topScore < RAG_MIN_TOP_SCORE
        || count(score >= RAG_MIN_SOFT_SCORE) < RAG_MIN_CHUNKS
        --> trả INSUFFICIENT_EVIDENCE, KHÔNG gọi LLM
4. Prompt: context khối [S1]..[Sn]; LLM trả JSON
   { answer, usedSources[], confidence, needsOfficialHelp }
5. [!] HẬU KIỂM BẰNG CODE (không tin LLM):
   a. Marker [Sn] không thuộc tập truy hồi --> xóa + log vi phạm
   b. answer chứa tuyên bố định lượng (số tiền + đơn vị, "điều \d+",
      "\d+ năm tù", "phạt", "cấm") mà KHÔNG có marker nào
      --> hạ cấp xuống fallback, KHÔNG hiển thị câu trả lời đó
   c. Luôn gắn disclaimer
6. Ghi ai_events: questionHash, country, chunkIds, scores, model,
   latency, tokens, costEstimate, fallbackReason
```

Code đầy đủ ở `docs/03_Contracts_v2.md` mục 7 (system prompt) và mục 8 (guard.js).

Tầng này là **ngoại lệ của Rule 9 (KISS)** — được phép phức tạp hơn bình thường, vì đây là lõi sản phẩm.

## 4.3. Chuẩn viết code — 13 quy tắc Clean Code

Chi tiết đầy đủ ở `docs/05_ToiUuHeThong.md`. Bảng dưới để nhớ nhanh. **Mâu thuẫn giữa hai rule --> ưu tiên rule có số nhỏ hơn.**

| # | Quy tắc | Điểm cốt lõi |
|---|---|---|
| 1 | Đặt tên có ý nghĩa | Dùng từ vựng nghiệp vụ: `legalArticle`, `fallbackReason`. Không `data`, `temp`, `res2` |
| 2 | Hàm nhỏ, một trách nhiệm | > 20 dòng --> tách. Controller mỏng --> service --> model |
| 3 | Không lặp code (DRY) | Xuất hiện >= 2 lần --> trích xuất. Chỉ khi logic **thực sự** giống |
| 4 | Comment đúng lý do | Giải thích WHY, không giải thích WHAT |
| 5 | Định dạng nhất quán | Dòng <= 100 ký tự, import theo nhóm. Theo config có sẵn |
| 6 | Không magic number/string | Mọi ngưỡng RAG, tên model, TTL --> env hoặc constants |
| 7 | Xử lý lỗi rõ ràng | Không silent fail. Đúng envelope + ErrorCode. Prod không lộ stack |
| 8 | Điều kiện rõ ràng | Tách thành biến boolean có tên. Nested if <= 3 cấp |
| 9 | KISS | Ưu tiên đơn giản. **Ngoại lệ: tầng RAG/guardrail** |
| 10 | Refactor chủ động | Xóa dead code, import thừa, TODO cũ. **Không xóa `mobile/src/mocks/`** |
| 11 | Comment tiếng Việt | Trước mỗi block lớn. Bắt buộc ở `guard.js`, `retrieval.js`, `refreshToken.service.js`, `adapters.ts` |
| 12 | **Không emoji** | Chỉ dùng `[v] [X] [!] [*] --> ---`. UI cần icon --> dùng `lucide-react-native`, không nhúng ký tự emoji |
| 13 | Warning & Bug | Phân loại W1–W5, W5 (security) ưu tiên ngay. Bug theo quy trình 3 bước |

```
[!] Rule 12 áp dụng cho CẢ tài liệu mới bạn viết trong docs/, README,
    commit message và PR — không riêng source code.

[!] backend/ hiện CHƯA CÓ prettier config và đang dùng kiểu xuống dòng
    rất hẹp. Batch B1 phải tạo `backend/.prettierrc` +
    `backend/eslint.config.js` rồi format lại toàn bộ `backend/src/`.
    Commit phần format RIÊNG khỏi commit logic, để review được.
```

## 4.4. Phạm vi — KHÔNG làm ở MVP

Luật sư/live chat · dịch giọng nói/OCR camera · payment thật · background geofence & push khi app đóng · đối soát affiliate · B2B API/white-label · i18n UI đa ngôn ngữ · **streaming chat** · UI admin sửa system prompt · Google Places API.

Yêu cầu rơi vào danh sách này --> **hỏi lại trước khi làm**, đừng tự mở rộng.

---

# PHAN 5 — BUOC 4: NGHIEM THU, TOI UU & GHI SO

## 5.1. Chạy Definition of Done

Trước hết là DoD riêng của batch (cuối mỗi prompt trong `docs/02_...`). Sau đó là DoD chung:

```
□ backend: npm run lint && npm run test                     xanh
□ mobile:  npx tsc --noEmit && npx expo lint && npm test     xanh
□ admin:   npm run typecheck && npm run build                xanh  (từ B2)
□ Không commit secret/.env
□ Endpoint mới: Zod validate + envelope {ok,data} + ErrorCode đúng
                + rate limit nếu tốn tiền
□ contracts/ và fixtures cập nhật cùng commit nếu hình dạng API đổi
□ Màn hình mới: loading / empty / error state
□ RBAC kiểm ở backend
□ Đụng nội dung user-facing --> có test chứng minh draft/superseded
  KHÔNG lọt ra
□ Thêm biến env --> cập nhật .env.example của workspace tương ứng
□ Không còn emoji trong code, comment, docs mới, commit message (Rule 12)
□ Các file bắt buộc có comment tiếng Việt (Rule 11) đã có đủ
```

**Có mục đỏ --> batch CHƯA XONG.** Ghi vào sổ là `đang làm` kèm lý do.

## 5.2. Quét tối ưu sau batch (Chế độ B — bắt buộc)

Chỉ trên **những file batch này đã động tới**, không quét toàn repo:

```
1. Rule 10  --> xóa dead code, biến/import không dùng, TODO cũ bỏ sót
2. Rule 13A --> rà soát warning, phân loại W1-W5, xử lý hoặc ghi lý do bỏ qua
3. Cập nhật docs/OPTIMIZATION_REPORT.md
```

```
[!] Nếu quét tối ưu làm vỡ một thứ đang chạy, DỪNG LẠI, hoàn nguyên,
    ghi vào mục VAN DE CON TON DONG và hoãn đến B9. Tiến độ tính năng
    luôn ưu tiên hơn độ sạch của code.
```

Quét toàn hệ thống (Chế độ C) chỉ chạy ở **B9**, hoặc khi người dùng yêu cầu rõ ("chạy tối ưu toàn bộ"). Quy trình đầy đủ ở `docs/05_ToiUuHeThong.md` mục 3.

## 5.3. Commit

Làm trên nhánh `feature/*`, PR vào `main` — giữ đúng nếp repo đang có.
```bash
git checkout -b feature/b<n>-<ten-ngan>
git commit -m "feat(B<n>): <mô tả>"
```
Commit message không dùng emoji (Rule 12). Tách commit format khỏi commit logic.

## 5.4. Cập nhật `docs/PROGRESS.md`

Chưa có thì tạo theo mẫu này. Đây là trí nhớ giữa các phiên — **không bao giờ bỏ bước này**:

```markdown
# TIEN DO BE.TRAVEL

Cập nhật lần cuối: <ngày> · Phiên: <mô tả ngắn>

| Batch | Trạng thái | Ngày | Ghi chú |
|---|---|---|---|
| B1 Auth thật            | chưa làm | | |
| B2 Content + Admin      | chưa làm | | |
| B3 Public content       | chưa làm | | |
| B4 RAG + guardrails     | chưa làm | | |
| B5 Chat + feedback      | chưa làm | | |
| B6 SOS                  | chưa làm | | |
| B7 Incidents + dịch     | chưa làm | | |
| B8 Alerts + profile     | chưa làm | | |
| B9 Hardening            | chưa làm | | |

Trạng thái hợp lệ: `chưa làm` · `đang làm` · `xong` · `xong một phần`

## Quyết định phát sinh
(Quyết định kỹ thuật tự đưa ra khác với tài liệu — ghi rõ lý do)

## Đang vướng
(Việc cần người làm: API key, nguồn pháp lý, quyết định nghiệp vụ)

## Nợ kỹ thuật
(Chỗ làm tắt, cần quay lại. Đồng bộ với mục 5 của OPTIMIZATION_REPORT.md)
```

## 5.5. Cập nhật `docs/OPTIMIZATION_REPORT.md`

Một file duy nhất, **cập nhật chứ không tạo mới**. Mẫu đầy đủ ở `docs/05_ToiUuHeThong.md` mục 6. Sau mỗi batch, tối thiểu phải bổ sung một dòng vào mục LICH SU CAP NHAT và cập nhật các mục liên quan.

## 5.6. Báo cáo cho người dùng

Ngắn gọn, đúng 6 mục:
1. Batch nào vừa làm
2. Những gì đã thay đổi (theo nhóm, không liệt kê từng file)
3. DoD: mục nào xanh, mục nào đỏ
4. Kết quả quét tối ưu: số warning đã xử lý, rule nào áp dụng nhiều nhất
5. **Việc người phải làm** (nếu có)
6. Batch tiếp theo + đã đủ điều kiện chưa

---

# PHAN 6 — CAM BAY DA BIET

| Cạm bẫy | Cách tránh |
|---|---|
| **Refresh token qua cookie trên React Native** | Cookie jar Android không bền vững qua lần mở app. Dùng `AUTH_TRANSPORT=body` + `expo-secure-store`. Backend đọc được **cả cookie lẫn body** |
| **`__mock: z.literal(true)` làm hỏng parse API thật** | Đổi thành `.optional()` ở cả 10 schema trong `mobile/src/mocks/schemas.ts` |
| **Streaming `fetch` không đáng tin trên RN** | MVP **không streaming**; trả một lần, dùng trạng thái `pending` sẵn có |
| **Chunk của bài đã gỡ vẫn được AI trích dẫn** | `$lookup` xác minh `status` thật sau `$vectorSearch` — hai lớp phòng thủ |
| `$vectorSearch.filter` lỗi | Field trong `filter` phải khai `{"type":"filter"}` trong index definition |
| Tìm tiếng Việt không dấu không ra kết quả | Analyzer `vi_folded` (icuNormalizer + lowercase + icuFolding) + field `textNorm` |
| Hóa đơn Google Maps bất ngờ | Không dùng Places API · `PROVIDER_DEFAULT` (Apple Maps trên iOS) · **đặt quota cap cho key Android** |
| `$geoNear` không chạy | Phải là stage **đầu tiên**; lọc đặt trong `query` của chính nó; cần index `2dsphere` |
| GeoJSON đảo tọa độ | Luôn là **`[lng, lat]`**. Test bằng tọa độ thật, không phải số giả |
| Trả `embedding` (768 số) về client | Mongoose khai `select: false`; test assert response không chứa key này |
| Cạn connection pool Atlas M0 | `maxPoolSize: 10` trong options Mongoose |
| Rate limit RAM reset khi restart --> tốn tiền AI | Thêm quota theo user **lưu DB** (`users.aiUsage`), không chỉ rate limit |
| Hai version cùng `isCurrent` | Partial unique index `{countryCode,slug}` where `isCurrent:true` |
| Trộn 2 embedding model | Lưu `embeddingModel` từng chunk; đổi model --> re-index toàn bộ |
| Backend Render ngủ --> demo treo 50s | Cron ping `/api/health` mỗi 10 phút; warm-up thủ công trước demo |
| Emoji trong chuỗi UI gây lỗi encoding | Dùng icon component `lucide-react-native`, không nhúng ký tự emoji (Rule 12) |

---

# PHAN 7 — TU QUYET, KHONG CAN HOI

Tên biến · cấu trúc thư mục nội bộ · chọn thư viện tương đương · cách viết test · thứ tự làm trong cùng một batch · sửa lỗi phát sinh · áp dụng 13 quy tắc Clean Code · xóa dead code và import thừa.

# PHAN 8 — KHI NAO DUNG LAI HOI NGUOI

Làm hết phần chuẩn bị có thể làm được, ghi vào `docs/PROGRESS.md` mục "Đang vướng", rồi báo cáo và dừng:

| Tình huống | Vì sao không tự quyết được |
|---|---|
| Thiếu `backend/.env` hoặc `MONGODB_URI` | Không có DB thì không chạy được gì |
| Thiếu `GEMINI_API_KEY` khi tới B4 | Vẫn làm được toàn bộ code + test với `LLM_PROVIDER=mock`; chỉ dừng ở bước gọi API thật |
| Chưa tạo 2 Atlas search index | Là thao tác trên Atlas UI. Viết sẵn `docs/atlas-indexes.md`, dùng `SEARCH_DRIVER=memory` để dev tiếp |
| **Không có nguồn pháp lý thật để seed** | Tuyệt đối không bịa. Tạo `seed/data/kr-articles.json` đủ cấu trúc, `source` để trống + ghi chú, seed ở trạng thái `draft` |
| Yêu cầu rơi vào "KHÔNG làm ở MVP" (Phần 4.4) | Mở rộng phạm vi là quyết định của người |
| **Refactor chạm vào logic nghiệp vụ** (Rule 13B, RANG BUOC [2]) | Đề xuất 1–3 phương án + đánh giá rủi ro, để người chốt |
| Phải xóa/ghi đè công sức nhập liệu | Dữ liệu nội dung là tài sản đắt nhất dự án |
| Phải đổi một quyết định kiến trúc ở `docs/00_...` | Nêu vấn đề + phương án, để người chốt |

---

# PHAN 9 — LENH & MOI TRUONG

```bash
# backend
cd backend && npm run dev
npm run lint · npm run test · npm run test:golden
npm run seed · npm run reindex · npm run create-admin

# mobile  (đọc thêm mobile/AGENTS.md)
cd mobile && npx expo start
npx tsc --noEmit · npx expo lint · npm test · npx expo-doctor
npx expo install <pkg>        # KHÔNG dùng npm install cho mobile

# admin
cd admin && npm run dev · npm run build · npm run typecheck
```

- **MongoDB Atlas bắt buộc, kể cả dev** — MongoDB local không có Vector Search.
- Atlas trục trặc / chạy test --> `SEARCH_DRIVER=memory`.
- Mobile gọi backend qua `EXPO_PUBLIC_API_URL` — **không dùng `localhost`** khi chạy trên máy ảo/thiết bị thật; dùng IP LAN hoặc `10.0.2.2` (Android emulator).
- Đường lùi khi demo lỗi: `EXPO_PUBLIC_USE_MOCKS=true` --> app chạy lại bằng dữ liệu giả.

---

## Tóm tắt một dòng

**Đọc file này --> dò đĩa xem đang ở batch nào --> mở prompt tương ứng trong `docs/02_...` --> viết code theo 13 quy tắc ở `docs/05_...` --> nghiệm thu --> quét tối ưu --> ghi `PROGRESS.md` + `OPTIMIZATION_REPORT.md` --> báo cáo --> dừng.**
