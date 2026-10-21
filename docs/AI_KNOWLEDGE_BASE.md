# Kho tri thức AI từ gói BeAI của Thành Đạt

Cập nhật: 19/10/2026. Nguồn: thư mục `Betravel/` Đạt bàn giao (bản 18/10/2026). Thư mục gốc **không commit**
vì là một dự án demo riêng và có hash mật khẩu tài khoản demo. Tài liệu này ghi lại phần đã chắt lọc
vào repo, phần bỏ lại, kết quả kiểm tra và các ý tưởng thiết kế dùng cho việc hoàn thiện Be.Travel AI.

## 1. Đã đưa vào repo

| File | Nội dung | Dùng để |
|---|---|---|
| `backend/seed/knowledge/th.json` | 21 bài Thái Lan | Nhập vào `legal_articles` ở trạng thái **draft** |
| `backend/seed/knowledge/sg.json` | 18 bài Singapore | Như trên |
| `backend/seed/knowledge/my.json` | 14 bài Malaysia | Như trên (chưa có quốc gia MY, cần nhóm chốt) |
| `backend/seed/knowledge/evidence/<cc>/*.md` | 52 bản lưu trang nguồn chính thức (Firecrawl, 18/10; 50 trang, 2 trang Cục Lãnh sự dùng chung cho TH và MY) | Người duyệt đối chiếu tóm tắt với nguyên văn |
| `backend/test/golden/th.json`, `sg.json`, `my.json` | 60 câu đánh giá đã đổi sang định dạng golden của repo | Golden test khi có dữ liệu và runner hỗ trợ |
| `docs/AI_KNOWLEDGE_BASE.md` | Tài liệu này | Bàn kế hoạch tính năng AI |

Mỗi bài trong `<cc>.json` có: `slug`, `title`, `topicGroups` (nhóm 1-9), `suggestedTopicSlug`, `keywords`,
`summaryVi` (tóm tắt tiếng Việt của Đạt, giữ nguyên văn), `source` (theo `sourceSchema` của `LegalArticle`:
`title`, `url`, `authority`, `kind`, `accessedAt`, `publishedAt`), `evidence` (file lưu và đoạn trích gốc)
và `checks`. Phần đầu file ghi `provenance`, `reviewStatus`, `importRule` và `gaps` (chủ đề còn thiếu nguồn).

Golden: câu `fact` và `scenario` thành `must_answer` (kèm `expectArticleSlug` và `assert.answerMustMatch`
là các regex dữ kiện của Đạt); câu `trap` thành `must_refuse` (phải ra `INSUFFICIENT_EVIDENCE`, không có
số tiền theo đơn vị tiền tệ của nước đó). Trường `origin` và `group` giữ lại để thống kê.

## 2. Không đưa vào, và lý do

| Phần | Lý do |
|---|---|
| `apps/web`, `apps/api` (React/Vite + Express TypeScript) | Khác kiến trúc repo (Expo + Express JS). Chỉ lấy ý tưởng, ghi ở mục 5 |
| `data/db-snapshot/` (bài, chunk, embedding) | Embedding `gemini-embedding-2` **3072 chiều**; repo chốt **768 chiều**, trộn sẽ hỏng tìm kiếm. Phải embed lại bằng `npm run reindex` |
| `data/db-snapshot/users.json` | Hash mật khẩu tài khoản demo, không có giá trị cho repo |
| `.firecrawl/*.json` (kết quả tìm kiếm) và 20 bản lưu không được bài nào dẫn tới | Dữ liệu trung gian của bước thu thập |
| Ảnh chụp màn hình, CSS, ảnh minh hoạ, script QA của web demo | Thuộc giao diện web, không dùng |

## 3. Kết quả kiểm tra tự động khi chắt lọc (19/10/2026)

- **Đoạn trích:** 53/53 bài có `evidenceExcerpt` tìm thấy nguyên văn trong file lưu (đã bỏ cú pháp link markdown khi so).
- **Tên miền:** 53/53 URL nằm trong danh sách tên miền chính thức theo nước của Đạt (cơ quan nhà nước sở tại,
  Bộ Ngoại giao Việt Nam / Cục Lãnh sự, cơ quan du lịch quốc gia).
