# Bản đồ và micro trên điện thoại — 17/10/2026

## Thiết bị và nguyên nhân đã xác định

Người dùng: Samsung A22 4G, Expo Go từ cửa hàng, quét QR của Metro/VS Code.
GPS và TTS tiếng Anh hoạt động. Máy tính hiện chỉ thấy emulator-5554 qua adb,
chưa có Samsung kết nối; không coi kiểm thử tự động là nghiệm thu máy thật.

Micro STT dùng expo-speech-recognition, cần module native trong binary Be.Travel.
Expo Go không có module này. Cấp thêm quyền hay xóa cache Metro không thêm được
module vào Expo Go. Không gọi đây là lỗi microphone phần cứng. TTS expo-speech
và GPS có sẵn nên có thể hoạt động dù STT không có.

Chưa xác định được nguyên nhân duy nhất của bản đồ trên Samsung vì chưa có log
thiết bị. Đã phát hiện các điểm yếu trong code: tải Leaflet từ CDN lúc mở map;
khung Leaflet báo ready trước khi ô bản đồ tải; WebView chưa truyền lỗi lên UI;
static HTML chưa đặt originWhitelist theo hướng dẫn WebView. Không khẳng định
mạng điện thoại chặn CDN nếu chưa có bằng chứng trên máy.

## Các thay đổi

- Đóng gói Leaflet 1.9.4 (JS/CSS, BSD-2-Clause), kiểm SHA-256 theo SRI cũ,
  giữ LICENSE/nguồn trong thư mục vendor. Bản đồ chỉ cần tải ô, không tải CDN JS/CSS.
- Expo Go Android/iOS và Android native chưa có key tự dùng OSM; cấu hình ép
  native vẫn được tôn trọng. Không thay đổi tọa độ GPS hoặc hợp đồng API.
- WebView nhận static HTML, chặn điều hướng ngoài; chỉ link HTTPS do người dùng
  nhấn mới mở trình duyệt. Ready yêu cầu tileload, lỗi tải/tiến trình hiển thị
  thông báo và giữ danh sách/chỉ đường/thử lại.
- Nút micro khi thiếu native mở ô nhập và giải thích dùng đọc chính tả của bàn
  phím. Đây là nhập văn bản qua bàn phím OS, không phải STT tích hợp của app;
  chế độ mạng và quyền riêng tư của đọc chính tả do bàn phím quản lý.
- Hộp thoại giải thích có thể đưa app sang inactive: giữ phiên qua hộp thoại;
  không bật micro nếu cấp quyền xong mà app vẫn ở background.
- Sửa hướng dẫn cài giọng: Android thiếu module không còn hiện hướng dẫn iPhone.

## Cách thử trên Samsung A22 bằng Expo Go

1. Chạy `cd mobile` rồi `npx expo start --clear`; quét QR mới. Máy tính/điện thoại
   cần kết nối Metro được. Không dùng bản bundle cũ đang lưu trên Expo Go.
2. Mở SOS > bản đồ; thử cả Wi-Fi và dữ liệu di động nếu truy cập Metro cho phép.
   Cần Internet để tải ô OpenStreetMap. GPS hoạt động không chứng minh ô bản đồ
   có Internet. Nếu lỗi, chụp đúng thông báo; nút thử lại không xóa dữ liệu.
3. Mở dịch, bấm micro để vào ô nhập, dùng biểu tượng micro trên Samsung Keyboard
   hoặc Gboard. Bật đọc chính tả và đúng ngôn ngữ trong cài đặt bàn phím nếu thiếu.
4. Dịch offline ML Kit cũng cần bản Be.Travel native; Expo Go chỉ dùng được câu
   mẫu/câu lưu và dịch online theo quyền tài khoản/cấu hình backend.

## Để dùng nút micro và ML Kit trong app

- Kết nối Samsung qua USB, bật USB debugging và chấp thuận máy tính; `adb devices`
  phải thấy thiết bị trạng thái device. Không cần cung cấp mật khẩu hay key trong chat.
- Chốt ANDROID_PACKAGE trong mobile/.env theo định danh của nhóm; đảm bảo
  EXPO_PUBLIC_API_URL truy cập được từ điện thoại (localhost là điện thoại, không
  phải máy tính). Không commit .env. Native nhận giọng không cần key Google Maps.
- Từ mobile chạy `npm run android -- --device`; chọn Samsung, mở Be.Travel được
  cài riêng, không mở bằng Expo Go. Đây là build phát triển, chưa phát hành store.
- Cấp quyền micro, chuẩn bị gói nhận giọng nếu dùng offline. Dịch vụ/ngôn ngữ
  offline tùy Android/engine; không tự chuyển âm thanh qua mạng để che thiếu gói.
- Thử nói Việt/Anh, xem transcript, dừng, từ chối/cấp lại quyền, chuyển nền; nghe
  TTS sau micro. Thử offline sau khi tải riêng model dịch, model STT, giọng TTS.

## Xác minh và phần còn mở

Kết quả cuối trong PROGRESS/ACCEPTANCE. Backend/admin kiểm bằng dữ liệu tạm/mock;
không sửa Atlas hoặc hệ điều hành. Chưa nghiệm thu Samsung thật hoặc iOS. Các
cảnh báo phụ thuộc đã ghi ở OFFLINE_TRANSLATION vẫn cần theo dõi; không tuyên bố
mọi lỗi trên máy đã được sửa. Không push Git.

Nguồn: [Expo SDK 57 WebView](https://docs.expo.dev/versions/v57.0.0/sdk/webview/),
[WebView static HTML và originWhitelist](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md#source),
[expo-speech-recognition và development build](https://github.com/jamsch/expo-speech-recognition).
