# Nguồn dịch Việt - Anh và cách vận hành

Cập nhật 29/09/2026. Không bổ sung dependency hay workspace chung.

## Hai chế độ

- **Việt - Anh** độc lập quốc gia đang chọn, đổi chiều bằng nút giữa hai ngôn ngữ. Câu mẫu đảo đúng nội dung nguồn/đích. Khi đổi chiều, kết quả cũ được chuyển thành câu đầu vào rồi cần dịch lại.
- **Ngôn ngữ sở tại** tiếp tục dùng ngôn ngữ quốc gia và QuickPhrase quản trị sẵn có.
- Mười cặp câu Việt/Anh được đóng gói cùng app, dùng ngoại tuyến cả hai chiều. Tra cứu chỉ chuẩn hóa Unicode NFC, khoảng trắng và chữ hoa/thường; giữ dấu và dấu câu, không ghép từ rời để giả lập dịch câu.
- Câu tự nhập khác mẫu gọi `POST /api/translate`, cần mạng, tài khoản và provider LLM đã cấu hình. Giới hạn 500 ký tự; chia sẻ quota AI/ngày với chat. Provider lỗi vẫn tính lượt vì có thể đã phát sinh chi phí. Cùng ngôn ngữ trả nguyên văn không gọi AI.
- API chuẩn hóa vi/en/ko/ja/th/zh/fr/de, biến thể vùng hai chữ như en-US và tên hiển thị Việt/Anh tương ứng; ngôn ngữ khác trả VALIDATION_ERROR. Response giữ `{ translated, phonetic }` như contracts.
- Sửa câu, đổi chiều, đổi quốc gia/tài khoản hoặc chọn câu mẫu vô hiệu phản hồi cũ. Không lưu câu tự nhập vào cache. Phát âm dùng giọng thiết bị, khả năng ngoại tuyến phụ thuộc giọng đã cài.

## Tatoeba: câu mẫu có nguồn mở

Nguồn: cộng đồng [Tatoeba](https://tatoeba.org/), [điều khoản sử dụng](https://tatoeba.org/en/terms_of_use), giấy phép [CC BY 2.0 France](https://creativecommons.org/licenses/by/2.0/fr/). Truy xuất 28–29/09/2026 qua API công khai và trang câu. Giữ nguyên văn từng câu; ghi công cộng đồng và liên kết trang nguồn có lịch sử/người đóng góp. Giao diện hiện giấy phép và liên kết nguồn Anh/Việt khi chọn câu.

| Câu tiếng Anh | Nguồn Anh | Nguồn Việt |
|---|---|---|
| Help me! | [1126684](https://tatoeba.org/en/sentences/show/1126684) | [1550859](https://tatoeba.org/en/sentences/show/1550859) |
| Help us. | [2187193](https://tatoeba.org/en/sentences/show/2187193) | [13338312](https://tatoeba.org/en/sentences/show/13338312) |
| We need emergency assistance. | [2953717](https://tatoeba.org/en/sentences/show/2953717) | [4786061](https://tatoeba.org/en/sentences/show/4786061) |
| My passport is at the hotel. | [13709342](https://tatoeba.org/en/sentences/show/13709342) | [13710217](https://tatoeba.org/en/sentences/show/13710217) |
| I was at the hospital. | [11176745](https://tatoeba.org/en/sentences/show/11176745) | [11262292](https://tatoeba.org/en/sentences/show/11262292) |
| Yes, I understand. | [2701641](https://tatoeba.org/en/sentences/show/2701641) | [13351036](https://tatoeba.org/en/sentences/show/13351036) |
| I understand French. | [5958308](https://tatoeba.org/en/sentences/show/5958308) | [13340818](https://tatoeba.org/en/sentences/show/13340818) |
| Thank you! | [374827](https://tatoeba.org/en/sentences/show/374827) | [510444](https://tatoeba.org/en/sentences/show/510444) |
| I heard they don't have a passport. | [13724862](https://tatoeba.org/en/sentences/show/13724862) | [13726512](https://tatoeba.org/en/sentences/show/13726512) |
| Tom is helping. | [5854386](https://tatoeba.org/en/sentences/show/5854386) | [13599296](https://tatoeba.org/en/sentences/show/13599296) |

Đây là dữ liệu cộng đồng, không phải bản dịch được chứng nhận; chưa xây dựng từ điển đầy đủ. Sáu mục từ du lịch trong JSON là gợi ý ngữ cảnh cho prompt (hộ chiếu, khách sạn, bệnh viện, giúp đỡ, hiểu, tiếng Pháp), liên kết qua ID câu ví dụ. Khi mở rộng phải kiểm tra cặp dịch trực tiếp, giấy phép từng câu và giữ nguồn.

## Ngữ pháp: Universal Dependencies

Tham khảo [hướng dẫn Vietnamese của Universal Dependencies](https://universaldependencies.org/vi/index.html): phân đoạn từ đa âm tiết, phủ định và trợ từ chỉ khả năng/nghĩa vụ. Các chỉ dẫn prompt trong JSON do dự án diễn đạt lại; yêu cầu giữ tên riêng, số, thời gian và ý phủ định, tránh dịch từng âm tiết riêng lẻ. Không sao chép hoặc huấn luyện từ treebank. [UD Vietnamese VTB](https://github.com/UniversalDependencies/UD_Vietnamese-VTB) là tài liệu tham khảo học thuật, không phải bộ câu dịch song ngữ hoàn chỉnh.

## File và kiểm thử

- `backend/src/translation/vi-en.json` và `mobile/src/features/translate/vi-en.json` cố ý là hai bản tài nguyên trong hai workspace độc lập; test backend so sánh bằng nhau để tránh lệch dữ liệu.
- `backend/src/services/translate.service.js` dùng ngữ pháp/từ vựng trong prompt, tách câu cần dịch vào JSON và kiểm tra cấu trúc output. Không hứa prompt loại bỏ tuyệt đối việc AI dịch sai/chèn chỉ dẫn.
- `mobile/src/features/translate/phrasebook.ts` và API client tra cứu exact phrase trước khi gọi mạng.
- Test kiểm tra 10 cặp hai chiều, offline không gọi API, giữ dấu, không nhầm câu phủ định, quota, input/response không hợp lệ, đảo chiều UI và race response.
- Bộ kiểm thử dùng provider giả lập. Chất lượng câu tự nhập với provider thật, giọng phát âm và trải nghiệm trên thiết bị cần nghiệm thu riêng; không dùng kết quả test mock để khẳng định độ chính xác ngôn ngữ.
