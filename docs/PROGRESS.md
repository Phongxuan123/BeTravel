# TIEN DO BE.TRAVEL

## Hoàn thiện Be.Travel AI (G1-G5) — 19-20/10/2026 (cập nhật mới nhất)

Theo kế hoạch `docs/AI_FEATURE_PLAN.md`, nhánh `feature/ai-completion` (commit local, chưa push theo yêu cầu người dùng).
Chat vẫn **khoá** bằng `EXPO_PUBLIC_AI_CHAT_ENABLED` (giữ nguyên quyết định B4, người dùng tự bật).

- **Phân luồng bằng code** (`backend/src/rag/scope.js`, chạy trước retrieval): ngoài phạm vi, chào hỏi, chèn lệnh
  vào câu hỏi thì trả lời do code soạn, `fallbackReason:"OUT_OF_SCOPE"`, không gọi LLM, không tốn quota.
  Khẩn cấp: khối số khẩn cấp lấy từ `Country.emergencyNumbers` + số Đại sứ quán đứng đầu câu trả lời; hết lượt
  AI trong ngày vẫn nhận được khối này. Xin tư vấn cá nhân: trả thông tin kèm câu ranh giới cố định.
- **Câu trả lời 3 phần** (Trả lời ngắn / Việc nên làm / Điều cần tránh) + phần Nguồn do code dựng từ citations.
  Guard kiểm từng phần: ý vi phạm bị bỏ, phần trả lời chính vi phạm thì hạ cả câu. Thêm: số điện thoại phải
  có trong nguồn hoặc là số khẩn cấp quốc gia; đơn vị tiền AUD/RM/penalty units; điều luật tiếng Anh
  (`section 116`, `s 116`). System prompt thêm 5 nguyên tắc (dữ liệu không phải lệnh, phạm vi, nguồn luật gốc,
  số điện thoại, `answerable=false` khi không đủ dữ liệu trực tiếp). Nút "Tạo lại" bỏ qua cache.
- **Luật liên bang Úc vào RAG**: chunk theo điều (`rag/auLawChunking.js`), index bằng
  `npm run index-au-laws -- <titleId...>` (embed xong mới thay chunk cũ). Dùng chung `vec_idx`/`txt_idx`
  (countryCode=AU) nên **không cần tạo thêm Atlas index**. Chunk luật gốc được xác minh bằng danh sách tuyển chọn
  + `registerId` hiện hành (fail-closed khi không tra được); trích dẫn có `sourceType:"au_legislation"`,
  URL chính thức, nhãn "chưa được Be.Travel kiểm chứng".
- **Embedding gói miễn phí**: 100 lượt/phút, nên `gemini.embedding.js` chờ đúng `retryDelay` khi 429.
- **Model chat mặc định** `gemini-3.5-flash-lite` (người dùng tự đổi `LLM_MODEL` trong `backend/.env`).
- Mobile: thẻ "Ngoài phạm vi", tiêu đề 3 phần, nhãn nguồn chưa kiểm chứng, gộp chunk cùng điều luật, nút Tạo lại
  thay đúng câu trả lời (không nhân đôi câu hỏi).

Kiểm tra: backend lint + 344/344 (golden KR 32/32, thêm ca ngoài phạm vi và khẩn cấp), mobile tsc + lint +
243/243, admin typecheck + 18/18.

**Chạy thật (Atlas + Gemini `gemini-3.5-flash-lite`, 20/10)**: index thử 3 luật nhỏ (143 chunk), hỏi tiếng Việt về
luật tiếng Anh, điểm truy hồi 0,71-0,83 với câu có nguồn và 0,58-0,67 với câu không có nguồn; 2-4 giây mỗi câu.
`npm run evaluate-ai -- test/golden/au.live.json`: **9/9**. Lưu ý: bộ 9 câu này viết sau khi đã xem câu trả lời
thử nên chỉ là kiểm tra hồi quy, chưa phải đánh giá độc lập. Trên emulator (đăng nhập thật, chọn Úc): câu có
nguồn, câu thời tiết (thẻ ngoài phạm vi), câu tai nạn (số khẩn cấp 000), Tạo lại đều chạy đúng. Dữ liệu thử đã dọn
(0 chunk AU, phiên chat thử đã xoá).

### Phát hiện khi chạy thật

- Model có thể chèn marker `[S1]..[S8]` vào câu "không có dữ liệu" để qua guard; đã xử lý bằng `answerable=false`.
- Cache câu trả lời lưu cả câu trả lời cũ qua thay đổi prompt: đã thêm `ANSWER_CACHE_VERSION`, phải tăng khi đổi prompt/guard.
- `LLM_MODEL` trong `.env` ghi đè biến môi trường khi chạy (dotenv `override`), và `env` bị đóng băng; muốn thử model khác
  phải đặt provider qua `__setLlmProviderForTest`, không sửa `.env`.