- **Nhóm chủ đề:** 53/53 bài có nhóm. Singapore không ghi nhóm trong manifest, nên nhóm được suy từ câu
  đánh giá dẫn tới URL đó.
- **Golden:** 60/60 câu `must_answer` gắn được với một bài.
- **Phân loại nguồn:** TH 14 gov + 7 embassy; SG 14 gov + 2 legal_text + 2 embassy; MY 11 gov + 3 embassy.

Kiểm tra này chỉ chứng minh trích dẫn có thật trong bản lưu, **không chứng minh tóm tắt tiếng Việt đúng**.
`reviewedBy` của cả ba nước là AI ("Claude" / "Codex"), kèm câu "not legal counsel".

### Kết quả chạy thật của Đạt (18/10, `gemini-3.5-flash-lite`, hệ thống của Đạt)

Đạt 56/60: SG 20/21, TH 19/20, MY 17/19. Bốn câu trượt:

| Câu | Ghi nhận |
|---|---|
| `sg-missing-evidence` (bẫy) | Câu trả lời đúng là từ chối ("không đủ để biết mức phạt"), nhưng regex chấm không khớp. Lỗi bộ chấm, không phải lỗi AI |
| `th-medication` | Thiếu dữ kiện thứ nhất (có cần xin phép) dù trích đúng nguồn FDA Thái |
| `my-lost-passport` | Thiếu dữ kiện "5 ngày" |
| `my-scam` | Thiếu "ngân hàng / cảnh sát" trong câu trả lời |

Chấm bằng regex dữ kiện và URL trích dẫn chỉ là kiểm tra tự động; vẫn cần người đọc câu trả lời.

## 4. Độ phủ và khoảng trống dữ liệu

Nhóm chủ đề (mapping sang topic của repo là **đề xuất**, nhóm chốt khi nhập):

| Nhóm | Nội dung | Topic đề xuất | TH | SG | MY |
|---|---|---|---|---|---|
| 1 | Nhập cảnh, visa, thẻ khai báo | `nhap-canh` | 3 | 1 | 2 |
| 2 | Hải quan, tiền mặt, thuốc mang theo | `hai-quan` | 5 | 5 | 3 |
| 3 | Ứng xử nơi công cộng: rượu, thuốc lá, xả rác | `hinh-su` | 4 | 4 | 2 |
| 4 | Tôn giáo, trang phục, phong tục | chưa có topic | 2 | 1 | 1 |
| 5 | Flycam, chụp ảnh | chưa có topic | 3 | 1 | 1 |
| 6 | Giao thông, bằng lái | `giao-thong` | 2 | 1 | 1 |
| 7 | Đại sứ quán, bảo hộ công dân | `khan-cap` | 3 | 2 | 1 |
| 8 | Sự cố: mất hộ chiếu, bị bắt, lừa đảo | `khan-cap` | 4 | 4 | 3 |
| 9 | Khiếu nại, cảnh sát du lịch | `khan-cap` | 4 | 2 | 2 |

Một bài có thể thuộc nhiều nhóm nên tổng cột lớn hơn số bài.

Khoảng trống Đạt tự ghi (chi tiết trong trường `gaps`):
- **TH:** chưa có nguồn chính thức về cấm hút thuốc ở bãi biển, luật khi quân; chụp ảnh khu quân sự; mức phạt
  giao thông, mũ bảo hiểm, thuê xe máy, IDP cấp tại Việt Nam; quy trình khi gặp tai nạn.
- **SG:** các lỗi nơi công cộng khác (băng qua đường sai chỗ); mức phạt giao thông, thuê xe máy; thủ tục khi
  bị bắt và cấp lại giấy tờ khi mất hộ chiếu tại Singapore.
- **MY:** du khách lái xe bằng bằng nước ngoài / IDP và mức phạt; Cảnh sát du lịch; quy định trang phục chung.

**Không có Hàn Quốc (KR)**, thị trường chính của Be.Travel. Bộ KR vẫn là 8 bài nháp + 26 câu golden hiện có.

## 5. Ý tưởng thiết kế từ BeAI của Đạt, đối chiếu với hệ thống hiện tại

