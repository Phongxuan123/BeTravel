# Nhập giọng nói và đọc bản dịch — 07/10/2026

Nhánh `feature/voice-translation-20261007`. Voice là ngoại lệ MVP đã được người dùng yêu cầu.

## Luồng sử dụng

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

## Kiến trúc và dữ liệu

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

## Build và nghiệm thu thực tế

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