### Bổ sung cùng ngày (Admin, hạn mức, lỗi nhà cung cấp)

- **Admin**: trang RAG Index có thêm mục "Luật liên bang Úc cho trợ lý AI" (xem trạng thái từng luật, Index / Index lại /
  Xoá). Index chạy nền qua hàng đợi job `index_au_law`, không chạy trùng luật đang có job. Dashboard thêm "Phân loại
  câu hỏi" và **không tính câu ngoài phạm vi vào tỉ lệ fallback** (trước đó câu hỏi thời tiết sẽ bị tính là thiếu nguồn).
- **Hạn mức Gemini đã đo (key hiện tại, gói miễn phí, 20/10/2026)**: `gemini-3.5-flash-lite` **15 yêu cầu/phút/cả dự án**,
  `gemini-3.6-flash` **5 yêu cầu/phút**, embedding 100 lượt/phút. Giới hạn theo ngày chưa chạm tới nên chưa đo được.
  Hệ quả: chat, dịch và tóm lược luật Úc dùng chung 15 lượt/phút của flash-lite, nên nhiều người hỏi cùng lúc sẽ gặp 429.
  Chat nay chờ tối đa 20 giây rồi thử lại một lần; vẫn lỗi thì hiện thẻ "AI đang bận" (không còn giả làm "thiếu dữ liệu").
  Quota 40 câu/người/ngày chỉ là trần theo ngày, **không bảo vệ được giới hạn theo phút**; muốn nhiều người dùng đồng thời
  cần key trả phí.

### Index luật Úc và đánh giá thật (20/10/2026)

- Đã index **5/8 luật du khách** (586 chunk): Passenger Movement Charge, Passports, Customs Prohibited Exports, Customs Prohibited Imports, Guardianship of Children.
- **4 luật chưa index** (C2015A00061, C2004A03952, C1901A00006, C2004A00109, đều thất bại): Gemini trả 429 "quota exceeded" sau khoảng 560 chunk,
  nhiều khả năng **hạn mức embedding theo ngày** của gói miễn phí. Chạy lại sau khi quota reset hoặc dùng key trả phí:
  `npm run index-au-laws -- C2015A00061 C2004A03952 C1901A00006 C2004A00109`.
- `evaluate-ai` với `gemini-3.5-flash-lite` trên `test/golden/au.live.json`: **11/11**. Lần chạy đầu 7/9: `au-guardianship` do luật chưa index,
  `au-pmc-exempt` bị guard từ chối (MISSING_CITATION), chạy lại thì đạt, nên kết quả chat **không tất định**.
- Hai câu hải quan mới được viết **sau khi xem đáp án thật**, chỉ là kiểm tra hồi quy, không phải bằng chứng độc lập về độ đúng.

### Bỏ Gemini, chạy AI qua APIZ với truy hồi theo từ khoá (20/10/2026)

- **Lý do**: hạn mức embedding miễn phí của Gemini cạn theo ngày (thử thật: 429, chờ khoảng 5 giờ 25 phút), chặn cả index
  lẫn truy hồi câu hỏi; người dùng không đồng ý gói trả phí Gemini. APIZ (`https://api.apiz.vn/v1`, tương thích OpenAI)
  **không bán model embedding** (đã thử `/v1/embeddings` với 2 model, đều 503 `model_not_found`).
- **Quyết định** (người dùng chốt "vô hiệu hoá hoàn toàn Gemini"): thêm `RETRIEVAL_MODE=lexical`. LLM chuyển câu hỏi thành
  từ khoá tiếng Việt và tiếng Anh, tìm theo độ phủ từ khoá có trọng số IDF (điểm 0-1), áp ngưỡng `RAG_MIN_KEYWORD_*`
  trước khi gọi LLM trả lời, vẫn qua xác minh nguồn và guard như cũ. Chế độ `hybrid` (vector) giữ nguyên làm mặc định code.
  [!] Đây là lệch khỏi hợp đồng chống ảo giác mục 4.2 bước 1 (`$vectorSearch`): ngưỡng từ khoá lỏng hơn cosine, nên chặn
  sai dựa nhiều hơn vào guard và cờ `answerable` của model.
- **Cấu hình chạy thật** (`backend/.env`): `LLM_PROVIDER=openai` + `OPENAI_BASE_URL` APIZ, `LLM_MODEL=gemini-3.8-flash`,
  `EMBEDDING_PROVIDER=mock`, `RETRIEVAL_MODE=lexical`, `AI_PROVIDER_TIMEOUT_MS=60000`.
- **Claude qua APIZ không dùng được**: model Claude bị APIZ chèn system prompt riêng, trả lời kiểu "I acknowledge these
  instructions..." thay vì JSON. `gemini-3.8-flash` và `deepseek-v4.1-flash` qua APIZ trả JSON đúng.
