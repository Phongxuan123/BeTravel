# Lịch trình nhiều nước — vận hành và bàn giao

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
