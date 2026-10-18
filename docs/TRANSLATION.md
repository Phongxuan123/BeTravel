# Dịch, giọng nói và dịch offline

Gộp từ TRANSLATION_SOURCES, VOICE_TRANSLATION, OFFLINE_TRANSLATION và PHONE_MAP_VOICE (19/10/2026; bản gốc còn trong lịch sử git). Tiến độ và nghiệm thu từng đợt xem `PROGRESS.md`.

## 1. Dịch online và nguồn câu mẫu

Cập nhật 29/09/2026. Không bổ sung dependency hay workspace chung.

### Hai chế độ

- **Việt - Anh** độc lập quốc gia đang chọn, đổi chiều bằng nút giữa hai ngôn ngữ. Câu mẫu đảo đúng nội dung nguồn/đích. Khi đổi chiều, kết quả cũ được chuyển thành câu đầu vào rồi cần dịch lại.
- **Ngôn ngữ sở tại** tiếp tục dùng ngôn ngữ quốc gia và QuickPhrase quản trị sẵn có.
- Mười cặp câu Việt/Anh được đóng gói cùng app, dùng ngoại tuyến cả hai chiều. Tra cứu chỉ chuẩn hóa Unicode NFC, khoảng trắng và chữ hoa/thường; giữ dấu và dấu câu, không ghép từ rời để giả lập dịch câu.
- Câu tự nhập khác mẫu gọi `POST /api/translate`, cần mạng, tài khoản và provider LLM đã cấu hình. Giới hạn 500 ký tự; chia sẻ quota AI/ngày với chat. Provider lỗi vẫn tính lượt vì có thể đã phát sinh chi phí. Cùng ngôn ngữ trả nguyên văn không gọi AI.
- API chuẩn hóa vi/en/ko/ja/th/zh/fr/de, biến thể vùng hai chữ như en-US và tên hiển thị Việt/Anh tương ứng; ngôn ngữ khác trả VALIDATION_ERROR. Response giữ `{ translated, phonetic }` như contracts.
- Sửa câu, đổi chiều, đổi quốc gia/tài khoản hoặc chọn câu mẫu vô hiệu phản hồi cũ. Không lưu câu tự nhập vào cache. Phát âm dùng giọng thiết bị, khả năng ngoại tuyến phụ thuộc giọng đã cài.

### Tatoeba: câu mẫu có nguồn mở

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

### Ngữ pháp: Universal Dependencies

