# Kế hoạch hoàn thiện Be.Travel AI

> **Trạng thái 20/10/2026:** G1-G5 đã triển khai trên máy (nhánh `feature/ai-completion`, chưa push). Kết quả, phát hiện khi chạy thật và việc còn lại: `docs/PROGRESS.md` mục "Hoàn thiện Be.Travel AI". Điểm lệch so với kế hoạch: không cần sửa `vec_idx` (chunk luật Úc dùng sẵn filter countryCode/status/topicSlug); thêm `answerable=false` và `ANSWER_CACHE_VERSION`; đã thêm trang Admin index luật Úc (hàng đợi job), thống kê theo luồng, chờ 429 ngắn rồi thử lại.

Lập ngày 19/10/2026 · Trạng thái: **bản nháp để nhóm duyệt, chưa code**.
Căn cứ: code hiện tại trên `main` (`7e0ab29`), `docs/AI_KNOWLEDGE_BASE.md`, `docs/03_Contracts_v2.md` mục 7-8,
`FRONTEND_UI_SPECIFICATION.md` mục 3.8 và các lựa chọn người dùng chốt ngày 19/10:

| Câu hỏi | Lựa chọn |
|---|---|
| Nguồn AI được dùng | Bài đã duyệt **và** API luật đang có trong project (chủ yếu luật Úc) |
| Phạm vi trả lời | Pháp lý + an toàn du lịch; ngoài phạm vi thì từ chối lịch sự kèm gợi ý |
| Định dạng câu trả lời | 4 phần cố định: Trả lời ngắn, Việc nên làm, Điều cần tránh, Nguồn |
| Chi phí, quyền truy cập | Gemini gói miễn phí, bắt buộc đăng nhập, giữ quota 40 câu/người/ngày, 800/ngày toàn hệ thống |
| Model chat | **`gemini-3.5-flash-lite`** (chốt 19/10), thay `gemini-3.6-flash` |

## 0. Model AI đã chốt

Kiểm tra key trong `backend/.env` ngày 19/10/2026 (không in key): key hợp lệ, cả ba model gọi được.

| Vai trò | Biến env | Model | Gọi thử 19/10 |
|---|---|---|---|
| Chat RAG | `LLM_MODEL` | **`gemini-3.5-flash-lite`** (đổi từ `gemini-3.6-flash`) | OK, khoảng 0,6 giây (model cũ khoảng 2,9 giây) |
| Dịch, tóm lược luật Úc | `TRANSLATION_MODEL` | `gemini-3.5-flash-lite` (mặc định trong `env.js`) | OK |
| Embedding | `EMBEDDING_MODEL`, `EMBEDDING_DIMS` | `gemini-embedding-001`, 768 chiều | OK, đúng 768 chiều |

Lý do chọn flash-lite cho chat: nhanh hơn khoảng 4 lần; model cũ từng chạm hạn mức gói miễn phí khoảng 20 lượt/ngày
(PROGRESS 18/10); đây cũng là model Thành Đạt dùng khi chạy 60 câu đánh giá TH/SG/MY (đạt 56/60).
Tên model đi qua env, không hard-code (Rule 6). Chat và dịch dùng chung một model nên **chia chung hạn mức gói miễn phí**;
cần đo hạn mức thật trước khi mở khoá (G0).

## 1. Hiện trạng đã kiểm tra

**API luật Úc có trong project** (đã xác minh 19/10, nguồn trả HTTP 200 trong khoảng 1,6 giây):
- Route `/api/laws/australia/*`: danh sách, tìm kiếm, chủ đề, chi tiết, phiên bản, nội dung, tóm lược, dịch.
- Lấy **trực tiếp** từ Federal Register of Legislation (`api.prod.legislation.gov.au/v1`), không cần key.
  Văn bản tiếng Anh chỉ giữ trong RAM (tối đa 6 bản, 24 giờ); bản dịch, tóm lược và tên tiếng Việt cache ở `AiCache`.
- 31 luật tuyển chọn trong `backend/src/core/auLawTopics.js`, chia 5 mục: `giao-thong`, `cu-tru`, `xuat-nhap-canh`,
  `hai-quan-hanh-ly`, `quyen-loi-khieu-nai`. Chỉ luật liên bang; luật bang (giao thông đường bộ, thuê nhà) **không có**.
