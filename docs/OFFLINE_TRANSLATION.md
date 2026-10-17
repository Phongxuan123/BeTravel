# Dịch offline, micro và phát âm — 12/10/2026

Nhánh local `feature/offline-translation-20261012`, bắt đầu từ `a3bc320`.
Theo yêu cầu người dùng: triển khai và kiểm tra, không push/merge.

## Kế hoạch và quá trình

1. Đọc CLAUDE/AGENTS, tiến độ 08–09/10, kiến trúc, contracts và luồng dịch/voice.
2. Giữ backend online 500 ký tự; thêm engine native ML Kit cho từ/đoạn offline.
3. Quản lý gói rõ ràng: kiểm gói thật trên thiết bị, tải chủ động Wi-Fi hoặc cho
   phép cellular, xóa từng gói. Không tự tải hoặc gửi văn bản lên cloud khi thiếu gói.
4. Offline tối đa 5.000 ký tự; chia đoạn theo biên câu/từ, giữ Unicode, xử lý tuần tự,
   hủy kết quả cũ khi người dùng đổi nội dung/ngôn ngữ/rời màn.
5. Micro offline cưỡng chế on-device; giữ sửa B02 hộp thoại quyền của đợt 08/10.
   Android có yêu cầu tải model nhận dạng của OS. TTS chia utterance để không vượt
   giới hạn Android, chọn giọng đúng ngôn ngữ và lọc giọng cần mạng khi offline.
6. Build native Android, kiểm thử thực tế khi công cụ cho phép, hồi quy ba workspace,
   rà dependency và ghi sổ. iOS cần Xcode hoặc build EAS/thiết bị ngoài môi trường này.

## Kiến trúc

- `mobile/modules/offline-translation`: local Expo module Kotlin/Swift, tự autolink,
  Android ML Kit Translate 17.0.3 và iOS GoogleMLKit/Translate 8.0.0.
- `features/translate/offlineTranslation.ts`: ngôn ngữ, kiểm gói, chia đoạn,
  pipeline tuần tự và chống callback cũ. Không thêm API hoặc collection backend.
- `OfflinePackPanel`, `VoiceTools`: trạng thái gói và các hành động chuẩn bị của người dùng.
- `/translate`: mặc định offline, chuyển online chủ động. Gói dịch hỗ trợ các ngôn
  ngữ app có sẵn: Việt, Anh, Hàn, Nhật, Thái, Trung, Pháp, Đức. Chọn ngôn ngữ không
  phụ thuộc dữ liệu quốc gia tải từ backend. Route offline mở cho khách.
- Câu đã lưu giữ ngôn ngữ và engine để ghi công đúng. Không migration/xóa câu cũ.

ML Kit là SDK Google, không phải bộ từ điển hoặc model mở để tự phân phối lại.
Gói được SDK tải và quản lý trên thiết bị. Một ngôn ngữ khoảng 30 MB; cặp không
phải tiếng Anh đi qua tiếng Anh và có thể mất sắc thái. Bản dịch máy cần kiểm lại,
đặc biệt nội dung y tế/pháp luật; không khẳng định chính xác tuyệt đối.

## Cách sử dụng

1. Cài bản native mới. Vào Dịch; có thể mở qua SOS khi chưa đăng nhập.
2. Chọn Việt–Anh hoặc ngôn ngữ khác. Bật “Dịch không cần mạng”.
3. Khi còn mạng, bấm “Tải gói dịch”; chọn Wi-Fi hoặc cho phép dữ liệu di động.
   Chờ “Đã sẵn sàng”. Cặp Việt–Anh cần gói Việt; Việt–Hàn cần Việt và Hàn.
4. Tắt mạng, nhập từ/câu/đoạn và bấm “Dịch với Google”. Không gọi server dịch.
   Không có gói thì báo thiếu; muốn dùng server phải tự chuyển online.
5. Micro dùng gói **khác**: “Chuẩn bị micro offline”. Android 13+ hỗ trợ yêu cầu
   tải theo dịch vụ OS; yêu cầu đã lên lịch không có nghĩa đã tải xong. iOS tùy
   khả năng on-device của ngôn ngữ/thiết bị. Không hỗ trợ thì nhập tay vẫn dịch.
6. Giọng đọc cũng cần cài riêng qua Cài đặt của máy. Tải đúng tiếng, nghe thử bản
   dịch, kiểm âm lượng. iPhone cần tắt silent mode theo tài liệu expo-speech.
7. “Xóa gói” chỉ xóa model dịch dùng chung trên máy, không xóa câu người dùng lưu.

