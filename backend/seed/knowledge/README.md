# Kho tri thức chờ nhập (TH, SG, MY)

Chắt lọc ngày 19/10/2026 từ gói BeAI của Thành Đạt. Chi tiết, kết quả kiểm tra và các việc cần quyết định:
[docs/AI_KNOWLEDGE_BASE.md](../../../docs/AI_KNOWLEDGE_BASE.md).

- `<cc>.json`: bài theo nước, tóm tắt tiếng Việt kèm nguồn chính thức. **Chưa được người duyệt**; chỉ nhập ở
  trạng thái `draft`, không xuất bản khi thiếu `publishedAt` của nguồn và `effectiveFrom` của bài.
- `evidence/<cc>/`: bản lưu trang nguồn (Firecrawl, 18/10/2026) để người duyệt đối chiếu đoạn trích.
- Câu đánh giá tương ứng: `test/golden/<cc>.json`.

Chưa có script nhập. Không dùng embedding trong gói gốc (3072 chiều); sau khi nhập phải chạy `npm run reindex`.
