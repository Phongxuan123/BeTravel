# Bản đồ Be.Travel — cấu hình và vận hành

Cập nhật: 06/10/2026. Nhánh triển khai: `feature/maps-integration-20261006`.

## Kiến trúc hiện hành

| Lớp | Trách nhiệm |
|---|---|
| `mobile/app.config.js` | Nạp key Android/iOS lúc build vào config plugin; extra chỉ chứa cờ đã cấu hình |
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

### Google Maps trên iOS

Bật **Maps SDK for iOS** trong Google Cloud, tạo key riêng restricted theo
`IOS_BUNDLE_IDENTIFIER` và giới hạn API Maps SDK for iOS. Điền
`GOOGLE_MAPS_IOS_API_KEY` trong mobile/.env/EAS rồi build lại iOS. Config plugin
nhúng key; màn map chọn `PROVIDER_GOOGLE` khi có cấu hình. Kiểm tile trên bản dựng
thật sau khi cài đặt. Không dùng key Gemini hoặc key Android restricted cho iOS.
Hướng dẫn Google: [Android](https://developers.google.com/maps/documentation/android-sdk/get-api-key),
[iOS](https://developers.google.com/maps/documentation/ios-sdk/get-api-key).

iOS không có key giữ Apple Maps mặc định. Expo Go dùng cấu hình
native riêng của Expo và chạy được khi chưa cấu hình key của Be.Travel.
Android standalone chưa có key chuyển sang danh sách và có nút mở Google Maps bên ngoài; không mount Google Maps
với key placeholder. Thiếu hoặc sai package/SHA-1/quota cần người quản lý tài khoản xử lý.

Tài liệu chính thức đã đối chiếu:
[Expo SDK 57 react-native-maps](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/),
[Expo SDK 57 Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/).

## Luồng sử dụng

### Khởi tạo hoàn chỉnh Android và iOS — cập nhật 06/10

1. Điền key riêng và định danh trong `mobile/.env`/EAS như phần trên. Chưa có key
   thật thì không thể xác minh Maps Google trên binary Be.Travel.
2. Trong `mobile/`, chạy `npm run maps:check` (cả hai nền tảng) hoặc
   `npm run maps:check -- --platform android` / `--platform ios`.
   Lệnh dùng Node 22, chỉ kiểm định dạng, không in key, không gọi dịch vụ và
   không xác minh billing/quota/restrictions. Exit 1 khi thiếu cấu hình.
3. Sau khi preflight đạt, build binary mới với `npx expo run:android` và
   `npx expo run:ios`, hoặc profile EAS đã cấu hình. Máy cần Android SDK/Xcode
   tương ứng nếu build local; EAS cần tài khoản và credentials của nhóm.
   Profile EAS hiện còn URL backend placeholder: thay bằng URL thật trước build.
4. Mở SOS -> bản đồ. Kiểm cả hai thiết bị: tile đường/vệ tinh, về tâm, fit marker,
   GPS cấp/từ chối, đổi nước/loại/bán kính, chế độ list, gọi và chỉ đường.

Khởi tạo có trạng thái tải và watchdog 20 giây. Native chưa phát onMapReady
thì chuyển sang list, cho thử lại bằng mount mới. onMapReady chỉ chứng minh
MapView đã khởi tạo; tile trắng do key không có quyền vẫn cần kiểm Google Cloud
và có thể chuyển list thủ công. JS ErrorBoundary không bắt mọi crash native.

Nút **Về tâm bản đồ** dùng GPS chủ động nếu có, tiếp đến tọa độ đại sứ quán hoặc
điểm hỗ trợ đã tải. Thiếu dữ liệu thì mở góc nhìn thế giới, không tạo tọa độ giả.
**Vệ tinh** dùng hybrid của SDK, có nhãn đường, không phải video Aerial View.
Expo Go iOS dùng Apple Maps của binary Expo ngay cả khi .env có Google key;
Google iOS chỉ chọn trong binary native đã build với key.

Mẫu HTML/snippet gốc nằm ở `references/google-maps/`. Simple Map/Custom Controls
được áp dụng thành luồng native tương ứng. Checkout/Address Selection/Neighborhood
Discovery/Current Place dùng Places, không phải điều kiện để khởi tạo SDK map;
chưa bật Places theo CLAUDE phạm vi MVP. Aerial View và KML mẫu được lưu tham khảo,
chưa nối thêm dịch vụ/feed. Backend vẫn chỉ trả điểm hỗ trợ verified.

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
