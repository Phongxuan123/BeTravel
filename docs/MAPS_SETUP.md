# Bản đồ Be.Travel — cấu hình và vận hành

Cập nhật: 06/10/2026. Nhánh triển khai: `feature/maps-integration-20261006`.

## Kiến trúc hiện hành

| Lớp | Trách nhiệm |
|---|---|
| `mobile/app.config.js` | Nạp key Android lúc build vào config plugin; extra chỉ chứa cờ đã cấu hình |
| `mobile/src/app/sos/map.tsx` | Bản đồ native, danh sách, tìm kiếm, lọc loại, bán kính, GPS chủ động, sheet liên hệ |
| `mobile/src/features/sos/mapHelpers.ts` | Tìm không dấu/tên bản địa/địa chỉ, kiểm tọa độ, tạo URL chỉ đường |
| `mobile/src/lib/locationPermission.ts` | Giải thích quyền foreground, xử lý từ chối/GPS tắt/timeout 15 giây/tọa độ cũ |
| `mobile/src/lib/data.ts`, `lib/api/sos.ts`, `lib/api/adapters.ts` | Chọn mock/thật, gọi API, cache, đổi GeoJSON `[lng,lat]` thành lat/lng cho UI |
| `backend/src/routes/public.routes.js` | Validate query qua Zod, controller mỏng, envelope chuẩn |
| `backend/src/services/publicSupportLocation.service.js` | `$geoNear` trên index 2dsphere, chỉ điểm verified, lọc quốc gia/loại |
| `admin/src/pages/LocationsPage.tsx`, `components/MapPicker.tsx` | Nhập/sửa/import/verify điểm; Leaflet và OpenStreetMap, kiểm RBAC tại backend |

Bản đồ nền do SDK liên hệ trực tiếp nhà cung cấp, không qua Express.
Điểm hỗ trợ là dữ liệu Be.Travel; không dùng Google Places hoặc tạo dữ liệu SOS giả.
Không đổi endpoint, không thêm collection/index/migration. API contract vẫn ở
`contracts/README.md` mục 14. Ba workspace npm độc lập được giữ nguyên.

## Bật bản đồ Android trong native build

1. Trong Google Cloud, chọn project, bật **Maps SDK for Android**, hoàn tất yêu cầu
   tài khoản/billing của Google và cấu hình quota cap theo quy tắc dự án.
2. Chốt `ANDROID_PACKAGE` của ứng dụng. Lấy SHA-1 từ chứng thư ký dev/EAS hoặc
   **App signing key certificate** của Google Play cho bản phát hành; mỗi chứng thư
   dùng cần có giới hạn tương ứng.
3. Tạo API key; Application restrictions = Android apps, khai package + SHA-1;
   API restrictions = Maps SDK for Android. Không dùng key server/AI cho bản đồ.
4. Điền trong `mobile/.env` local hoặc EAS environment của profile build:

   ```dotenv
   GOOGLE_MAPS_ANDROID_API_KEY=<key-thật>
   ANDROID_PACKAGE=<package-đã-chốt>
   IOS_BUNDLE_IDENTIFIER=<bundle-id-đã-chốt>
   EXPO_PUBLIC_USE_MOCKS=false
   EXPO_PUBLIC_API_URL=https://<backend-thật>/api
   ```

   Không commit `.env`. Không dùng tiền tố `EXPO_PUBLIC_` cho Maps key.
   Key native vẫn nằm trong binary; giới hạn package/chứng thư là bắt buộc.
5. Build lại native: dùng profile EAS đã thiết lập của nhóm hoặc
   `npx expo run:android` trên máy có Android SDK. Thay key cần rebuild;
   khởi động lại Metro hoặc cập nhật JS qua OTA không cài key vào binary.
6. Kiểm trên Android thật: mở SOS -> bản đồ, xác nhận tile hiển thị, GPS, marker,
   danh sách, gọi và chỉ đường. Key đúng định dạng chưa chứng minh key được Google
   cấp quyền hoặc có quota; cần kiểm dashboard lỗi nếu tile trắng.

iOS giữ Apple Maps mặc định, không cần Google Maps key. Expo Go dùng cấu hình
native riêng của Expo và chạy được khi chưa cấu hình key của Be.Travel.
Android standalone chưa có key chuyển sang danh sách; không mount Google Maps
với key placeholder. Thiếu hoặc sai package/SHA-1/quota cần người quản lý tài khoản xử lý.

Tài liệu chính thức đã đối chiếu:
[Expo SDK 57 react-native-maps](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/),
[Expo SDK 57 Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/).

## Luồng sử dụng

- Mở bản đồ: tải điểm verified theo quốc gia, không tự xin GPS.
- Bấm **Vị trí của tôi**: giải thích trước khi xin quyền. Có GPS mới dùng nearby;
  từ chối/tắt dịch vụ/lỗi vẫn dùng danh sách, nhập thành phố/khu vực trong ô tìm kiếm.
- Bộ lọc loại + bán kính 5/20/50 km dùng query API hiện có, giới hạn 50 điểm.
  Nếu không có điểm trong bán kính, backend trả điểm gần nhất trong quốc gia;
  giao diện nói rõ điều này. Khoảng cách là đường chim bay từ lần đo gần nhất,
  không phải thời gian/lộ trình đi đường. Bấm định vị để đo lại.
- Tìm kiếm không dấu theo tên, tên bản địa và địa chỉ **trong danh sách đã tải**.
  Đây không phải công cụ tra mọi cửa hàng hoặc điểm chưa có trong database.
- **Xem các điểm** căn camera theo kết quả; **Xem danh sách** dùng khi tile không tải.
- Chọn marker/dòng để xem liên hệ, ngày kiểm chứng, địa chỉ và giờ mở cửa nếu có.
  Gọi điện, chỉ đường qua app hệ thống/URL dự phòng, sao chép địa chỉ có báo kết quả.
- Không có điểm verified: hiện trạng thái rỗng, không đánh dấu dữ liệu giả là thật.

## Cache và dữ liệu

Cache tách theo quốc gia/loại và chế độ list/nearby. Nearby có limit không ghi đè
list toàn quốc. Khi offline ưu tiên list đã tải, rồi tập nearby gần nhất; tập này
có thể thiếu điểm. Kiểm schema, verified và biên tọa độ trước khi dùng cache cũ;
tính lại khoảng cách, bán kính và limit. Banner luôn thông báo dữ liệu có thể cũ
hoặc chưa đầy đủ. Không cache tile bản đồ và không bảo đảm tuyến đường offline.

GPS snapshot chỉ giữ trong memory của màn hình; tọa độ được gửi tới endpoint nearby
khi người dùng chọn định vị. Không thêm lưu lịch sử vị trí hoặc theo dõi nền.
Khi đổi quốc gia, query/cache có khóa riêng và sheet cũ được đóng để tránh liên hệ sai nước.

## Nghiệm thu ngoài máy còn mở

- Người quản lý cung cấp key/package/chứng thư/bundle ID và bật quota.
- Nhóm nội dung nhập và verify điểm hỗ trợ thật trong admin (phone/website/địa chỉ/GPS).
- Kiểm thiết bị iOS/Android: vị trí gần đúng, offline tile, font lớn, cửa sổ quyền,
  không có Google Play Services, cuộc gọi, Apple/Google Maps và chứng thư phát hành.
- Expo export chỉ chứng minh JS bundle; không thay thế native build ký hoặc test thiết bị.

Kết quả kiểm thử local cập nhật tại `PROGRESS.md` và `ACCEPTANCE.md`.
