# Mẫu Google Maps do người dùng cung cấp

Ngày nhận: 06/10/2026. Trạng thái: **người dùng đã cho phép khởi tạo bản đồ**.
Mẫu gốc được lưu tham khảo; triển khai app theo Expo native, không chạy HTML nhúng.

| Tệp | Mẫu | Nguồn |
|---|---|---|
| `01-commutes-and-destinations.html` | Commutes and Destinations Map | Tệp đính kèm 1 |
| `02-address-selection.html` | Address Selection | Tệp đính kèm 2 |
| `03-neighborhood-discovery.html` | Neighborhood Discovery | Tệp đính kèm 3–10, nội dung giống hệt nhau |
| `04-custom-controls.html` | Custom Controls, Center Map và KML/GeoRSS | Đoạn HTML trong tin nhắn |
| `05-checkout-autocomplete.html` | Checkout with Google Maps Autocomplete | Tệp bổ sung |
| `06-android-current-place.txt` | Android CurrentPlaceDetailsOnMap | Hai tệp Android giống hệt nhau; lưu dạng snippet |
| `07-aerial-view.html` | Aerial View | Đoạn HTML bổ sung, bỏ escape do chat |
| `08-simple-map.html` | Simple Map, importLibrary | Đoạn HTML bổ sung, bỏ escape do chat |

Đã nhận 14 tệp đính kèm và 3 đoạn HTML: tổng cộng **8 mẫu độc lập**.
Các mẫu từ tệp được lưu nguyên byte; `attachments.json` ghi hash SHA-256 và
ánh xạ cả 14 bản gốc. Các bản Neighborhood Discovery trùng nhau được lưu chung
một tệp, không mất biến thể. Đoạn Custom Controls giữ nguyên code và thông tin
bản quyền Apache-2.0; chỉ chuẩn hóa khoảng trắng cuối dòng.
Các mẫu có khai báo Apache-2.0 giữ header gốc; bản license đầy đủ kèm trong
`LICENSE-APACHE-2.0.txt`. Hai đoạn chat bổ sung được khôi phục escape/định dạng,
không chạy hoặc sửa logic; manifest lưu hash bản đã khôi phục.

Đây là mã mẫu HTML/JavaScript sử dụng Google Maps, chưa phải API key hoặc dịch
vụ backend đã cấu hình. Các key trong mẫu là placeholder. Giữ thông tin license
trong từng tệp; khi triển khai cần đối chiếu SDK hiện hành và kiến trúc Expo native
của Be.Travel, không tự chép HTML vào màn native.

Luồng khởi tạo, camera và Center Map được áp dụng bằng MapView native; bổ sung
vệ tinh, trạng thái tải và retry. Không dùng Chicago/Mountain View làm dữ liệu
thực của người dùng. Places/Autocomplete và Aerial View là dịch vụ riêng, chưa
bật trong app; KML feed HTTP và snippet Activity không được chép vào Expo.
Xem [MAPS_SETUP.md](../../MAPS_SETUP.md) để cấu hình và nghiệm thu hai nền tảng.