- **Index không cần embedding**: đã index nốt 4 luật (Customs Act 1901, Competition and Consumer Act 2010, Therapeutic Goods
  Act 1989, Biosecurity Act 2015; 8.084 chunk, 43 giây). Nay đủ **9 luật Úc**, 8.670 chunk.
- **Đánh giá thật** (`au.live.json`, 11 câu): `gemini-3.8-flash` 10/11 rồi 8/11 ở lần chạy lại (2 câu do APIZ quá 30 giây,
  nay đã nâng timeout lên 60 giây); `deepseek-v4.1-flash` 8/11. **Mọi câu bẫy, ngoài phạm vi và khẩn cấp đều đạt ở cả ba lần.**
  Câu trượt chủ yếu: hỏi xuất khẩu thuốc gây nghiện, truy hồi ra Customs Act thay vì Customs (Prohibited Exports) Regulations
  nên model tự báo thiếu dữ liệu. Ngưỡng 0,4/0,3 được chọn theo chính 11 câu này nên cần bộ câu độc lập để kiểm chứng.

### Tăng tốc và ổn định AI qua APIZ (20/10/2026)

- `QUERY_REWRITE_MODEL`: model riêng cho bước tạo từ khoá. Cache từ khoá theo câu hỏi (collection `querykeywordcaches`,
  TTL 30 ngày): hỏi lại cùng câu không gọi LLM tạo từ khoá, ra cùng đoạn luật nên trúng cache câu trả lời. `LLM_MAX_OUTPUT_TOKENS`
  (1500) và prompt yêu cầu "việc nên làm"/"điều cần tránh" tối đa 3 ý.
- **Chọn model** (đo thật qua APIZ, 11 câu `au.live.json`): `glm-5.3-flash` 10/11, `gpt-6-luna` 9/11, `deepseek-v4.1-flash` 9/11;
  tạo từ khoá: GLM 3,2s, Luna 3,6s, DeepSeek 4,8s (trung vị). `gemini-3.8-flash` qua APIZ lúc đo bị quá 60 giây 5/6 lần nên loại.
  Chốt **`glm-5.3-flash` cho cả hai bước** (rẻ nhất: 1.170/3.900 đồng mỗi triệu token, điểm cao nhất). Phương án nhanh hơn:
  `gpt-6-luna` cho câu trả lời (khoảng 4 giây) nhưng kém 1 câu.
- **Emulator** (luồng thật, chuyến đi tạm sang Úc rồi đã xoá): câu luật mới 9-23 giây (trước 25-36 giây, có lần 80 giây lỗi),
  hỏi lại cùng câu 0,2-3,5 giây và ra **cùng câu trả lời**. Câu bẫy phạt tốc độ, ngoài phạm vi, khẩn cấp (gọi 000) đều đúng.
  Còn trượt: "mang thuốc kê đơn vào Úc" báo thiếu dữ liệu dù đã index Therapeutic Goods Act.

### G6 Câu trả lời đã duyệt cho câu hỏi lặp lại (20/10/2026, xong)

- Backend: `approvedfaqs` (MongoDB thường), `ai_events` thêm `keywordTerms`/`messageId`/`answerSource`/`faqId`, API
  `/api/admin/faq/*` (đề xuất, duyệt nguyên văn, bỏ qua, gỡ / kích hoạt lại), chat tra FAQ trước khi gọi AI (chỉ luồng
  legal, không regenerate, không focusArticleId), kiểm nguồn mỗi lần phát và tự chuyển `needs_review` khi luật đổi.
  Admin: trang "Câu hỏi thường gặp" (Đề xuất / Đã duyệt). Mobile: nhãn "Đã được Be.Travel duyệt".
- Kiểm thử tự động: backend 369/369 (8 test mới G6), admin 22/22 + build, mobile tsc/lint sạch, jest 247 (6 test UI
  không liên quan quá thời gian khi chạy song song với emulator, chạy riêng đạt hết).
- **Chạy thật** (emulator + API admin, dữ liệu thử đã dọn): hỏi 3 lần --> 1 đề xuất; duyệt --> hỏi lại cùng câu trả FAQ
  trong **0,2 giây** kèm nhãn trên thẻ (đã chụp màn hình); gỡ FAQ --> lại do AI trả lời. Câu diễn đạt khác: độ giống
  từ khoá 0,75 / 0,50 / 0,40 (câu hỏi riêng về trẻ em) nên **chưa khớp** ngưỡng 0,85 --> AI trả lời bình thường.
  Muốn FAQ bắt được nhiều cách hỏi hơn thì hạ `FAQ_MATCH_MIN_SIMILARITY` (vd 0,7), đổi lại tăng rủi ro khớp nhầm.
