# Leaflet 1.9.4

Nguồn: https://unpkg.com/leaflet@1.9.4/dist/leaflet.js và leaflet.css.
Giấy phép BSD-2-Clause trong LICENSE; giữ bản quyền trong JS/CSS.

SHA-256 base64 tệp gốc:
- JS: 20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=
- CSS: p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=

leafletAssets.ts chứa chuỗi nguyên bản (JS bỏ comment sourceMappingURL cuối tệp).
Không thực thi Leaflet trong React Native: chỉ nhúng vào trang WebView.
Mạng vẫn cần cho các ô OpenStreetMap; bỏ phụ thuộc tải thư viện từ CDN khi mở map.