Không có Wi-Fi nhưng có 4G/5G: có thể chọn cho phép cellular để tải gói. Không có
bất kỳ kết nối nào và chưa tải gói: chỉ câu mẫu/câu đã lưu có sẵn dùng được.

## Build

Theo CNG: không commit/sửa tay `mobile/android` hoặc `mobile/ios` sinh tự động.
Nguồn native local trong `mobile/modules` phải được Git theo dõi (ngoại lệ ignore).

```sh
cd mobile
npm ci
# Đặt ANDROID_PACKAGE / IOS_BUNDLE_IDENTIFIER được nhóm chốt trong .env hoặc EAS.
npm run android
# Trên Mac có Xcode đầy đủ:
npm run ios
```

Các script android/ios chạy `expo run:*` để rebuild native, không chỉ mở Expo Go.
Thay đổi Kotlin/Swift/dependency pod/gradle cần build lại; OTA JS không đủ.
Không cần key Google Maps, Gemini hay Cloud Translation cho engine ML Kit này.
Không đặt key hoặc audio/transcript vào log. Native model và gói voice vẫn cần
chuẩn bị trên **từng** thiết bị. Không tự tải tất cả ngôn ngữ khi mở app.

## Quyền riêng tư và ghi công

Offline dịch văn bản trên máy. Micro offline đặt `requiresOnDeviceRecognition=true`,
không tự hạ sang online khi không hỗ trợ; `persist=false`, không lưu file audio.
Ở chế độ online, dịch vụ nhận giọng của OS có thể xử lý qua mạng như giải thích quyền.
SDK tải model có kết nối Google; không gọi đó là ứng dụng tuyệt đối không phát sinh
bất kỳ lưu lượng mạng nào (app còn auth/countries/quick phrases).