| Ý tưởng | BeAI của Đạt | Be.Travel hiện tại | Đề xuất |
|---|---|---|---|
| Danh sách tên miền chính thức theo nước | Đặt trong code, có test; importer từ chối URL ngoài danh sách | Chưa có, nguồn do Admin nhập tay | Thêm kiểm tra tên miền khi nhập bài và khi Admin lưu nguồn `gov` |
| Nguồn và lịch sử hội thoại là **dữ liệu, không phải lệnh** | Có trong prompt | Prompt chưa nói rõ | Thêm một dòng vào system prompt (chống prompt injection từ nội dung nguồn) |
| Phân luồng câu hỏi trước truy hồi: A thông tin, B sự cố không nguy hiểm, C khẩn cấp, D xin tư vấn cá nhân | Mới là đề xuất, chưa code | Prompt có quy tắc 6 cho khẩn cấp, chưa phân luồng bằng code | Phân luồng bằng từ khoá trong code (không tốn lượt gọi AI); luồng C thắng khi có từ nguy hiểm; luồng D từ chối phần tư vấn |
| Câu ranh giới "không phải tư vấn pháp lý" do code chèn | Đề xuất | Đã có `DEFAULT_DISCLAIMER` do code gắn | Giữ nguyên |
| Số tiền và **số điện thoại** trong câu trả lời phải có trong nguồn | Đề xuất validator so regex với đoạn trích | Guard đã đối chiếu số tiền với nguồn, **chưa kiểm số điện thoại**; đơn vị tiền chưa có `RM` / `MYR` / `ringgit` | Bổ sung số điện thoại và đơn vị tiền của nước mới vào guard |
| Phát hiện nguồn đã cũ | Đề xuất: scrape lại định kỳ, so `sha256`, gắn `needsReview` | Chưa có | Làm sau khi có bài xuất bản; chu kỳ: visa/hải quan 30 ngày, luật địa phương 90 ngày |
| `effectiveTo` tự động theo chu kỳ kiểm tra lại | Đề xuất | Có trường `effectiveTo`, chưa tự đặt | Cân nhắc khi chốt quy trình duyệt |
| Thống kê câu bị từ chối theo chủ đề để biết thiếu nguồn gì | Đề xuất | Dashboard đã có "Top câu hỏi bị fallback" | Gộp theo nhóm 1-9 khi có phân luồng |
| Retry 503/429 một lần trên cùng model, không tự đổi model | Đã làm (`docs/beai-503-fix.md`) | Kiểm lại khi bật AI thật | Kiểm khi mở khoá chat (E3-05) |
| Ngưỡng hồi quy: đạt từ 80%, câu bẫy 100% | Đề xuất | Golden KR phải xanh toàn bộ (mock) | Áp cho golden chạy bằng AI thật (E3-04) |
| Streaming câu trả lời | Đã làm (SSE) | **Ngoài phạm vi MVP** (CLAUDE.md 4.4) | Không làm |
| SOS, hotline, QR gọi khẩn cấp | Web demo loại bỏ | Be.Travel đã có SOS | Không lấy ranh giới này của Đạt |

## 6. Cần người quyết định trước khi dùng

1. **Người duyệt nội dung:** 53 bài mới chỉ được AI kiểm. Theo quy tắc dự án, chỉ nhập ở trạng thái draft;
   muốn xuất bản phải có người duyệt và điền `publishedAt` của nguồn + `effectiveFrom` của bài (E2-06, E2-07).
2. **Quốc gia:** TH và SG đang "Sắp ra mắt" trong app; **MY chưa có**. Nhóm chốt có mở MY không.
3. **Topic cho nhóm 4 và 5** (phong tục / trang phục, flycam / chụp ảnh): tạo topic mới hay gộp vào topic có sẵn.
4. **Golden runner:** `test/golden.test.js` mới đọc `kr.json`. Khi nối TH/SG/MY cần đọc file theo nước và hỗ trợ
   khoá `answerMustMatch`. Với LLM mock, các khẳng định dữ kiện sẽ chưa có ý nghĩa; chủ yếu kiểm truy hồi đúng
   bài và từ chối câu bẫy.
5. **Bản lưu nguồn:** 52 file trong `evidence/` là bản chép trang công khai của cơ quan nhà nước, chỉ dùng nội
   bộ để đối chiếu, không hiển thị cho người dùng.
