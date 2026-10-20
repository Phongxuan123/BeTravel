# Hướng dẫn vận hành tính năng

Gộp từ LOCATION_SHARING và TRIP_ITINERARY (19/10/2026; bản gốc còn trong lịch sử git).

## 1. Chia sẻ vị trí cho người thân

Cập nhật 29/09/2026. Triển khai: snapshot GPS do người dùng chủ động gửi.

### Cách dùng

1. Vào **SOS > Chia sẻ vị trí với người thân**, hoặc mở mục tương ứng trong **Cài đặt**.
2. Đọc hướng dẫn rồi bấm **Lấy vị trí của tôi**. Cấp quyền vị trí khi dùng ứng dụng nếu hệ điều hành hỏi.
3. Kiểm tra tọa độ, giờ thiết bị và sai số GPS. Sai số trên 100 m được cảnh báo; có thể lấy lại GPS ở nơi thoáng hơn.
4. Bấm **Chọn ứng dụng và người nhận**. Trong bảng chia sẻ của điện thoại, chọn ứng dụng đã cài, chọn người thân và xác nhận gửi ở ứng dụng đó.
5. Người nhận mở liên kết Google Maps để xem điểm đã gửi. Không cần cài BeTravel hoặc đăng nhập BeTravel. Muốn gửi vị trí mới thì lấy GPS và gửi lại.

### Dữ liệu và vận hành

`SOS/Cài đặt -> /sos/share-location -> expo-location -> xem trước -> React Native Share -> ứng dụng do người dùng chọn`.

- GPS foreground một lần, `Accuracy.High`. Không đăng ký watcher, không yêu cầu quyền nền, không đọc danh bạ và không tự gửi cho liên hệ khẩn cấp.
- Tọa độ nằm trong state màn hình, không đưa vào AsyncStorage, query cache, log hay API backend. Khi rời màn hình hoặc app chuyển nền, state vị trí được xóa. Tính năng không cần migration, collection hay endpoint mới.
- Không dùng last-known-location. Vị trí quá 60 giây, thời gian tương lai quá 5 giây, tọa độ ngoài khoảng hợp lệ hoặc không hữu hạn đều bị chặn. Kiểm tra lại tuổi vị trí ngay trước `Share.share`, không chỉ dựa vào trạng thái nút.
- Chờ GPS tối đa 20 giây; thao tác hủy, rời màn hình và chuyển nền làm vô hiệu kết quả đến muộn. Native request một lần có thể hoàn tất sau timeout; ứng dụng bỏ kết quả đó.
- Thời gian trong tin nhắn dùng ISO UTC, preview hiển thị giờ thiết bị. Sai số là ước tính của thiết bị, không phải bảo đảm độ chính xác.
- Tin gồm tọa độ làm tròn 6 chữ số thập phân, thời điểm, sai số và URL `https://www.google.com/maps/search/?api=1&query=latitude%2Clongitude`. Google Maps URLs không cần API key; tách biệt với Maps SDK key của màn hình bản đồ SOS.
- Không có trạng thái “người thân đã nhận”: Android không phân biệt chắc chắn gửi/hủy; native share result không phải biên nhận. iOS dismissed hiển thị hủy. Người dùng cần kiểm tra trong ứng dụng gửi.
- Gửi tin/mở bản đồ phụ thuộc ứng dụng, kết nối và có thể tốn cước SMS/dữ liệu. Liên kết đã gửi có thể bị chuyển tiếp, không có token hết hạn hay khả năng thu hồi. Mốc 60 giây chỉ chặn **tạo lần gửi mới**, không làm link đã gửi hết hạn.
- Khi không có dữ liệu quốc gia, SOS hiện hướng dẫn và nút chia sẻ thay vì màn hình trắng; route chia sẻ cũng hoạt động qua Cài đặt/route trực tiếp. Không phụ thuộc dữ liệu đại sứ quán, tài khoản backend hay liên hệ đã lưu.

### Giới hạn và kiểm chứng

Đây là chia sẻ điểm tại một thời điểm. Chia sẻ trực tiếp theo thời gian thực cần một thiết kế khác: phiên có thời hạn, người nhận được cấp quyền, nút dừng/thu hồi, máy chủ cập nhật, chính sách lưu dữ liệu và quyền nền. Chưa triển khai luồng đó trong MVP hiện hành.

Kiểm thử tự động bao phủ tọa độ sai/cũ, quyền bị từ chối, GPS tắt, hủy lấy GPS, response đến muộn, chia sẻ chủ động, hủy bảng chia sẻ và lỗi ứng dụng chia sẻ. Export JS iOS/Android kiểm tra bundling, không thay thế thử nghiệm điện thoại thật.

Nghiệm thu còn cần thiết bị: iOS/Android (gồm approximate location), iPad share sheet, mở Zalo/SMS, chọn đúng người nhận, mất mạng, tắt GPS, chờ timeout và chuyển nền/quay lại. Không gửi tin thật tự động trong test. Chuỗi xin quyền mới trong `app.json` cần native build mới để cập nhật; Expo Go dùng cấu hình host.