- Admin UI chưa được người nhìn trên trình duyệt; tôi chỉ kiểm qua chính các API trang đó gọi.
- **Bổ sung cùng ngày (người dùng chốt):** nhóm đề xuất do **AI chấm mức trùng lặp nội dung**, tối thiểu 85% mới đưa
  lên admin (lọc sơ bộ bằng từ khoá chung, điểm AI được cache 30 ngày, AI lỗi thì nhóm không hiện). Chạy thật với
  `glm-5.3-flash`: 3 cách hỏi "ai được miễn PMC" được chấm 95-100% và gom thành 1 đề xuất; câu "trẻ em có phải đóng
  PMC" chấm 40-65% nên tách riêng; câu hỏi mức phí chấm 10-30%. Sửa 2 lỗi phát hiện khi chạy thật: lọc sơ bộ tách
  nhầm các cách hỏi (nay nối nhóm theo bất kỳ câu nào), và nhóm 1 câu từng lọt lên đề xuất.
- **Còn hở:** lúc phát FAQ cho người dùng vẫn so bằng từ khoá (ngưỡng 0,85), nên câu đã được AI xếp cùng nhóm nhưng
  khác từ khoá (vd "Ai được miễn PMC" so với FAQ "Những ai không phải đóng PMC", độ giống từ khoá 0,5) vẫn do AI trả lời.

### Chưa làm / đang vướng (AI)

- Chưa index đủ 31 luật Úc (đã thử 3 luật). Index Migration Act và Regulations tốn nhiều chunk; gói embedding miễn phí
  100 lượt/phút nên mỗi luật lớn mất vài chục phút. Cần người quyết định phạm vi index thật.
- Chưa có bài Hàn Quốc đã duyệt nên chat KR vẫn từ chối gần hết; TH/SG/MY chờ PR #47 và người duyệt.
- Hạn mức **ngày** của `gemini-3.5-flash-lite` chưa đo được (đã đo giới hạn phút, xem trên).
- Chưa nghiệm thu máy thật; emulator không gõ được chữ có dấu nên câu hỏi thử dùng chữ không dấu.

## Giao diện Be.Travel AI theo mẫu — 19/10/2026

Theo yêu cầu người dùng, thiết kế lại màn chat AI theo mẫu (chỉ giao diện, không đổi contract `ChatAnswer`).

- Header (avatar, "Đang trực tuyến · Luật <quốc gia>", nút cuộc trò chuyện mới và lịch sử), màn chào với 4 thẻ nhanh,
  câu trả lời có bước đánh số và chữ đậm, ô nhập hình viên thuốc, bọc trong `AppShell` (thanh tab, nhãn "Trợ lý AI").
- Thẻ "Thông tin liên hệ" lấy từ hồ sơ Đại sứ quán của quốc gia (do Admin quản lý), KHÔNG do AI sinh; ẩn khi thiếu dữ liệu.
- Thẻ "Bệnh viện" và "Đại sứ quán" mở bản đồ SOS (dữ liệu địa điểm đã xác minh); thẻ "Luật" và "Khẩn cấp" hỏi AI.
- Chưa làm: nút mic trong chat (nhập giọng nói chỉ có ở màn Dịch theo phạm vi MVP), màn khách chưa đăng nhập chưa đổi theo mẫu.
- Màn chat vẫn bị khóa bằng `EXPO_PUBLIC_AI_CHAT_ENABLED` (mặc định false); bật trong `mobile/.env` để xem.

## Luật liên bang Úc — 18/10/2026

Theo yêu cầu người dùng (ngoài lộ trình B1-B9). Tra cứu luật Commonwealth của Úc từ Federal Register of
Legislation (API công khai, không cần key), thêm quốc gia Úc (AU), phân loại 5 mục, tóm lược và dịch tiếng Việt.

- Backend `/api/laws/australia/*` (danh sách, tìm kiếm, chi tiết, phiên bản, nội dung, 5 mục, tóm lược, dịch).
  Dữ liệu chỉ đọc, KHÔNG ghi vào `legal_articles`, KHÔNG vào RAG, `verifiedByBeTravel:false`. Contract: mục 24.
- Phân loại 5 mục là danh sách do Be.Travel tuyển chọn thủ công (31 mã đã đối chiếu với nguồn), không phải đầy đủ.
- Tóm lược có hai tầng: tiêu đề dài + dàn ý Chương/Phần lấy nguyên văn; bản tiếng Việt do AI diễn giải, hậu kiểm bằng code.
- Dịch theo yêu cầu (cụm 25 đoạn, cache DB), chỉ 31 luật đã tuyển chọn; hậu kiểm số liệu từng đoạn; ghi rõ dịch máy.
- Quốc gia Úc: trạng thái `active`, số khẩn cấp 000, để trống Đại sứ quán và số hàng hải vì chưa có nguồn.

### Quyết định phát sinh (Luật Úc)

