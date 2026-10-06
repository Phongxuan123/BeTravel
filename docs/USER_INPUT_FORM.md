# Dữ liệu và cấu hình cần người bổ sung

Cập nhật 06/10/2026. Chỉ điền dữ liệu đã xác minh; không dán API key, mật khẩu,
URI database hoặc chứng thư private vào tài liệu/chat/repository.

| Nhóm | Cần cung cấp hoặc cấu hình | Nơi sử dụng |
|---|---|---|
| Maps Android/iOS | Project Google Cloud, Maps SDK bật, key riêng restricted; Android package + SHA-1, iOS bundle ID, quota cap | Env local/EAS; hướng dẫn MAPS_SETUP.md |
| App iOS | Bundle ID được nhóm chốt và tài khoản/chứng thư build | IOS_BUNDLE_IDENTIFIER, native build |
| Điểm hỗ trợ | Quốc gia, loại, tên/tên bản địa, địa chỉ, tọa độ thật [lng,lat], phone/website, giờ mở, ngày verify | Admin Locations, mẫu sos-locations-template.csv; verify sau kiểm nguồn |
| Cảnh báo khu vực | Quốc gia, nguồn/nội dung kiểm chứng, thời gian hiệu lực; tâm/bán kính nếu area | Admin Geo Alerts |
| Nội dung pháp luật | Nguồn chính thức, URL, authority, publishedAt, effectiveFrom, nội dung được nhóm duyệt | Admin Articles; không tự bật tra cứu khi chưa được yêu cầu |
| Điều khoản/bảo mật | Văn bản đã được nhóm duyệt và URL xuất bản | Màn đăng ký; hiện dùng màn đang hoàn thiện |
| Offline khẩn cấp | Bộ số khẩn cấp theo quốc gia đã xác minh, nguồn và ngày cập nhật | Cần thống nhất phiên bản/bộ dữ liệu trước đóng gói |
| Triển khai | Backend URL, Atlas/index đã kiểm, domain admin, cấu hình env dịch vụ | DEPLOY.md; secret chỉ trong environment của dịch vụ |

Nghiệm thu cần điện thoại iOS/Android thật: tile, GPS gần đúng/tắt/từ chối, offline,
font lớn, copy/gọi/chỉ đường và quyền native. Kết quả local trong PROGRESS/ACCEPTANCE
không thay thế nghiệm thu này.
