# KIEM THU THUC TE TREN ANDROID EMULATOR

Kiểm thử theo hành trình người dùng (CLAUDE.md mục 5.1b): app native thật chạy trên
emulator, gọi backend thật (`npm run dev`) nối Atlas. Claude đọc màn hình bằng ảnh chụp
và cây UI, thao tác bằng `adb` qua `mobile/scripts/emu.sh`.

## 1. Môi trường đã cài trên máy dev (một lần)

| Thành phần | Giá trị |
|---|---|
| Android SDK | `%LOCALAPPDATA%\Android\Sdk` (biến `ANDROID_HOME`, `ANDROID_SDK_ROOT`) |
| Gói SDK | platform-tools, emulator, platforms/android-36, build-tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1 |
| JDK cho Gradle | `JAVA_HOME = C:\Program Files\Java\jdk-17` (lệnh `java` mặc định vẫn là JDK 23) |
| Thiết bị ảo | `BeTravel_Pixel7` · Android 16 (API 36) · Google Play · RAM 4 GB · có micro |
| Tăng tốc | WHPX (Windows Hypervisor Platform) |
| Tên gói app dev | `com.betravel.dev`, truyền qua `ANDROID_PACKAGE` lúc build, không commit |

`android/` do `expo prebuild` sinh ra và đã nằm trong `.gitignore`.

## 2. Chạy lại mỗi phiên

```bash
# 1. Backend thật
cd backend && npm run dev                      # cổng 3000, kiểm tra: curl localhost:3000/api/health

# 2. Emulator
emulator -avd BeTravel_Pixel7 -no-snapshot-save -no-boot-anim
adb wait-for-device
adb reverse tcp:8081 tcp:8081

# 3. Metro, trỏ API về máy host (10.0.2.2 = máy dev nhìn từ emulator)
cd mobile && EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api npx expo start --dev-client --port 8081

# 4. Mở app vào Metro
adb shell am start -a android.intent.action.VIEW \
  -d "betravel://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081" com.betravel.dev
```

Chỉ build lại native (`npx expo run:android --no-bundler`, đặt `ANDROID_PACKAGE=com.betravel.dev`)
khi thêm/bớt module native hoặc đổi `app.json`/`app.config.js`. Đổi code JS chỉ cần Metro.
Lần build đầu khoảng 12 phút, các lần sau nhanh hơn nhờ cache Gradle.

## 3. Thao tác như người dùng

```bash
mobile/scripts/emu.sh shot 01-home     # chụp màn hình
mobile/scripts/emu.sh ui               # liệt kê chữ trên màn hình kèm tọa độ
mobile/scripts/emu.sh tapt "Đăng nhập" # bấm theo chữ
mobile/scripts/emu.sh fill 540 925 "a@b.c"  # xóa ô rồi gõ
mobile/scripts/emu.sh log              # lỗi/cảnh báo JS của app
```

## 4. Cạm bẫy đã gặp

| Cạm bẫy | Cách tránh |
|---|---|
| Mở app trước khi Metro chạy --> màn hình đen | `adb shell am force-stop com.betravel.dev` rồi mở lại bằng lệnh bước 4 |
| Gboard hiện màn "Try out your stylus" và nuốt chữ | `adb shell settings put secure stylus_handwriting_enabled 0` |
| Bàn phím ảo che nút, lệnh bấm trúng phím | Ẩn bàn phím trước khi bấm (`emu.sh hidekb`, `fill` tự làm) |
| Bố cục xê dịch sau khi gõ (thanh độ mạnh mật khẩu) | Gọi `emu.sh ui` lấy lại tọa độ sau mỗi bước |
| `adb shell input text` không gõ được chữ có dấu | Dữ liệu thử dùng chữ không dấu |
| Git Bash đổi `/sdcard/...` thành đường dẫn Windows | Script đã đặt `MSYS_NO_PATHCONV=1` |
| `adb emu geo fix` trả OK nhưng Android không nhận tọa độ | Dùng test provider: `adb shell appops set com.android.shell android:mock_location allow`, `cmd location providers add-test-provider gps`, rồi `set-test-provider-location gps --location 37.5665,126.9780` lặp mỗi 1-2 giây trong lúc app xin vị trí |
| `emu.sh tapt` khớp nhầm tiêu đề/mô tả chứa cùng chữ | Lấy tọa độ nút từ `emu.sh ui` rồi `emu.sh tap X Y` |
| Metro `-c` dựng lại cache lâu, app tải bundle bị đứt --> màn đen | Đợi dòng `Android Bundled` rồi mở lại app (bước 4) |
| **Gửi tiếng Việt bằng `curl` trong Git Bash làm hỏng dữ liệu** (dấu thành `?`; đã xảy ra 08/10 với tên Đại sứ quán, khôi phục ngay) | Mọi lệnh GHI dữ liệu có tiếng Việt lên API dùng script Node (`fetch` + `JSON.stringify`), không dùng `curl -d` |
| Metro chạy `CI=1` không tự nạp lại file đã sửa | Dừng hẳn tiến trình Metro (kể cả node con) rồi chạy lại |
| Dừng tác vụ `npm run dev` không tắt `nodemon` con, cổng 3000 vẫn mở | Tắt theo tiến trình `node` có `src/server.js` |
| Muốn thử "mở app lần đầu" (không có cache) | `adb shell pm clear com.betravel.dev` (xoá cả phiên đăng nhập và quyền) |

## 3b. Kiểm thử Admin Portal trong emulator

```bash
cd admin && npm run dev -- --port 5173 --strictPort --host 127.0.0.1   # Vite mặc định chỉ nghe ::1
adb reverse tcp:5173 tcp:5173 && adb reverse tcp:3000 tcp:3000          # giữ origin localhost cho CORS
adb shell am start -a android.intent.action.VIEW -d "http://localhost:5173/" com.android.chrome
```

## 5. Tài khoản thử

Lưu ngoài repo tại `%USERPROFILE%\.betravel\` (không dùng thư mục Temp: bị dọn định kỳ).
Mỗi file 2 dòng `email=...` và `password=...`. Không commit, không in mật khẩu vào log/báo cáo.

| File | Vai trò | Nguồn |
|---|---|---|
| `admin-login.txt` | admin | người dùng cung cấp |
| `user-login.txt` | user | người dùng cung cấp |
| `qa-account.txt` | user | tạo bằng luồng đăng ký thật trên emulator |

## 6. Giới hạn

- Google Maps cần `GOOGLE_MAPS_ANDROID_API_KEY` lúc build native; chưa có key thì bản đồ SOS
  không tải được tile.
- Nhận giọng nói trên emulator phụ thuộc micro của máy host và Google app trong image.
- Emulator không thay được kiểm tra cuối trên điện thoại thật (hiệu năng, GPS thật, mạng di động).