Be.Travel sử dụng Google Translate thông qua ML Kit cho bản dịch offline;
[thông tin Google Translate](https://cloud.google.com/translate).
Badge chính thức được đóng gói kèm app và hiển thị cạnh kết quả. Bản dịch tự động
được cung cấp không có bảo đảm từ Google về độ chính xác, độ tin cậy, tính phù hợp
cho mục đích cụ thể, khả năng thương mại hay việc không xâm phạm quyền.

## Nguồn kỹ thuật

Đối chiếu 12/10/2026:

- [ML Kit Android](https://developers.google.com/ml-kit/language/translation/android)
- [ML Kit iOS](https://developers.google.com/ml-kit/language/translation/ios)
- [Khả năng và giới hạn ML Kit](https://developers.google.com/ml-kit/language/translation)
- [Ghi công ML Kit](https://developers.google.com/ml-kit/language/translation/translation-terms)
- [Expo Modules](https://docs.expo.dev/modules/get-started/)
- [Expo Speech SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/speech/)
- [Native speech recognition](https://github.com/jamsch/expo-speech-recognition)

## Kết quả kiểm tra

Code và kiểm tự động đã xong; nghiệm thu thiết bị còn mở theo PROGRESS. Không coi pass unit tests/bundle
là bằng chứng đã nhận tiếng nói thật hoặc nghe được loa trên điện thoại.

## Nhật ký tiếp tục — 13/10/2026

- Chạy lại mobile sau cập nhật Expo: 51 suites, 219 tests đạt; lint/typecheck đạt.
- Android debug đã compile và cài vào emulator QA riêng. Release QA đang được
  kiểm tra để không phụ thuộc Metro; phát hiện Node dưới Rosetta yêu cầu binary
  Lightning CSS x64 dù npm đã cài arm64. Dùng Gradle init script tạm ép bundler
  chạy Node arm64, không sửa file Android sinh tự động hoặc thêm dependency x64
  vào sản phẩm. Khôi phục node_modules bằng npm ci từ lockfile.
- Bổ sung trả quyền audio session iOS khi TTS bị dừng bởi hệ thống.
- Expo Doctor hiện 20/21: có bản vá mới cho expo, expo-location, expo-router,
  expo-splash-screen và jest-expo. Đây là kiểm tra phiên bản, chưa phải lỗi runtime.
- Chưa nghiệm thu nghe/nói trên điện thoại thật; iOS chưa compile vì máy chỉ có
  CommandLineTools. Không đánh dấu hoàn thành các tiêu chí này bằng unit test.

## Kịch bản nghiệm thu trên thiết bị

1. Cài development/release build có module native, mở SOS > Dịch không cần mạng
   khi chưa đăng nhập. Thử dịch trước khi có gói: phải hướng dẫn tải, không gọi cloud.
2. Tải gói Việt–Anh khi có mạng. Tắt cả Wi-Fi và dữ liệu di động. Dịch một từ,
   đoạn nhiều câu trên 500 ký tự, đổi chiều Anh–Việt, mở lại ứng dụng và dịch tiếp.
3. Đổi ngôn ngữ hoặc hủy khi đang dịch: kết quả cũ không được ghi đè phiên mới.
   Xóa gói và kiểm tra dịch bị chặn, câu lưu vẫn còn.
4. Chuẩn bị gói nhận giọng và giọng đọc riêng. Cấp/từ chối quyền micro, thu câu
   tiếng Việt, đổi sang tiếng Anh rồi thu lại; thiếu on-device phải báo rõ.
5. Phát âm kết quả dài, dừng giữa chừng, đổi ngôn ngữ, chuyển nền, dùng micro
   rồi đọc lại. Xác nhận âm thanh qua loa đúng ngôn ngữ bằng tai người kiểm thử.
6. Kiểm lại chế độ online tối đa 500 ký tự và đăng nhập; dữ liệu câu lưu cũ còn đọc được.

Không đánh dấu bước đã đạt nếu chỉ quan sát nút chuyển trạng thái hoặc mock API.

### Phụ thuộc và môi trường

Lần npm audit chốt theo lockfile: mobile 61 cảnh báo (56 high, 5 moderate),
backend 3 high, admin 0. Các nguồn cảnh báo trực tiếp trong chuỗi phụ thuộc là
braces, node-forge, sprintf-js; đề xuất tự động có đổi major/downgrade không tương
thích. Chưa đóng các cảnh báo này; cần theo dõi bản vá upstream và chạy lại audit
khi nâng dependency. Không đồng nghĩa 61 lỗi chức năng đã được tái hiện trong app.
Các con số có thể đổi khi cơ sở dữ liệu advisory cập nhật.

Android module chỉ theo dõi build.gradle, manifest và mã Kotlin; thư mục build,
.gradle, .cxx đã ignore. APK QA dùng com.betravel.offlinetest và backend không
truy cập được, không phải bản phát hành lên store hoặc dùng để kiểm online.

### Kết quả Android thực tế — 13/10/2026

Release APK build thành công (678 tasks), cài vào emulator riêng và mở ứng dụng.
Luồng onboarding > SOS > Dịch không cần mạng hoạt động khi chưa đăng nhập và
backend không truy cập được. Native installedLanguages chạy được, màn hình báo
thiếu model và hộp thoại Wi-Fi/cellular xuất hiện đúng. Tải model chưa hoàn tất:
log emulator có UnknownHostException với Google/gstatic và Firebase installations.
Đây là blocker môi trường; chưa xác nhận bản dịch thật khi tắt mạng, không ghi đạt.
Đã thử khởi động lại riêng emulator QA với DNS 8.8.8.8/1.1.1.1.

### Kết quả sau sửa DNS emulator

DNS 8.8.8.8/1.1.1.1 khắc phục lỗi phân giải tên miền. Tải gói Việt–Anh thành công;
UI hiện “Đã sẵn sàng dịch hai chiều không cần mạng”. Tắt cả Wi-Fi và mobile data
bằng adb svc trên emulator QA, nhập/dịch “Tôi cần giúp đỡ” nhận “I need help”.
Đây là bản dịch ML Kit thật trong APK release, không phải mock hay câu mẫu.
Nút phát âm gọi được engine và chuyển “Dừng phát âm”; chưa xác nhận nghe loa.
Micro hiển thị đúng giải thích offline và quyền RECORD_AUDIO của Android;
chưa thu được lời nói thật để nghiệm thu chuyển giọng thành văn bản.
Câu dài/chiều ngược hiện có kiểm tự động, cần thêm nghiệm thu thiết bị.

### Chốt nghiệm thu Android ở lượt tiếp tục

- Đoạn 642 ký tự tiếng Anh (6 lần cặp câu về tìm bệnh viện/gọi bác sĩ) đã dịch
  đầy đủ sang tiếng Việt khi Wi-Fi/data vẫn tắt. Kết quả mở đầu “Tôi cần giúp đỡ
  để tìm bệnh viện gần nhất. Hãy gọi bác sĩ và giải thích rằng tôi không nói
  tiếng Việt.” Xác nhận cả chiều ngược và đường chia nhiều đoạn ML Kit.
- Micro sau cấp quyền đi vào phiên và tự kết thúc sau 30 giây, UI hiện thông báo
  hết lượt nghe. Chưa có transcript từ lời nói thật nên chưa nghiệm thu STT.
- Còn cần điện thoại thật để xác nhận STT/TTS và Xcode đầy đủ cho native iOS.
- Không push/merge; commit local lưu code và tài liệu để tiếp tục bàn giao.