- Quyết định 1: dịch/tóm tắt luật Úc dùng `TRANSLATION_MODEL` (model dịch), không dùng `LLM_MODEL` của chat, vì gói
  miễn phí Gemini chỉ cho 20 lượt/ngày với model chat và đã từng cạn trong lúc chạy thử.
- Quyết định 2: tóm tắt từng Phần mặc định KHÔNG tự sinh (`AU_LAW_DEEP_SUMMARY_AUTOGEN=false`); sinh chủ động bằng
  `npm run summarize-au-laws`. Gặp 429 theo phút thì chờ rồi thử lại, hạn mức ngày thì báo lỗi ngay.
- Quyết định 3: nguồn không hỗ trợ lọc phủ định nên nhóm luật thuế "A New Tax System" bị loại bằng code sau khi lấy trang.
- Quyết định 4 (19/10/2026): tên luật có tiếng Việt hai lớp. 31 luật tuyển chọn có tên viết sẵn (`core/auLawNames.js`,
  bản dịch tham khảo, chưa có người chuyên ngành luật rà soát); luật khác được AI dịch tên theo lô và cache DB
  (`AU_LAW_TITLE_TRANSLATION`, mặc định bật; quá 8 giây hoặc lỗi thì hiện tên tiếng Anh). Bản dịch bị loại nếu thêm hoặc bớt số.
  Tên chính thức tiếng Anh luôn hiển thị kèm. Tìm kiếm vẫn theo tên tiếng Anh.

### Đang vướng (Luật Úc)

- Tóm tắt từng Phần của Migration Act mới có 5/37 phần (bị 429 ngắt). Cần chạy lại khi hạn mức hồi:
  `npm run summarize-au-laws -- C1958A00062`.
- Dịch toàn bộ 31 luật (~18,8 triệu ký tự) chưa làm; cần API key trả phí.
- Chưa kiểm tra giao diện trên điện thoại thật; liên kết `legislation.gov.au/<id>/latest/text` chưa kiểm chứng từ phía máy chủ.

### Nợ kỹ thuật (Luật Úc)

- Cache dịch lưu cả cụm có đoạn `textVi:null`; các đoạn đó chỉ dịch lại khi cache hết hạn hoặc bị xóa.
- Admin và mobile chưa có test màn hình riêng cho luật Úc (chỉ test client API và logic thuần).

## Khôi phục bản đồ sau merge — 17/10/2026

Tiến độ `[###-] 3/4`, xong một phần. Theo yêu cầu người dùng, lấy bản đồ ở
merge commit `e6361c3` làm nền; hoàn tác phần map của `7c2c6ad` và các thử nghiệm
map chưa commit. Giữ các sửa micro độc lập. Không reset lịch sử, không push.

- Khôi phục OsmWebMap, HTML/CDN Leaflet, chọn runtime và cấu hình như mốc merge.
  Xóa vendor/test chỉ phục vụ thay đổi map đã hoàn tác. Các mục đóng gói Leaflet
  trong báo cáo trước bên dưới không còn mô tả bản hiện hành.
- Sửa lỗi tìm đại sứ quán: luôn truy vấn theo nước được chọn (KR), kể cả khi GPS
  ở Việt Nam hoặc danh sách có tâm khác. Cache key theo nước; camera canh kết quả.
- Khi upstream lỗi, báo rõ chưa có kết quả và cho thử lại; không gọi lỗi mạng là
  không có đại sứ quán. Nguồn ngoài vẫn gắn chưa xác minh, không chèn dữ liệu giả.
- Mobile lint/typecheck và 230/230 tests (53 suites); backend lint/format và
  283/283 tests; admin lint/typecheck/build và 18/18 tests đạt. Tổng 531.
- Hai lần gọi thật service OSM tìm embassy tại KR đều timeout; chưa nghiệm thu
  kết quả thực trên BlueStacks/Samsung. Bộ test dùng mock không thay thế bước này.
- Còn mở: nguồn Overpass phản hồi, thử chọn Hàn Quốc > Đại sứ quán > Gợi ý thêm;
  không cần GPS ở Hàn Quốc. Không thay API/schema/Atlas; không rà/chỉnh toàn macOS.

Android Hermes export bản khôi phục đạt; chưa coi là nghiệm thu UI trên máy thật.

## Bản đồ và micro Samsung A22 / Expo Go — 17/10/2026

Tiến độ `[###-] 3/4` — xong một phần: sửa code, kiểm tự động và tài liệu;
chờ nghiệm thu trên Samsung thật. Không push, không merge vào main.

- Bản đồ: đóng gói Leaflet thay vì tải CDN, cấu hình WebView static HTML,
  chỉ báo sẵn sàng sau khi tải ô; lỗi hiển thị rõ và có thử lại/danh sách.
