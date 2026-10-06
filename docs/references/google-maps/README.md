# Mẫu Google Maps do người dùng cung cấp

Ngày nhận: 06/10/2026. Trạng thái: **đang thu thập, chờ người dùng báo đã đủ**.
Chưa tích hợp hoặc chạy các mẫu này trong ứng dụng.

| Tệp | Mẫu | Nguồn |
|---|---|---|
| `01-commutes-and-destinations.html` | Commutes and Destinations Map | Tệp đính kèm 1 |
| `02-address-selection.html` | Address Selection | Tệp đính kèm 2 |
| `03-neighborhood-discovery.html` | Neighborhood Discovery | Tệp đính kèm 3–10, nội dung giống hệt nhau |
| `04-custom-controls.html` | Custom Controls, Center Map và KML/GeoRSS | Đoạn HTML trong tin nhắn |

Đã nhận 10 tệp đính kèm và 1 đoạn HTML: tổng cộng **4 mẫu độc lập**.
Ba mẫu từ tệp được lưu nguyên byte; `attachments.json` ghi hash SHA-256 và
ánh xạ cả 10 bản gốc. Các bản Neighborhood Discovery trùng nhau được lưu chung
một tệp, không mất biến thể. Đoạn Custom Controls giữ nguyên code và thông tin
bản quyền Apache-2.0; chỉ chuẩn hóa khoảng trắng cuối dòng.

Đây là mã mẫu HTML/JavaScript sử dụng Google Maps, chưa phải API key hoặc dịch
vụ backend đã cấu hình. Các key trong mẫu là placeholder. Giữ thông tin license
trong từng tệp; khi triển khai cần đối chiếu SDK hiện hành và kiến trúc Expo native
của Be.Travel, không tự chép HTML vào màn native.

Phiên sau tiếp tục lưu mẫu mới vào thư mục này, cập nhật danh mục và hash.
Chỉ bắt đầu tích hợp khi người dùng yêu cầu sau khi thu thập đủ.