Tham khảo [hướng dẫn Vietnamese của Universal Dependencies](https://universaldependencies.org/vi/index.html): phân đoạn từ đa âm tiết, phủ định và trợ từ chỉ khả năng/nghĩa vụ. Các chỉ dẫn prompt trong JSON do dự án diễn đạt lại; yêu cầu giữ tên riêng, số, thời gian và ý phủ định, tránh dịch từng âm tiết riêng lẻ. Không sao chép hoặc huấn luyện từ treebank. [UD Vietnamese VTB](https://github.com/UniversalDependencies/UD_Vietnamese-VTB) là tài liệu tham khảo học thuật, không phải bộ câu dịch song ngữ hoàn chỉnh.

### File và kiểm thử

- `backend/src/translation/vi-en.json` và `mobile/src/features/translate/vi-en.json` cố ý là hai bản tài nguyên trong hai workspace độc lập; test backend so sánh bằng nhau để tránh lệch dữ liệu.
- `backend/src/services/translate.service.js` dùng ngữ pháp/từ vựng trong prompt, tách câu cần dịch vào JSON và kiểm tra cấu trúc output. Không hứa prompt loại bỏ tuyệt đối việc AI dịch sai/chèn chỉ dẫn.
- `mobile/src/features/translate/phrasebook.ts` và API client tra cứu exact phrase trước khi gọi mạng.
- Test kiểm tra 10 cặp hai chiều, offline không gọi API, giữ dấu, không nhầm câu phủ định, quota, input/response không hợp lệ, đảo chiều UI và race response.
- Bộ kiểm thử dùng provider giả lập. Chất lượng câu tự nhập với provider thật, giọng phát âm và trải nghiệm trên thiết bị cần nghiệm thu riêng; không dùng kết quả test mock để khẳng định độ chính xác ngôn ngữ.

## 2. Nhập giọng nói và đọc bản dịch

Voice là ngoại lệ MVP đã được người dùng yêu cầu (07/10/2026). Các mô tả 500 ký tự áp dụng cho chế độ online; chế độ offline xem mục 3.

### Luồng sử dụng

1. Chọn Việt–Anh/ngôn ngữ sở tại và chiều dịch. Micro nhận **ngôn ngữ nguồn**.
2. Bấm micro, đọc giải thích lần đầu trong màn hình. Android xin RECORD_AUDIO;
   iOS xin micro và Speech Recognition. Không xin quyền khi mở màn.
3. Nói, xem văn bản cập nhật. Bấm dừng để nhận kết quả cuối hoặc đợi dịch vụ kết thúc.
   Mỗi lượt tối đa 30 giây, 500 ký tự; văn bản dài có thông báo giới hạn.
4. Kiểm tra/sửa văn bản rồi bấm Dịch. Không tự gửi bản nhận dạng lên API khi đang nghe.
5. Bấm Phát âm/Dừng phát âm. Chọn giọng đúng locale đích hoặc cùng ngôn ngữ;
   thiếu giọng đích thì báo cài giọng, không thay bằng tiếng Anh.
6. Có thể bật Tự phát âm sau khi dịch, mặc định tắt; áp dụng API và câu mẫu.
   Tắt trong lúc chờ thì không phát kết quả đến sau. iPhone cần bật âm lượng và tắt silent mode.

Đổi chiều/ngôn ngữ, sửa/xóa câu, rời màn, đổi tài khoản hoặc sang nền sẽ hủy
nhận dạng/phát âm và bỏ callback cũ. Không ghi âm/đọc nền. Không ghi đè văn bản
hoặc tự phát từ phiên trước sau khi người dùng đã hủy.

### Kiến trúc và dữ liệu

| File | Vai trò |
|---|---|
| mobile/app.json | Plugin speech-recognition, mô tả quyền tiếng Việt |
| features/translate/voiceRecognition.ts | Optional native module: Expo Go/binary cũ không crash màn |
| features/translate/useVoiceInput.ts | Quyền theo hành động, listener/session, stop/abort, timeout, lifecycle |
| features/translate/speechLocale.ts | Locale 8 ngôn ngữ backend hỗ trợ, chọn giọng đích |
| features/translate/useTranslationSpeech.ts | Kiểm giọng cài trên máy, play/stop, bỏ tác vụ đọc cũ |
| app/translate/index.tsx | UI micro, văn bản, dịch, tự phát, lỗi và câu lưu theo ngôn ngữ |

Dùng expo-speech-recognition 57.1.0 (MIT) và expo-speech 57.0.3. Dịch vẫn qua
API text hiện có; envelope/quota/auth không đổi. Không thêm backend audio endpoint,
collection, migration, API key, kho lưu âm thanh hoặc cloud STT riêng.

recordingOptions.persist=false: Be.Travel không lưu file âm thanh. Dịch vụ nhận
giọng nói Android/Apple có thể xử lý qua mạng tùy OS/ngôn ngữ/cài đặt; không cam
kết offline hoặc toàn bộ xử lý local. Không log transcript/audio. Văn bản chỉ
gửi Be.Travel khi bấm dịch; lưu câu dùng storage riêng tài khoản.

Câu lưu mới có targetLanguage để không đọc câu tiếng Hàn bằng giọng Anh. Câu cũ
thiếu metadata vẫn giữ; bấm sẽ nhập văn bản Việt để dịch lại, không đoán hoặc xóa.

### Build và nghiệm thu thực tế

Module nhận giọng nói **không có trong Expo Go/binary cũ**. Phải build lại
Android/iOS qua Expo native/EAS. Nếu chưa rebuild, nhập tay/TTS vẫn dùng được,
micro báo cần bản cài đặt mới. Export/introspection không thay thế binary ký.

Chuẩn bị package/bundle ID, signing/profile phù hợp. Máy đủ Android SDK/Xcode:

```bash
cd mobile
npx expo run:android
npx expo run:ios
```

EAS dùng profile nhóm đã chốt và URL backend thật, không dùng placeholder trong
eas.json. Không tự đổi định danh/signing hoặc triển khai store.

Nghiệm thu **cả Android/iOS**: cấp/từ chối/thu hồi quyền, nói Việt/Anh/sở tại,
không nói/giọng nhỏ, mất mạng, thiếu recognizer/gói ngôn ngữ, dừng/hủy/đổi chiều/
sang nền, micro bị app khác dùng, giọng đọc thiếu/silent mode/âm lượng, nhiều lượt,
câu lưu lịch sử và văn bản trên 500 ký tự. Cần recognizer hoạt động (Android
thường dùng dịch vụ Google) và giọng TTS đích đã cài. Không tự tải gói hoặc đổi OS.

Đã đối chiếu [Expo Speech SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/speech/),
[expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition),
[Expo Router SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/router/).

## 3. Dịch offline bằng Google ML Kit

### Kế hoạch và quá trình

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

### Kiến trúc

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

### Cách sử dụng

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

### Build

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

### Quyền riêng tư và ghi công

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

### Nguồn kỹ thuật

Đối chiếu 12/10/2026:

- [ML Kit Android](https://developers.google.com/ml-kit/language/translation/android)
- [ML Kit iOS](https://developers.google.com/ml-kit/language/translation/ios)
- [Khả năng và giới hạn ML Kit](https://developers.google.com/ml-kit/language/translation)
- [Ghi công ML Kit](https://developers.google.com/ml-kit/language/translation/translation-terms)
- [Expo Modules](https://docs.expo.dev/modules/get-started/)
- [Expo Speech SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/speech/)
- [Native speech recognition](https://github.com/jamsch/expo-speech-recognition)

### Kết quả kiểm tra tự động

Code và kiểm tự động đã xong; nghiệm thu thiết bị còn mở theo PROGRESS. Không coi pass unit tests/bundle
là bằng chứng đã nhận tiếng nói thật hoặc nghe được loa trên điện thoại.

### Kịch bản nghiệm thu trên thiết bị

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

### Kết quả nghiệm thu Android (emulator, 13-17/10/2026)

- Release APK build thành công, luồng onboarding > SOS > Dịch không cần mạng chạy khi chưa đăng nhập và backend không truy cập được.
- Tải gói Việt-Anh được (emulator cần DNS 8.8.8.8/1.1.1.1). Tắt Wi-Fi và dữ liệu, dịch "Tôi cần giúp đỡ" ra "I need help"; đoạn 642 ký tự dịch đủ cả hai chiều; 17/10 kiểm lại ở chế độ máy bay.
- Micro vào phiên sau khi cấp quyền và tự kết thúc sau 30 giây; chưa có transcript từ lời nói thật nên **chưa nghiệm thu STT/TTS**. Chưa build iOS (máy chỉ có CommandLineTools).
- Lưu ý môi trường: Node dưới Rosetta cần binary Lightning CSS x64; dùng Gradle init script tạm ép bundler chạy Node arm64, không sửa file Android sinh tự động.
- Dependency: `npm audit` ngày 13/10 báo mobile 61 cảnh báo, backend 3 high, admin 0 (nguồn braces, node-forge, sprintf-js); chưa đóng vì bản sửa tự động đổi major. Không đồng nghĩa lỗi chức năng.

## 4. Micro trên Expo Go và máy Samsung

Micro nhận giọng (expo-speech-recognition) cần module native trong binary Be.Travel; **Expo Go không có module này**, cấp quyền hay xóa cache Metro cũng không thêm được. Đây không phải lỗi phần cứng micro; TTS và GPS có sẵn trong Expo Go nên vẫn chạy.

- Khi thiếu module native, nút micro mở ô nhập và hướng dẫn dùng đọc chính tả của bàn phím (Samsung Keyboard hoặc Gboard). Đó là nhập văn bản qua bàn phím OS, không phải STT tích hợp của app.
- Hộp thoại giải thích quyền có thể đưa app sang inactive: phiên được giữ qua hộp thoại, nhưng không bật micro nếu cấp quyền xong mà app vẫn ở nền.
- Dịch offline ML Kit cũng cần bản Be.Travel native; Expo Go chỉ dùng câu mẫu, câu lưu và dịch online theo quyền tài khoản.

Để dùng micro và ML Kit trong app: nối điện thoại qua USB (bật USB debugging, `adb devices` thấy trạng thái device), đặt `ANDROID_PACKAGE` trong `mobile/.env` theo định danh nhóm chốt và `EXPO_PUBLIC_API_URL` truy cập được từ điện thoại (localhost là chính điện thoại), rồi chạy `npm run android -- --device` trong `mobile/` và mở app Be.Travel đã cài riêng, không mở bằng Expo Go. Không commit `.env`. Thử nói Việt/Anh, dừng, từ chối rồi cấp lại quyền, chuyển nền và nghe TTS; thử offline sau khi tải riêng model dịch, model STT và giọng TTS.