- Expo Go cả hai nền tảng và Android native thiếu key tự dùng OSM; vẫn tôn trọng
  cấu hình ép native. Ô bản đồ cần Internet; chưa xác định nguyên nhân duy nhất
  trên Samsung vì thiết bị chưa kết nối để lấy log.
- Expo Go không chứa module nhận giọng. Nút micro hướng dẫn đọc chính tả bàn phím
  và focus ô nhập; nhận giọng trong app cần bản Be.Travel native. Sửa giữ phiên
  qua hộp thoại giải thích/quyền, chặn bắt đầu thu khi app ở background.
- Kiểm tra đạt: mobile lint/typecheck, 231/231 tests (54 suites); backend
  lint/format, 283/283 tests; admin lint/typecheck/build, 18/18 tests. Tổng 532.
  Android Hermes export đạt; không coi export là kiểm micro/map trên máy thật.
- Không đổi API/schema/backend hoặc dữ liệu Atlas. Cảnh báo phụ thuộc cũ và
  nghiệm thu native iOS vẫn mở; không chứng nhận toàn hệ điều hành hết lỗi.
- Bước tiếp: chạy Metro với --clear, thử bản đồ trên Samsung; kết nối USB và
  cài bản native để thử micro. Hướng dẫn: [TRANSLATION.md](TRANSLATION.md) mục 4.

## Đồng bộ main vào nhánh dịch offline — hoàn tất 16/10/2026