Nguồn kỹ thuật: [Expo Location SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/location/), [React Native Share 0.86](https://reactnative.dev/docs/0.86/share), [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started).

## 2. Lịch trình nhiều nước — vận hành và bàn giao

Cập nhật 06/10/2026. Contract nguồn: `contracts/README.md`, fixture `trip.json`.

1. Chọn quốc gia đầu tiên và thành phố; chọn các nước tiếp theo theo thứ tự.
2. Chọn ngày đi/về. Mỗi chặng sau có nước, thành phố, địa điểm tùy chọn và ngày tới.
   Có thể thêm, xóa hoặc quay lại cùng nước ở chặng khác; tối đa 20 chặng.
3. Chọn cảnh báo. Vị trí mặc định tắt ở wizard mới, giải thích và xin quyền
   foreground trước khi bật. Từ chối quyền vẫn tạo chuyến được. Chỉ ghi consent
   toàn cục sau hành động cấp quyền rõ ràng, không tự bật khi sửa chuyến cũ.
4. Xác nhận toàn bộ các chặng, lưu API, đặt chuyến chính. Nếu đặt chính thất bại,
   chuyến đã tạo vẫn còn và UI báo rõ, tránh tạo lại gây trùng.

Ngày tới chặng mới là ngày chuyển nước. Không cần nhập ngày kết thúc mỗi chặng:
chặng trước kết thúc ngày trước đó, chặng cuối kết thúc ngày về. Không tự sort
hoặc tự sửa ngày. UI và Zod backend chặn ngày không tồn tại, trùng/lùi ngày,
vượt ngày về, thiếu thành phố và thêm quốc gia chưa mở.

Top-level điểm đến/ngày đi khớp chặng đầu. DB cũ không có stops vẫn đọc được;
client cũ sửa chuyến nhiều chặng nhận CONFLICT. Mobile lưu updatedAt gốc của
form; backend compare-and-swap lọc cả userId để chặn phiên cũ/cross-user.
Không migration, không thêm collection hoặc index, không ghi lại dữ liệu Atlas.

Home dùng chặng theo ngày. CountryContext ưu tiên lựa chọn quốc gia thủ công,
nếu chưa chọn thì dùng chặng hiện tại của chuyến chính; SOS/cẩm nang/dịch/cảnh báo
theo context đó. Poll cảnh báo cần consent toàn cục, quyền OS và tùy chọn vị trí
của chuyến chính; chỉ khi app active. Không triển khai background tracking/push.
GeoAlert hiện có là safety; regulationAlerts là bộ lọc cảnh báo legal khi hệ
thống có loại đó, không tự tạo thông báo thay đổi luật. Preferences toàn cục
vẫn được tôn trọng. Việc đổi nước tự động cần app render/refetch, không chạy nền.

Kiểm thử: backend trips/qa.config/gemini.retry, mobile itinerary/ItineraryEditor,
wizard/adapters/mapsConfig/usePollAlerts cùng các kiểm thử hồi quy ba workspace.
Maps và GPS thực tế cần nghiệm thu trên native build; xem MAPS_SETUP.md.


## Đổi mật khẩu và khôi phục OTP — 20/10/2026

- Cài đặt > Đổi mật khẩu: nhập mật khẩu hiện tại, mật khẩu mới và xác nhận.
  Không cần OTP/email. Thành công thu hồi refresh token, hủy yêu cầu reset cũ và đăng xuất.
- Quên mật khẩu (hoặc nút khôi phục trong Cài đặt): email đăng ký > OTP 6 số >
  mật khẩu mới > đăng nhập lại. Không có mật khẩu cũ (Google) dùng đường khôi phục.
- Thông báo tiếp nhận không xác nhận email đã đến: kiểm tra đúng email tài khoản,
  Spam/Thư rác. Không dùng phản hồi để kiểm tra email có đăng ký hay không.
- Chẩn đoán tại backend: `npm run email:check`. Lệnh chỉ verify SMTP, không gửi thư;
  kết quả OK không chứng minh email vào Inbox. Chạy trên đúng máy chạy API của app.
- SMTP 465 dùng SMTP_SECURE=true; 587 dùng false và STARTTLS bắt buộc. Cấu hình
  lấy từ env đã validate; không tắt TLS để né lỗi. SMTP_DISABLED=true ngoài test
  trả lỗi dịch vụ, không giả lập thành công. Khởi động lại backend sau sửa .env.
- Nếu verify OK nhưng không nhận thư: cần người dùng thử OTP với tài khoản của mình,
  kiểm tra thư rác và log nhà cung cấp email. Không gửi key, OTP hoặc mật khẩu qua chat.
- Phạm vi kiểm: SMTP verify thật, HTTP auth/database tạm và transport nội bộ;
  chưa gửi email ra hộp thư thật trong phiên sửa này, chưa thao tác trên điện thoại.

Nguồn vận hành: [Nodemailer SMTP](https://nodemailer.com/smtp),
[OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