- **Hiện chưa nối vào RAG**: không có chunk, không có embedding, gắn `verifiedByBeTravel:false`.

**Ống RAG hiện có** (`backend/src/rag/`, `chat.service.js`):
- `$vectorSearch` + text search trên `legal_chunks`, gộp RRF, rồi `$lookup` về `legal_articles` lọc `published` + `isCurrent`.
- Ngưỡng `RAG_MIN_TOP_SCORE=0.62`, `RAG_MIN_SOFT_SCORE=0.55`, `RAG_MIN_CHUNKS=2`; thiếu thì trả `INSUFFICIENT_EVIDENCE`, không gọi AI.
- Guard hậu kiểm: xoá marker `[Sn]` bịa, chặn con số / mức phạt không có marker, đối chiếu số tiền với nguồn, luôn gắn disclaimer.
- Mỗi câu hỏi là một lượt độc lập (không dùng lịch sử hội thoại); có cache câu trả lời, quota lưu DB, ghi `ai_events`.
- `fallbackReason` hiện có: `INSUFFICIENT_EVIDENCE`, `GUARD_REJECTED`, `PROVIDER_ERROR`.
- Màn chat (PR #45) đã có giao diện mới; khoá lại mặc định theo yêu cầu 24/10/2026 (`EXPO_PUBLIC_AI_CHAT_ENABLED=true` để mở).

**Dữ liệu:** KR có 8 bài, **0 bài xuất bản**. TH/SG/MY có 53 bài chờ duyệt (PR #47, chưa merge). Úc: 31 luật nguyên văn.

Hệ quả: khi mở khoá, **chỉ Úc có dữ liệu để AI trả lời ngay**. KR/TH/SG chỉ trả lời được sau khi có người duyệt bài.

## 2. Kiến trúc đề xuất

```
Câu hỏi (đã đăng nhập, còn quota)
  │
  ├─ [1] Bộ phân luồng bằng code (không gọi AI)
  │     ├─ Khẩn cấp (tai nạn, bị tấn công, đang bị bắt) --> khung khẩn cấp cố định:
  │     │      số khẩn cấp lấy từ dữ liệu Country/Đại sứ quán, nút mở SOS; không chờ AI
  │     ├─ Ngoài phạm vi (thời tiết, ăn chơi, đặt vé, lập trình, chuyện phiếm...) --> OUT_OF_SCOPE
  │     ├─ Xin tư vấn cá nhân ("tôi có bị kết tội không") --> trả lời phần thông tin, từ chối phần tư vấn
  │     └─ Câu hỏi pháp lý / an toàn --> tiếp
  │
  ├─ [2] Truy hồi hai tầng theo quốc gia của phiên
  │     ├─ Tầng 1: bài Be.Travel đã duyệt (legal_chunks + $lookup published/isCurrent)  [như hiện tại]
  │     └─ Tầng 2: văn bản luật gốc (luật Úc), chunk theo điều khoản, nhãn "chưa kiểm chứng"
  │
  ├─ [3] Ngưỡng bằng chứng --> thiếu thì INSUFFICIENT_EVIDENCE (không gọi AI)
  ├─ [4] Gemini trả JSON 4 phần, mỗi ý có marker [Sn]
  ├─ [5] Guard hậu kiểm từng phần (marker, con số, số điện thoại, phạm vi)
  └─ [6] Ghi ai_events (thêm route, tầng nguồn) --> trả về app
```

### 2.1. Đưa luật Úc vào RAG (tầng 2)

- **Chunk theo điều khoản (section)** của 31 luật tuyển chọn, giữ `titleId`, `registerId` (bản hiện hành),
  số điều, tiêu đề phần, URL chính thức tới điều đó.
- Lưu vào **chính `legal_chunks`** với `countryCode:"AU"` và trường mới `sourceType:"au_legislation"`
  (bài nội bộ là `"article"`). **Không tạo index mới**: chỉ thêm `sourceType` làm trường filter vào `vec_idx`
  hiện có. Atlas M0 vẫn dùng 2/3 index (CLAUDE.md 4.1).
- Bước xác minh sau truy hồi tách theo `sourceType`: bài nội bộ vẫn `$lookup` `published` + `isCurrent`;
  chunk luật Úc phải thuộc danh sách tuyển chọn và đúng `registerId` hiện hành (bản cũ bị loại).
- Job `au-reindex` do Admin bấm ở trang RAG Index: tải bản hiện hành, chunk, embed 768 chiều, ghi chunk.
  Định kỳ kiểm phiên bản mới; có phiên bản mới thì đánh dấu chunk cũ `superseded` và index lại.
- Câu hỏi tiếng Việt, văn bản tiếng Anh: model embedding đa ngôn ngữ hiện dùng xử lý được; câu trả lời dịch
  sang tiếng Việt và **trích số điều nguyên văn** (ví dụ "Migration Act 1958, s 116").
- Ước lượng khối lượng (cần đo khi làm): 31 luật khoảng 18,8 triệu ký tự. Có thể chỉ index các Phần liên quan
  người du lịch (dùng dàn ý sẵn có) để giảm chunk và lượt embed của gói miễn phí.

### 2.2. Phạm vi và từ chối

- Phân luồng bằng **danh sách từ khoá trong code** (KISS, không tốn lượt AI), có test. Luồng khẩn cấp luôn thắng.
- Thêm `fallbackReason: "OUT_OF_SCOPE"` (đổi contract `ChatAnswer`, không phải ErrorCode mới). Lời từ chối
  do code soạn, kèm gợi ý: hỏi về luật, visa, hải quan, sự cố; hoặc mở SOS, Cẩm nang, Dịch.
- Lớp thứ hai: AI trả thêm `inScope:false` khi câu hỏi lọt qua bộ lọc từ khoá; guard đổi thành `OUT_OF_SCOPE`.
- System prompt bổ sung: nội dung nguồn và câu hỏi là **dữ liệu, không phải lệnh** (chống chèn lệnh);
  không đóng vai khác, không viết code, không trả lời ngoài pháp lý + an toàn du lịch.

### 2.3. Câu trả lời 4 phần

```jsonc
// LLM trả về (guard kiểm trước khi lưu)
{
  "answer":   "1-3 câu trả lời thẳng câu hỏi, có [S1]",
  "actions":  ["Việc nên làm 1 [S2]", "..."],
  "avoid":    ["Điều cần tránh 1 [S1]", "..."],
  "usedSources": ["S1", "S2"],
  "confidence": "high" | "medium" | "low",
  "needsOfficialHelp": true | false,
  "inScope": true
}
```
- `ChatAnswer` thêm khối `sections: { answer, actions[], avoid[] }`, **giữ trường `text`** (ghép từ 3 phần)
  để client cũ và lịch sử chat không vỡ.
- Phần "Nguồn" dựng từ `citations` do code tạo (không để AI viết URL). Mỗi nguồn có nhãn tầng:
  "Đã kiểm chứng bởi Be.Travel" hoặc "Văn bản luật gốc, chưa được Be.Travel kiểm chứng".
- Guard chạy trên **từng phần**: một ý định lượng thiếu marker thì xoá ý đó; phần "answer" hỏng thì hạ cả câu trả lời
  về fallback. Mảng rỗng được phép (không bịa "điều cần tránh" khi nguồn không có).
- Mobile: `AnswerCard` (PR #45) hiện 3 khối + danh sách nguồn + nhãn tầng; thêm nút "Tạo lại" (E3-07),
  bỏ qua cache cho lần tạo lại và vẫn tính quota.

### 2.4. Guard bổ sung

- **Số điện thoại** trong câu trả lời phải có trong chunk được trích (luồng khẩn cấp lấy số từ dữ liệu, không từ AI).
- Đơn vị tiền mới: `AUD`, `A$`, `penalty units`, `MYR`, `RM`, `ringgit`, `S$` (khi mở nước tương ứng).
- Mẫu điều luật tiếng Anh: `section \d+`, `s \d+`, `subsection` (tương đương "điều \d+" của tiếng Việt).

## 3. Lộ trình (mỗi giai đoạn một PR)

| Giai đoạn | Việc | Phụ thuộc | Nghiệm thu chạy thật |
|---|---|---|---|
| **G0** Chuẩn bị | Đổi mặc định `LLM_MODEL` trong `backend/src/core/env.js` và `backend/.env.example` sang `gemini-3.5-flash-lite`; người dùng tự đổi dòng `LLM_MODEL` trong `backend/.env` (Claude không sửa `.env`); đo hạn mức thật theo phút/ngày của flash-lite; merge PR #46, #47 khi người dùng cho push | Người dùng | Gọi thử 1 câu qua `npm run dev`, xem `ai_events` ghi đúng model |
| **G1** Phạm vi + guard | Bộ phân luồng, `OUT_OF_SCOPE`, luồng khẩn cấp lấy số từ dữ liệu, prompt chống chèn lệnh, guard số điện thoại + đơn vị tiền mới | - | Hỏi thật qua API: câu ngoài phạm vi, câu khẩn cấp, câu chèn lệnh |
| **G2** 4 phần | Contract + fixture, prompt JSON mới, guard theo phần, `AnswerCard`, nút Tạo lại | G1 | Emulator: hỏi một câu KR có dữ liệu thử, xem đủ 4 phần |
| **G3** Luật Úc vào RAG | `sourceType`, chunk theo điều, job `au-reindex`, xác minh `registerId`, nhãn tầng nguồn, sửa `vec_idx` | G1; người cập nhật index trên Atlas UI | Index 1-2 luật nhỏ trước; hỏi tiếng Việt, nhận trích điều luật đúng |
| **G4** Golden đa quốc gia | Runner đọc `golden/<cc>.json`, hỗ trợ `answerMustMatch`, thêm ca `OUT_OF_SCOPE`; bộ câu AU viết từ điều luật **thật** | G2, G3 | `npm run test:golden` xanh với mock; chạy AI thật theo ngưỡng >= 80%, câu bẫy 100% |
| **G5** Mở khoá | Bật cờ chat, kiểm toàn luồng (đăng nhập --> chọn Úc --> hỏi --> feedback --> lịch sử), dashboard thống kê theo luồng | G1-G4 | Emulator theo CLAUDE.md 5.1b |

Song song, không phải code: người duyệt bài KR/TH/SG (E2-06, E2-07) để tầng 1 có dữ liệu.

Quy tắc giữ nguyên trong mọi giai đoạn: không streaming, không hard-code quốc gia / ngưỡng / model, envelope + ErrorCode đóng,
lọc `published` + `isCurrent` cho tầng 1, Rule 12 không emoji.

## 4. Rủi ro

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| Hạn mức gói Gemini miễn phí: `gemini-3.6-flash` từng chỉ khoảng **20 lượt/ngày** (PROGRESS 18/10); hạn mức của flash-lite chưa đo; chat và dịch dùng chung model | Demo nhiều người sẽ hết lượt sớm | Đã chốt chat dùng `gemini-3.5-flash-lite`; đo hạn mức ở G0, chỉnh quota theo số đo; cache câu hỏi lặp; báo hết lượt rõ ràng |
| Luật Úc chỉ có cấp liên bang | Câu giao thông đường bộ, phạt tốc độ, thuê nhà sẽ bị từ chối | Câu từ chối nói rõ "luật bang không có trong nguồn"; ghi trong `auLawTopics` note |
| Văn bản Úc là tiếng Anh, chưa kiểm chứng | AI có thể diễn giải sai sắc thái | Nhãn "chưa kiểm chứng", trích số điều để người dùng tự tra, guard số liệu |
| Embed 31 luật vượt hạn mức embedding miễn phí | Index chậm hoặc bị chặn | Index theo từng luật, ưu tiên Phần liên quan du khách, job tiếp tục được khi bị 429 |
| Phân luồng từ khoá sai | Câu khẩn cấp bị coi là thông tin, hoặc từ chối nhầm | Khẩn cấp thắng khi có từ nguy hiểm; lớp `inScope` của AI; thống kê fallback để chỉnh |
| Đổi contract `ChatAnswer` | Client cũ / lịch sử chat lỗi | Giữ `text`, `sections` là trường thêm |

## 5. Cần người làm hoặc quyết định

1. Đổi `LLM_MODEL=gemini-3.5-flash-lite` trong `backend/.env` trên máy mỗi người (G0).
2. Cho phép push lại để merge #46, #47 trước G0 (đang tạm dừng push theo yêu cầu 19/10).
3. Cập nhật definition `vec_idx` trên Atlas UI để thêm filter `sourceType` (G3). Tôi sẽ viết sẵn JSON trong `docs/atlas-indexes.md`.
4. Người duyệt nội dung cho KR/TH/SG để tầng 1 có bài.
5. Danh sách từ khoá ngoài phạm vi / khẩn cấp: tôi soạn bản đầu, nhóm xem lại.

## 6. G6 - Câu trả lời đã duyệt (FAQ) cho câu hỏi lặp lại

Chốt với người dùng ngày 20/10/2026. Mục tiêu: câu hỏi hay gặp được trả lời ngay từ nội dung admin đã duyệt, không
gọi LLM trả lời, giảm thời gian chờ và token. Chưa duyệt thì AI chạy như hiện tại.

### 6.1. Quyết định đã chốt

| Câu hỏi | Chốt |
|---|---|
| Thế nào là "lặp cao" | Nhóm câu cùng ý được hỏi **từ 3 lần trở lên trong 15 ngày** |
| Ai quyết định hai câu "cùng ý" | **AI chấm mức trùng lặp nội dung**, tối thiểu **85%** mới vào nhóm đề xuất (chốt 20/10/2026) |
| Admin có sửa nội dung câu trả lời không | **Không.** Chỉ duyệt nguyên văn một câu trả lời AI đã sinh (kèm trích dẫn), từ chối, hoặc gỡ |
| Người dùng có biết đó là câu đã duyệt không | **Có**, nhãn nhỏ "Đã được Be.Travel duyệt" trên thẻ trả lời |

### 6.2. Luồng

```
Người dùng hỏi --> phân luồng (scope.js) --> chỉ luồng "legal" mới xét FAQ
  --> từ khoá câu hỏi (đã có cache) --> tìm FAQ đã duyệt cùng quốc gia, khớp chặt
      khớp + nguồn còn hiệu lực  --> trả FAQ ngay (không gọi LLM trả lời, vẫn trừ quota, ai_event answerSource=approved_faq)
      không khớp / nguồn đã đổi   --> RAG + LLM như hiện tại
```

### 6.3. Dữ liệu (MongoDB thường, KHÔNG thêm Atlas Search index)

- `ai_events` thêm `keywordTerms: [String]` (từ khoá đã chuẩn hoá của câu hỏi) và `messageId` (câu trả lời tương ứng),
  để gom nhóm và để admin xem lại đúng câu trả lời đã phát.
- Collection mới `approved_faqs`: `countryCode`, `question` (câu đại diện), `keywordTerms`, `answer`, `sections`,
  `citations` (giữ nguyên như lúc AI trả lời), `sourceVersions` (mỗi nguồn: chunkId + `registerId` với luật Úc hoặc
  `articleId`+`version` với bài đã duyệt), `status` (`active` | `needs_review` | `retired`), `approvedBy`, `approvedAt`,
  `servedCount`, `feedbackUp`, `feedbackDown`, `sourceMessageId`.
- Ghi `audit_logs` cho duyệt / từ chối / gỡ, như các thao tác admin khác.

### 6.4. Gom nhóm câu cùng ý (cho trang admin)

- Lấy `ai_events` 15 ngày gần nhất, luồng `legal`, đã trả lời được (không fallback), theo từng quốc gia.
- Hai câu cùng nhóm khi tập `keywordTerms` giống nhau từ 70% trở lên (Jaccard). Nhóm có từ 3 câu trở lên thì hiện.
- Mỗi nhóm hiện: số lần hỏi, các cách hỏi khác nhau, câu trả lời gần nhất (và các câu trả lời khác nếu có),
  nguồn đã trích, tỉ lệ "Hữu ích / Không hữu ích".
- Tính khi admin mở trang (dữ liệu 15 ngày nhỏ), không cần job nền.

### 6.5. Khớp FAQ khi người dùng hỏi

- Chỉ xét luồng `legal`, cùng `countryCode`, FAQ `active`.
- Khớp khi Jaccard(`keywordTerms` câu hỏi, FAQ) từ **0,85** trở lên (chặt hơn ngưỡng gom nhóm). Ngưỡng nằm trong env
  `FAQ_MATCH_MIN_SIMILARITY`. Không chắc thì không khớp: thà để AI trả lời còn hơn trả nhầm FAQ.
- Câu xin tư vấn cá nhân (`personal_advice`) và khẩn cấp không dùng FAQ.
- Nút "Tạo lại" trên thẻ FAQ bỏ qua FAQ, chạy AI như thường.

### 6.6. Tự ẩn khi luật đổi

- Trước khi phát FAQ, kiểm lại từng nguồn bằng chính logic xác minh của RAG: bài còn `published` + `isCurrent` đúng
  version; luật Úc còn trong danh sách tuyển chọn và `registerId` vẫn là bản hiện hành.
- Một nguồn hỏng --> FAQ chuyển `needs_review`, không phát, câu hỏi chạy AI như thường; trang admin báo "nguồn đã đổi".
- FAQ có từ 3 lượt "Không hữu ích" và tỉ lệ xấu trên 30% thì gắn cảnh báo cho admin (không tự gỡ).

### 6.7. API (contract trước, code sau)

```
GET    /api/admin/faq/candidates?countryCode=AU     nhóm câu lặp lại 15 ngày (6.4)
GET    /api/admin/faq?status=active|needs_review|retired
POST   /api/admin/faq            { countryCode, sourceMessageId }   duyệt nguyên văn câu trả lời đó
PATCH  /api/admin/faq/:id        { status: "retired" | "active" }  gỡ / khôi phục (khôi phục phải qua kiểm nguồn)
```

Tất cả qua `requireRole('admin')`, Zod validate, envelope chuẩn. Phía chat: tin nhắn trả lời thêm
`answerSource: "ai" | "approved_faq"` (trường thêm, client cũ bỏ qua được).

### 6.8. Giao diện

- **Admin:** trang mới "Câu hỏi thường gặp" với 2 tab: *Đề xuất* (nhóm lặp cao, nút Duyệt / Bỏ qua) và *Đã duyệt*
  (trạng thái, số lần phát, phản hồi, nút Gỡ). Có loading / empty / error.
- **Mobile:** `AnswerCard` hiện nhãn "Đã được Be.Travel duyệt" khi `answerSource="approved_faq"`, qua `adapters`/`chat.ts`.
  Không đổi cấu trúc thẻ.

### 6.9. Kiểm thử

- Test tự động (nghiệp vụ lõi): FAQ chỉ phát khi khớp đủ ngưỡng; nguồn đổi phiên bản thì không phát và chuyển
  `needs_review`; route khẩn cấp / tư vấn cá nhân không dùng FAQ; RBAC các route admin; FAQ không lộ sang quốc gia khác.
- Chạy thật: hỏi lặp trên emulator để tạo nhóm, duyệt trên admin, hỏi lại cách khác để thấy FAQ trả lời nhanh và có nhãn.

### 6.10. Thứ tự làm

1. Contract + `keywordTerms`/`messageId` trên `ai_events` (bắt đầu tích dữ liệu ngay).
2. Model `approved_faqs`, service gom nhóm, API admin + test.
3. Khớp FAQ trong `chat.service` + kiểm nguồn + test.
4. Trang admin, nhãn mobile.
5. Chạy thật trên emulator + admin, ghi PROGRESS.

### 6.11. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Trả FAQ cho câu khác ý | Ngưỡng khớp 0,85 cao hơn ngưỡng gom 0,7; chỉ luồng legal; nút "Tạo lại" chạy AI |
| Câu trả lời AI sai được duyệt | Admin đọc trước khi duyệt, thấy nguồn và tỉ lệ phản hồi; cảnh báo khi phản hồi xấu |
| FAQ cũ sau khi luật đổi | Kiểm nguồn mỗi lần phát, tự chuyển `needs_review` |
| Ít dữ liệu lúc đầu | Trang có thể trống vài tuần; cơ chế AI vẫn chạy bình thường |
| Từ khoá do LLM sinh thay đổi giữa các lần | Đã có cache từ khoá theo câu; gom nhóm dùng ngưỡng 0,7 chịu được sai khác nhỏ |
