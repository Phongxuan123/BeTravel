# BẢNG ENDPOINT BE.TRAVEL

Tham chiếu nhanh toàn bộ API. Hình dạng request/response đầy đủ + fixture
mẫu nằm ở **`contracts/README.md`** (nguồn sự thật duy nhất, đối chiếu bằng
test ở cả backend và mobile) — bảng này chỉ tóm tắt để tra cứu nhanh.

Envelope thống nhất mọi endpoint:
```jsonc
{ "ok": true,  "data": <T>, "meta"?: { "page", "limit", "total" } }
{ "ok": false, "error": { "code", "message", "details"? } }
```
`ErrorCode`: `VALIDATION_ERROR` · `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` ·
`CONFLICT` · `RATE_LIMITED` · `QUOTA_EXCEEDED` · `UPSTREAM_ERROR` ·
`INSUFFICIENT_EVIDENCE` · `INTERNAL_ERROR`.

Cột **Auth**: `-` công khai · `user` cần Bearer token · `admin` cần role admin.

## Auth (`/api/auth`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | - | Đăng ký email/số điện thoại + mật khẩu |
| POST | `/auth/login` | - | Đăng nhập, trả access+refresh token |
| POST | `/auth/google` | - | Đăng nhập bằng Google credential |
| POST | `/auth/google/link` | user | Liên kết Google vào tài khoản đang đăng nhập |
| POST | `/auth/refresh` | - | Xoay vòng refresh token (rotation + cửa sổ ân hạn) |
| POST | `/auth/logout` | - | Thu hồi refresh token hiện tại |
| GET | `/auth/me` | user | Hồ sơ đầy đủ, kèm `preferences` |
| PATCH | `/auth/me` | user | Sửa `fullName`/`phone` |
| POST | `/auth/change-password` | user | Đổi mật khẩu (yêu cầu mật khẩu hiện tại) |
| POST | `/auth/forgot-password`, `/verify-reset-otp`, `/resend-reset-otp`, `/reset-password` | - | Luồng quên mật khẩu bằng OTP email |

## Nội dung công khai (`/api`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/countries`, `/countries/:code` | - | Danh sách/quốc gia (kèm `coming_soon`) |
| GET | `/legal/topics?country=` | - | Chủ đề pháp lý theo quốc gia |
| GET | `/legal/articles?country=&topic=` | - | Danh sách bài luật published+isCurrent |
| GET | `/legal/articles/:country/:slug` | - | Chi tiết bài luật + bài liên quan |
| GET | `/legal/search?q=&country=` | - | Tìm không dấu trên bài published |
| GET | `/support-locations/nearby?lat=&lng=&country=&type=&radiusKm=` | - | Điểm SOS gần nhất (`$geoNear`) |
| GET | `/support-locations?country=&type=` | - | Điểm SOS theo quốc gia (fallback không GPS) |
| GET | `/incidents?country=` | - | Hướng dẫn xử lý sự cố (gộp toàn cục + quốc gia) |
| GET | `/incidents/:slug` | - | Chi tiết 1 hướng dẫn |
| GET | `/quick-phrases?country=` | - | Câu dịch sẵn khẩn cấp |
| GET | `/alerts/applicable?country=&lat=&lng=` | - | Cảnh báo vị trí đang áp dụng |

## Chat AI (`/api/chat`, user)

| Method | Path | Mô tả |
|---|---|---|
| GET/POST | `/chat/sessions` | Danh sách / tạo phiên chat |
| PATCH | `/chat/sessions/:id` | Đổi tên phiên (chỉ của chính mình) |
| DELETE | `/chat/sessions/:id` | Xoá phiên |
| GET | `/chat/sessions/:id/messages` | Lịch sử tin nhắn |
| POST | `/chat/sessions/:id/messages` | Gửi câu hỏi (RAG, rate limit + quota DB) |
| POST | `/chat/sessions/:id/messages/:messageId/feedback` | Thumbs up/down nhanh |

## Translator (`/api/translate`, user)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/translate` | Dịch tự do (tối đa 500 ký tự, chỉ dịch không trả lời câu hỏi) |

## Dữ liệu riêng người dùng (`/api/users/*`, user)

| Method | Path | Mô tả |
|---|---|---|
| GET/POST | `/users/trips` | Danh sách / tạo chuyến đi |
| PUT/DELETE | `/users/trips/:id` | Sửa / xoá chuyến đi |
| PUT | `/users/trips/:id/current` | Đặt làm chuyến đi hiện tại |
| GET/PUT | `/users/incident-progress/:incidentId` | Tiến độ xử lý sự cố (theo `step.order`) |
| GET/POST | `/users/favorites` | Danh sách / lưu mục yêu thích (article/location/incident) |
| DELETE | `/users/favorites/:targetType/:targetId` | Bỏ lưu |
| PUT | `/users/preferences` | Cập nhật tuỳ chọn (chỉ ghi đè field gửi lên) |

## Feedback (`/api/feedback`, user)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/feedback` | Báo sai câu trả lời AI (đưa vào hàng đợi A08) |

## Admin (`/api/admin/*`, role admin — RBAC ở backend, quét tự động ở `test/rbac.sweep.test.js`)

| Nhóm | Endpoint | Ghi chú |
|---|---|---|
| Dashboard | `GET /admin/dashboard` | Số liệu tổng quan |
| Countries | CRUD `/admin/countries[/:id]` | |
| Topics | CRUD `/admin/topics[/:id]` | |
| Legal articles | CRUD `/admin/legal/articles[/:id]` + `POST .../status`, `POST .../new-version` | Máy trạng thái, optimistic concurrency qua `updatedAt` |
| Support locations | CRUD `/admin/locations[/:id]` + `POST bulk-import`, `POST bulk-verify` | Bulk import CSV độc lập từng dòng |
| Incidents | CRUD `/admin/incidents[/:id]` | A07 Workflow Builder |
| Quick phrases | CRUD `/admin/quick-phrases[/:id]` | |
| Geo alerts | CRUD `/admin/geo-alerts[/:id]` | A06, `scope:'area'` bắt buộc `center`+`radiusM` |
| Audit | `GET /admin/audit` | Nhật ký thao tác admin |
| RAG | `POST /admin/rag/reindex-country`, `GET /admin/rag/status` | A04 |
| Feedback | `GET /admin/feedback[/:id]`, `PATCH /admin/feedback/:id` | A08 |
| Analytics | `GET /admin/analytics/overview?days=` | A01 |

## Vận hành

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/health` | `{db, searchDriver, version, uptime}` — dùng cho keepalive + kiểm tra deploy |