Nhánh làm việc `feature/offline-translation-20261012`; điểm trước merge `2d8e4b9`.
Bản dự phòng: `backup/offline-before-main-20261015`. Main lấy từ origin là
`4aacd61` (PR #38 giao diện/bản đồ/API địa điểm và PR #39 tài liệu Jira).
Chỉ merge main vào nhánh tính năng local, không merge ngược vào main, không push.

Tiến độ đồng bộ `[####] 4/4`: đã lấy main, xử lý xung đột, kiểm thử và build;
lưu bằng merge commit local trên nhánh tính năng, không push.

- Xung đột `docs/PROGRESS.md`: giữ cả lịch sử offline và lịch sử cập nhật main.
- Xung đột màn dịch: giữ giao diện mới, nút sao chép/phát âm/phiên âm của main;
  giữ giới hạn offline 5.000/online 500, bộ chọn ngôn ngữ, model, micro/TTS,
  ghi công Google, chia đoạn và hủy phiên cũ của nhánh offline.
- Lockfile hợp nhất giữ WebView/SerpApi của main và các bản vá Expo của nhánh.
  Đã cài lại dependencies bằng npm ci cho backend/mobile.
- Mobile lint/typecheck và 227/227 tests đạt, gồm hồi quy offline sau đổi UI.
  Admin không đổi so với bản vừa kiểm tra: 18/18, lint/typecheck/build đạt.
- Trước merge, backend có hai lần lỗi không ổn định (403 thay vì 400 ở trips;
  ECONNRESET ở qa.edge). Trips chạy riêng 10/10 đạt; chưa xác định nguyên nhân.
  Bản sau merge đạt backend 283/283 với mock providers; lint/format đạt.
- Android release QA bản hợp nhất build thành công, xác nhận lại 16/10: 717 tasks,
  43 giây. Có cả WebView bản đồ và module dịch offline. Không coi build là
  nghiệm thu lại toàn bộ giao diện, kết nối bản đồ thật hoặc micro/loa trên thiết bị.
- Fetch lại 16/10 xác nhận origin/main vẫn ở 4aacd61. Tổng kiểm tự động 528/528 đạt.
  Không còn file xung đột; commit offline 2d8e4b9 được giữ trong lịch sử.
- Nghiệm thu micro/loa thật và native iOS vẫn còn mở; không thay đổi dữ liệu Atlas,
  không đưa .env/khóa/artefact build vào commit.


## Dịch offline, micro và phát âm — cập nhật 13/10/2026

Nhánh local `feature/offline-translation-20261012`, từ `a3bc320`; không push/merge.
Tiến độ `[#####-] 5/6` — code/kiểm tự động/tài liệu xong; nghiệm thu thiết bị còn mở.

| Việc | Trạng thái |
|---|---|
| Docs/kiến trúc và hợp đồng | xong; giữ API online và dữ liệu lưu cũ |
| Engine offline Android/iOS | xong code ML Kit, tải/xóa gói chủ động, không fallback cloud |
| Từ/câu dài và giao diện | tối đa 5.000 ký tự, chọn ngôn ngữ không phụ thuộc server, khách mở từ SOS |
| Micro/TTS | on-device, chuẩn bị gói, TTS chia đoạn/lọc giọng cloud; chưa nghe/nói thật |
| Kiểm tra/build | backend 269/269; admin 18/18 + build; mobile 219/219 (51 suites), lint/typecheck đạt |
| Android thực tế | release APK build/cài/mở đạt; SOS > dịch khách, tải model và dịch Việt–Anh và đoạn Anh–Việt 642 ký tự khi tắt Wi-Fi/data đạt |
| Nghiệm thu còn thiếu | micro/loa trên điện thoại thật, native iOS |
| Tài liệu bàn giao | TRANSLATION, ACCEPTANCE, OPTIMIZATION_REPORT đã cập nhật |

Android release cần ép Node arm64 trong môi trường Rosetta này; đã build thành công.
iOS local chỉ có CommandLineTools, chưa đủ Xcode để compile. Expo Doctor 20/21 do
bản vá mới; audit mobile 61, backend 3, admin 0 còn ghi rõ trong tài liệu. Không
chứng nhận toàn macOS hoặc tuyên bố hết mọi lỗi. Không sửa Atlas/secret.
Xem [TRANSLATION.md](TRANSLATION.md) mục 3 để tiếp tục nghiệm thu.

## Bản đồ miễn phí OpenStreetMap — 13/10/2026

Người dùng đưa hướng dẫn `BeTravel_Free_Map_API_Guide.md` (React + Leaflet + Express CommonJS) và nhờ làm theo. Đã chuyển sang đúng ngăn xếp dự án (app Expo, backend ESM, envelope + Zod + rate limit), không dán nguyên.

| Việc | Trạng thái |
|---|---|
| Backend: nhà cung cấp `osm` (Overpass) cho `GET /api/support-locations/external`; `PLACES_PROVIDER=osm` miễn phí, không cần key | xong, chạy thật qua HTTP với Atlas và OSM thật (Seoul: tìm ra đại sứ quán Việt Nam; Busan: tìm ra trong 500 km) |
| Truy vấn: thẻ trước `around` sau, khớp chính xác, bán kính theo loại; thử lại 1 lần khi 429/502/503/504 | xong. Đo thực tế: truy vấn dạng hướng dẫn (around trước, regex) bị 504; dạng mới ~2 giây |
| Mobile: bản đồ OSM bằng Leaflet trong WebView (`OsmWebMap`, Expo Go Android tự bật), ẩn nút Vệ tinh; lớp gợi ý chạy cả khi chưa có GPS (quanh tâm bản đồ) | xong. Lần đầu dùng `UrlTile` trên MapView vẫn nền trống trên LDPlayer (Internet bình thường, ô mở được trong Chrome emulator) nên đổi sang WebView. Kiểm bằng Chrome thật: 12 ô tải, 3 ghim, thông điệp ready. CHƯA xem trên LDPlayer |
| Tìm đại sứ quán Việt Nam theo quốc gia, không cần toạ độ: `?country=KR&type=embassy` (OSM `country=VN` + `target=KR`). Lý do: bản đồ trống tâm vì dữ liệu quốc gia KR chưa có `embassy.lat/lng` và Admin chưa có ô nhập; emulator LDPlayer không có GPS. Màn bản đồ tự canh vào kết quả | xong, chạy thật: KR 3 điểm, JP 1 điểm |
| Env: `PLACES_OVERPASS_URL`, `PLACES_USER_AGENT`, `PLACES_TIMEOUT_MS` mặc định 20 giây; mobile `EXPO_PUBLIC_MAP_TILES`, `EXPO_PUBLIC_MAP_TILE_URL` | xong, đã vào cả hai `.env.example` |
| Hoàn nguyên `mobile/.env.example`: hai dòng khóa Google Maps bị dán URL SerpApi (sai định dạng, làm `app.config.js` báo lỗi nếu sao chép) | xong |

Cố ý KHÔNG làm từ hướng dẫn: trang web React/Leaflet riêng và endpoint `/geocode` (Nominatim): sản phẩm là app mobile, chưa có chỗ dùng geocode; thêm sẽ thành mã chết. Nominatim cũng giới hạn 1 yêu cầu/giây.

Kiểm tra: backend lint sạch, 283/283; mobile tsc + lint sạch, 220/220 (backend 283/283). Thêm gói `react-native-webview` 13.16.1 (qua `npx expo install`).
Cần người làm: khởi động lại backend (đang chạy bản cũ dùng `mock`), `backend/.env` đã thêm `PLACES_PROVIDER=osm`; tự mở màn bản đồ trên Expo Go để xem ô bản đồ. Điểm hỗ trợ ĐÃ XÁC MINH vẫn rỗng cho Hàn Quốc cho tới khi admin nhập.
Rủi ro: Overpass và ô OSM công cộng có chính sách sử dụng công bằng, không cam kết ổn định; dữ liệu OSM có thể sai (đã gặp "đại sứ quán cũ"). Ra sản phẩm thật cần máy chủ Overpass và ô riêng.

## Địa điểm Google Maps qua SerpApi (lớp bổ sung, chưa xác minh) — 12/10/2026

Người dùng yêu cầu thêm API SerpApi (engine google_maps) cho bản đồ. Mục 4.4 CLAUDE.md loại Google Places khỏi MVP, nên đã hỏi lại; người dùng chọn: endpoint riêng gắn nhãn chưa xác minh, key qua biến môi trường.

| Việc | Trạng thái |
|---|---|
| Backend `GET /api/support-locations/external?lat&lng&type` | xong: cache theo loại + ô ~1 km, trần gọi/ngày, rate limit 30/15 phút/IP, timeout; luôn `verified:false`, `source:"google_maps"`; không ghi DB |
| Contract (README mục 14b + fixture `public.externalPlace.json`) + test contract | xong |
| Env: `PLACES_PROVIDER` (mặc định `mock`), `SERPAPI_KEY`, `PLACES_*`; thiếu key khi chọn `serpapi` thì fail fast | xong, đã cập nhật `.env.example` và DEPLOY.md |
| Mobile: nút "Google Maps (chưa xác minh)" trên bản đồ, ghim xám, danh sách riêng, nhãn ở chi tiết | xong, mặc định tắt, chỉ bật được khi có GPS và đang lọc một loại |
| Tách `haversineMeters` ra `utils/geo.js` dùng chung với geoAlert | xong |

Kiểm tra: backend lint sạch, 277/277 (thêm 8 test); mobile tsc + lint sạch, 216/216.

Cần người làm: điền `SERPAPI_KEY` vào `backend/.env` và đặt `PLACES_PROVIDER=serpapi` để chạy thật. CHƯA gọi SerpApi thật lần nào (chưa có key), chưa xem trên thiết bị.
Nợ kỹ thuật: bộ đếm trần/ngày và cache nằm trong RAM, reset khi Render khởi động lại; hạn mức tài khoản SerpApi là chốt cuối. Cần quota lưu DB nếu mở rộng.

## Đối chiếu giao diện mobile với PDF 23 màn — 12/10/2026

Nhánh `feature/ui-redesign-spec`, sau khi merge `origin/main`. Phạm vi: 16 màn mobile, chỉ đổi giao diện (không đổi logic, API, dữ liệu).

| Màn (theo PDF) | Trạng thái |
|---|---|
| #01 Đăng nhập, #02 Đăng ký | xong: header logo + tagline + "Xem giới thiệu", nút có mũi tên, chữ theo PDF |
| #03 Onboarding | xong: khung minh họa + chú thích 01/04, 3 dòng điểm nhấn, 4 bước theo spec 3.2 |
| #06 Cẩm nang, #07 Chi tiết bài | xong: "Tìm nâng cao", "Bộ lọc", lối tắt có mô tả, metadata nối bằng dấu chấm giữa, icon Bookmark |
| #08 Tìm kiếm, #09 Không có kết quả | xong: thẻ kết quả theo mẫu, khung "Hỏi AI", gợi ý từ khóa |
| #11 Dịch nhanh | xong: hàng chọn ngôn ngữ ngang, khối kết quả có Phiên âm đọc + "Phát âm to rõ" |
| #12 SOS | xong: "Quy trình sự cố", khối hướng dẫn 5 bước; GIỮ nút gọi cảnh sát dạng thẻ đỏ |
| #14 Sự cố | xong: lưới 2 cột, thanh tiến độ 1-2-3-4-5 |
| #15 Cảnh báo | xong: thẻ tô màu theo mức, "Đánh dấu đã đọc" và "Xem chi tiết" ngay trên thẻ |
| #16 Hồ sơ | xong một phần: nút "Sửa hồ sơ", bo góc; chưa có thẻ "Chuyến đi của tôi" dạng PDF |
| #05 Home | xong (làm lại sau khi người dùng chụp màn hình báo lệch): hero tối, "Đổi nước", "Thao tác nhanh", chuông có số đếm |
| #04, #13 | CHƯA đối chiếu kỹ (chỉ dò chuỗi chữ), cần ảnh chụp thực tế để so với PDF |
| #10 Chat | giữ nguyên: Be.Travel AI đang tạm khóa bằng màn chờ |

Chưa làm (PDF có, code/backend chưa hỗ trợ): Google OAuth, bộ lọc "Mới cập nhật" và "Chỉ đã xác minh", chip danh mục tình huống ở Dịch, hộp "Việc bạn nên làm" ở chi tiết bài, ngày cập nhật trong kết quả tìm kiếm (cần đổi contract).
Chưa kiểm bằng mắt trên emulator/thiết bị; chưa làm 7 màn Admin.

Kiểm tra: mobile tsc sạch, lint sạch, 213/213.

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

## Lịch sử cũ

Các phiên 28/09-07/10/2026 đã chuyển sang [PROGRESS_HISTORY.md](PROGRESS_HISTORY.md) (19/10/2026).
