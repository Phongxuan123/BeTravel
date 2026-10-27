# BE.TRAVEL — CONTRACT API

## Dịch trên máy — 12/10/2026

Mobile có chế độ offline mặc định: ML Kit native, gói tải chủ động, tối đa 5.000
ký tự và dịch tuần tự các đoạn <=450 ký tự. Không gọi `/translate`, không tự fallback
cloud và không thay đổi envelope/quota backend. Chế độ online được chọn riêng vẫn
giữ giới hạn 500 ký tự và yêu cầu đăng nhập. `/translate` ở **Expo Router** công khai
để người mất phiên vẫn dùng gói offline; **POST /api/translate** vẫn có auth.
Micro offline yêu cầu nhận dạng trên máy; Android TTS lọc giọng không cần mạng.
Model tải một lần khi có mạng, không chứa trong JS/Expo Go. Xem
`docs/TRANSLATION.md` (mục 3) cho luồng tải, build và bằng chứng nghiệm thu.

## Nhập giọng nói/đọc bản dịch — 07/10/2026

Nhận dạng/TTS qua dịch vụ native mobile; /translate tiếp tục chỉ nhận
text/from/to/mode theo contract cũ. Không nhận/lưu audio ở backend, không đổi
quota/auth/envelope. Người dùng kiểm văn bản rồi chủ động bấm dịch.
Xem docs/TRANSLATION.md (mục 2) về quyền, giới hạn và rebuild.

## Lịch trình nhiều chặng — 06/10/2026

Trip có `stops: [{countryCode,destinationCity,destinationDetail,startDate}]` (1–20).
Chặng đầu bắt đầu đúng startDate chuyến đi, các chặng sau tăng ngày nghiêm ngặt,
không vượt endDate. Ngày chuyển nước thuộc chặng mới, chặng cuối kéo tới endDate.
Top-level country/city/detail phản ánh chặng đầu cho client cũ. Client cũ sửa
chuyến nhiều chặng mà không gửi stops -> 409 CONFLICT, tránh mất dữ liệu.
Dữ liệu cũ đọc được không migration. Ngày YYYY-MM-DD, quốc gia thêm mới phải active.
PUT nhận `updatedAt` của bản GET gốc (ISO datetime); phiên cũ trả 409 CONFLICT.
Mobile giữ phiên bản lúc mở form. Legacy không gửi vẫn có compare-and-swap trong
request, nhưng không phát hiện form cũ đã mở từ trước.

## Bản vá hợp đồng API 05/10/2026

- `Country.aliases?: string[]` cho admin và dữ liệu quốc gia; AI nhận diện thêm tên tiếng Anh, thành phố và bí danh có sẵn KR/JP/TH/SG, kể cả khi chưa seed lại. Tên ngắn dễ trùng từ như “Thái” chỉ khớp ngữ cảnh quốc gia/di chuyển.
- Incident trả `steps[].stepId: string` ổn định. `GET/PUT /api/users/incident-progress/:incidentId` trả/nhận `completedSteps: string[]`, mỗi phần tử là `stepId`. API từ chối payload tiến độ dạng số; dữ liệu cũ trong DB vẫn được đọc/migrate an toàn. Triển khai mobile và backend tương ứng cùng đợt.
- Admin PATCH incident yêu cầu phiên bản `updatedAt` để chống ghi đè (thiếu hoặc cũ trả CONFLICT). Khi reorder/xóa bước, tiến độ cũ được chuyển sang ID trong cùng transaction; dấu tick của bước đã xóa không được trả.
- Public SOS list và nearby chỉ trả `verified: true`, kể cả nhánh mở rộng bán kính. Admin vẫn xem được mọi điểm.
- Các API công khai incidents/quick-phrases/alerts/SOS bỏ `createdBy` và `updatedBy`; quick-phrases/alerts/SOS bỏ `__v`.
- Tài khoản mới mặc định `preferences.locationConsent = false`; giữ nguyên lựa chọn đã lưu của tài khoản cũ.
- Xuất bản bài luật: draft → pending_review → published; pending_review → draft; published/superseded → archived; archived → draft. Không cho draft/archived/superseded → published trực tiếp. `isCurrent = true` khi xuất bản, false sau lưu trữ. Thay thế phiên bản + tạo job reindex/purge trong cùng transaction.
- AI phải có ít nhất một marker hợp lệ để được trả nội dung. Thiếu marker → GUARD_REJECTED. Thông báo đổi quốc gia là từ chối INSUFFICIENT_EVIDENCE (giá trị thực: `INSUFFICIENT_EVIDENCE`), không gọi provider. Cache cũ không được dùng lại nhờ phiên bản cache mới.
- Điều kiện nguồn luật giữ nguyên `url + authority + publishedAt`; chưa cho accessedAt thay ngày công bố.



> Nguon su that duy nhat ve hinh dang API. Backend, mobile va admin deu doi chieu vao day.
> Doi hinh dang API --> sua file nay + `fixtures/*.json` TRUOC, roi moi sua code, trong CUNG MOT commit.

---

## 1. ENVELOPE

Moi response cua API deu nam trong mot trong hai dang duoi day. Khong co dang thu ba.

Thanh cong:

```jsonc
{ "ok": true, "data": <T> }
{ "ok": true, "data": <T[]>, "meta": { "page": 1, "limit": 20, "total": 57 } }
```

That bai:

```jsonc
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

`details` chi xuat hien khi co du lieu bo sung. `message` la tieng Viet cho nguoi dung doc;
`code` la thu ma client phan nhanh xu ly. **Client khong bao gio so khop theo `message`.**

---

## 2. ERROR CODE — ENUM DONG 10 GIA TRI

Khong duoc tu nghi them ma moi.

| Code | HTTP | Dung khi |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Du lieu dau vao sai dinh dang (ZodError roi vao day) |
| `UNAUTHORIZED` | 401 | Chua dang nhap, token sai/het han, phien bi thu hoi |
| `FORBIDDEN` | 403 | Da dang nhap nhung khong du quyen, hoac tai khoan bi vo hieu hoa |
| `NOT_FOUND` | 404 | Khong tim thay tai nguyen hoac endpoint |
| `CONFLICT` | 409 | Trung du lieu duy nhat (email, phone, username) hoac xung dot trang thai |
| `RATE_LIMITED` | 429 | Vuot gioi han so lan goi trong cua so thoi gian |
| `QUOTA_EXCEEDED` | 429 | Vuot han muc AI trong ngay (luu trong DB) |
| `UPSTREAM_ERROR` | 502 | Dich vu ngoai loi (Google, SMTP, LLM, embedding) |
| `INSUFFICIENT_EVIDENCE` | 200 | RAG khong du bang chung --> tra loi tu choi, KHONG phai loi he thong |
| `INTERNAL_ERROR` | 500 | Loi khong luong truoc. Production khong lo stack trace |

`INSUFFICIENT_EVIDENCE` tra HTTP 200 vi day la ket qua nghiep vu hop le, khong phai su co.

---

## 3. AUTH TRANSPORT

Bien moi truong `AUTH_TRANSPORT` quyet dinh refresh token di duong nao:

| Gia tri | Hanh vi |
|---|---|
| `body` (mac dinh) | Tra `refreshToken` trong `data`. Danh cho mobile (`expo-secure-store`) |
| `cookie` | Chi set httpOnly cookie. Danh cho admin web |
| `both` | Lam ca hai. Dung khi mot backend phuc vu ca hai client |

Backend **luon doc duoc refresh token tu ca cookie lan `req.body.refreshToken`**, bat ke
`AUTH_TRANSPORT` la gi. Viet mot lan, chay ca hai che do.

Access token luon di qua header `Authorization: Bearer <accessToken>`.

---

## 4. ENDPOINT

Base path: `/api`

### 4.1. `GET /health`

Khong can auth. Dung cho cron ping chong ngu tren Render.

```jsonc
{ "ok": true, "data": { "db": "connected", "searchDriver": "atlas",
                        "version": "1.0.0", "uptime": 1234.5 } }
```

`db`: `connected` | `connecting` | `disconnected`.

---

### 4.2. `POST /auth/register`

Rate limit: 5 lan / 15 phut.

Request:

```jsonc
{ "fullName": "Nguyen Van A", "username": "nguyenvana",   // username tuy chon
  "email": "a@example.com", "phone": "0901234567",        // phone BAT BUOC
  "password": "Matkhau123", "confirmPassword": "Matkhau123",
  "termsAccepted": true }
```

Response `201` --> xem `fixtures/auth.register.json`. Dang ky **khong** tu dong dang nhap.

| Tinh huong | Code |
|---|---|
| Thieu field, mat khau yeu, confirm khong khop | `VALIDATION_ERROR` |
| Email / phone / username da ton tai | `CONFLICT` |

### 4.3. `POST /auth/login`

Rate limit: 10 lan / 15 phut.

```jsonc
{ "identifier": "a@example.com", "password": "Matkhau123", "rememberMe": true }
```

`identifier` nhan email, username **hoac** so dien thoai.
`rememberMe: true` --> refresh token song 7 ngay; `false` --> 1 ngay.

Response `200` --> xem `fixtures/auth.login.json`.

| Tinh huong | Code |
|---|---|
| Sai tai khoan / mat khau | `UNAUTHORIZED` |
| Tai khoan chua co mat khau (dang ky bang Google) | `VALIDATION_ERROR` |
| Tai khoan bi vo hieu hoa | `FORBIDDEN` |

### 4.4. `POST /auth/google`

```jsonc
{ "credential": "<Google ID token>" }
```

Response giong `4.3`.

| Tinh huong | Code |
|---|---|
| Thieu credential, googleId/email sai dinh dang | `VALIDATION_ERROR` |
| Credential khong hop le / het han / email chua xac thuc | `UNAUTHORIZED` |
| Email da co tai khoan mat khau, hoac Google da lien ket nguoi khac | `CONFLICT` |
| Google Client ID chua cau hinh phia server | `INTERNAL_ERROR` |

### 4.5. `POST /auth/google/link`

Can `Authorization`. Lien ket Google vao tai khoan mat khau dang dang nhap.
Email Google phai trung email tai khoan. Response: `{ "ok": true, "data": { "user": {...} } }`.

### 4.6. `POST /auth/refresh`

Khong can `Authorization`. Doc refresh token tu cookie **hoac** body:

```jsonc
{ "refreshToken": "<opaque 128 hex>" }   // bo qua neu dung cookie
```

Response `200` --> xem `fixtures/auth.refresh.json`.

**Xoay vong co cua so an han** (`REFRESH_ROTATION_GRACE_SECONDS`, mac dinh 10 giay):

```
token hop le            --> cap token moi, thu hoi token cu, tra ca hai
token vua bi thay < 10s --> tra lai token dang hieu luc (race lanh tinh)
token bi thay >= 10s    --> TAI SU DUNG: thu hoi toan bo family, 401 UNAUTHORIZED
```

| Tinh huong | Code |
|---|---|
| Thieu token, token khong ton tai, het han, bi thu hoi | `UNAUTHORIZED` |
| Tai khoan bi vo hieu hoa | `FORBIDDEN` |

### 4.7. `POST /auth/logout`

Doc refresh token tu cookie hoac body. Thu hoi **toan bo family** cua token do.
Luon tra `200` ke ca khi khong co token: `{ "ok": true, "data": { "loggedOut": true } }`.

### 4.8. `GET /auth/me`

Can `Authorization`. Response --> xem `fixtures/auth.me.json`.

### 4.9. `PATCH /auth/me`

Can `Authorization`. Body `{ "fullName"?: string, "phone"?: string }` — it nhat mot field.
Response giong `4.8`.

| Tinh huong | Code |
|---|---|
| Khong gui field nao, ho ten / sdt sai dinh dang | `VALIDATION_ERROR` |
| So dien thoai da thuoc ve nguoi khac | `CONFLICT` |
| Khong tim thay tai khoan | `NOT_FOUND` |

### 4.10. Quen mat khau

Rate limit chung: 8 lan / 15 phut. Tat ca tra `{ "ok": true, "data": {...} }`.

| Endpoint | Body | Data tra ve |
|---|---|---|
| `POST /auth/forgot-password` | `{ email }` | `{ "sent": true }` |
| `POST /auth/verify-reset-otp` | `{ email, otp }` | `{ "resetToken": "..." }` |
| `POST /auth/resend-reset-otp` | `{ email }` | `{ "sent": true }` |
| `POST /auth/reset-password` | `{ resetToken, password }` | `{ "reset": true }` |

`forgot-password` và `resend-reset-otp` trả cùng `{sent:true}` cho email có/không có tài khoản
khi dịch vụ email sẵn sàng; `sent` là tiếp nhận yêu cầu, KHÔNG xác nhận thư đến hộp thư.
Email sai định dạng: `400 VALIDATION_ERROR`. Kiểm tra SMTP thực hiện trước tra tài khoản;
thiếu cấu hình, tắt SMTP ngoài test hoặc verify lỗi: cùng `502 UPSTREAM_ERROR` cho mọi email.
Lỗi gửi riêng từng người nhận sau verify vẫn trả phản hồi chung để không lộ tài khoản;
server ghi mã lỗi không chứa email/OTP. `SMTP_DISABLED=true` chỉ bỏ gửi trong NODE_ENV=test.
OTP 5 phút; tối đa 5 lần sai; token reset 10 phút và dùng một lần. Đổi mật khẩu trực tiếp
bằng mật khẩu hiện tại không dùng SMTP; hủy refresh token và các OTP/token reset đang chờ.

---

## 5. HINH DANG `user`

Dung chung o moi response co `user`. Khong bao gio chua `password`.

```jsonc
{ "id": "66f0a1b2c3d4e5f60718293a", "username": "nguyenvana",
  "fullName": "Nguyen Van A", "email": "a@example.com", "phone": "0901234567",
  "role": "user",              // user | admin
  "isActive": true,
  "createdAt": "2026-09-20T10:00:00.000Z",
  "updatedAt": "2026-09-22T08:30:00.000Z" }
```

`GET /auth/me` tra them `googleLinked: boolean`.

---

## 6. FIXTURES

Moi file trong `fixtures/` la **mot response that**, khong them bot gi.

| File | Endpoint |
|---|---|
| `auth.register.json` | `POST /auth/register` — 201 |
| `auth.login.json` | `POST /auth/login` — 200 |
| `auth.refresh.json` | `POST /auth/refresh` — 200 |
| `auth.me.json` | `GET /auth/me` — 200 |
| `admin.country.json` | `POST/GET/PATCH /admin/countries` — 200/201 |
| `admin.legalArticle.json` | `GET /admin/legal/articles/:id` (đã published) — 200 |
| `error.validation.json` | bat ky endpoint nao — 400 |
| `error.unauthorized.json` | bat ky endpoint nao — 401 |
| `error.forbidden.json` | bat ky endpoint `/admin/*` khi khong phai admin — 403 |
| `error.conflict.json` | vi du publish thieu source — 409 |

Ca hai phia deu co test doi chieu vao chinh cac file nay:

- `backend/test/contracts.test.js` — response that phai co dung bo key nhu fixture
- `mobile/src/lib/api/__tests__/contracts.test.ts` — schema client phai parse duoc fixture
- `admin/src/lib/__tests__/contracts.test.ts` — schema Zod cua admin phai parse duoc fixture

Lech fixture --> **test do o ca hai/ba phia cung luc**, phat hien ngay thay vi luc tich hop.

---

## 7. ENDPOINT ADMIN — `/api/admin/*`

Tat ca endpoint duoi day BAT BUOC `Authorization: Bearer <accessToken>` cua mot
user co `role: 'admin'`. Khong dat role admin --> `403 FORBIDDEN`. Chua dang
nhap --> `401 UNAUTHORIZED`. Day la RBAC kiem o **backend** (`requireRole`),
khong phai an nut phia admin UI.

### 7.1. `GET /admin/dashboard`

```jsonc
{ "ok": true, "data": {
  "articlesByStatus": { "draft": 3, "pending_review": 1, "published": 8,
                         "superseded": 2, "archived": 0 },
  "articlesTotal": 14, "countryCount": 2, "locationCount": 12, "failedJobCount": 0 } }
```

### 7.2. Countries / Topics / Locations — CRUD dong nhat

```
GET    /admin/countries?status=&page=&limit=       200, meta {page,limit,total}
POST   /admin/countries                             201
GET    /admin/countries/:id                         200
PATCH  /admin/countries/:id                          200
DELETE /admin/countries/:id                          200 { deleted: true }

GET    /admin/topics?countryCode=&page=&limit=
POST   /admin/topics
GET    /admin/topics/:id
PATCH  /admin/topics/:id
DELETE /admin/topics/:id

GET    /admin/locations?countryCode=&type=&page=&limit=
POST   /admin/locations
GET    /admin/locations/:id
PATCH  /admin/locations/:id
DELETE /admin/locations/:id
```

`location.location` la GeoJSON Point: `{ "type": "Point", "coordinates": [lng, lat] }`
— **luon la [kinh do, vi do]**, dao nguoc la loi kinh dien.

| Tinh huong | Code |
|---|---|
| Thieu field bat buoc, sai dinh dang | `VALIDATION_ERROR` |
| Khong tim thay ban ghi | `NOT_FOUND` |

### 7.3. Legal Articles — mo hinh day du

```
GET    /admin/legal/articles?countryCode=&topicSlug=&status=&search=&page=&limit=
POST   /admin/legal/articles                          201, tao draft version 1
GET    /admin/legal/articles/:id
PATCH  /admin/legal/articles/:id                        BAT BUOC kem `updatedAt`
POST   /admin/legal/articles/:id/status   { status, note? }
POST   /admin/legal/articles/:id/new-version            201, clone sang version+1 draft
```

[!] **Chong ghi de**: `PATCH` phai kem `updatedAt` cua ban dang xem. Khac voi
`updatedAt` hien co trong DB --> `409 CONFLICT`, `details: {updatedBy, updatedAt}`
la trang thai hien hanh de client tai lai.

[!] **May trang thai** qua `POST .../status`:
- Chuyen sang `published`: bat buoc >=1 `sources[]` co du `url`+`authority`+
  `publishedAt`, `summaryVi` khong rong, `effectiveFrom` co gia tri, `topicSlug`
  ton tai. Thieu --> `409 CONFLICT`, `details` la mang `{path, message}` liet
  ke tung field con thieu.
- Publish thanh cong: `isCurrent=true` cho ban nay; moi ban khac cung
  `(countryCode,slug)` dang `isCurrent=true` bi chuyen `superseded` +
  `isCurrent=false`. Enqueue job `reindex_article`.
- Roi khoi `published` (vi du sang `archived`): enqueue job `purge_chunks`.

`POST .../new-version`: ban nhap moi **KHONG** `isCurrent` ngay — chi tro
thanh current luc duoc publish.

### 7.4. `GET /admin/audit?entityType=&actorId=&from=&to=&page=&limit=`

```jsonc
{ "ok": true, "data": [{
  "_id": "...", "actorId": "...", "actorUsername": "",
  "action": "STATUS_CHANGE", "entityType": "LegalArticle", "entityId": "...",
  "diff": { "before": {...}, "after": {...} },
  "ip": "127.0.0.1", "createdAt": "2026-09-22T..." }],
  "meta": { "page": 1, "limit": 20, "total": 5 } }
```

---

## 8. ENDPOINT CONG KHAI — `/api/countries`, `/api/legal/*` (B3)

Khong can `Authorization`. Moi truy van `legal_articles` o day BAT BUOC loc
`status:'published'` VA `isCurrent:true` o BACKEND (khong tin client) — bai
`draft`/`pending_review`/`superseded` lot ra day la BUG NGHIEM TRONG
(CLAUDE.md Phan 4.1). Xem `backend/src/services/publicContent.service.js`.

### 8.1. Countries

```
GET /countries              200, tra CA active lan coming_soon kem articleCount va federalLawCount
                            (so luat lien bang tuyen chon, chi AU > 0; mobile cong vao "so quy dinh").
                            emergencyNumbers co them extra: [{label, number}] (so huu ich khac, co the rong)
GET /countries/:code        200, hoac 404 NOT_FOUND
```

`status: 'coming_soon'` nghia la da co du lieu trong DB nhung chua mo cho
nguoi dung — client phai TU hien trang thai ro rang (vi du "Sap ra mat"),
KHONG bia noi dung, khong loi.

`majorCities: string[]` — danh sach thanh pho lon goi y cho wizard tao chuyen
di (mobile `trips/new.tsx` buoc 1). Thuan tuy la du lieu dia ly tham khao de
goi y nhanh, KHONG rang buoc gia tri `destinationCity` nguoi dung tu go —
khong ap dung Rule "8 bai co nguon that" vi day khong phai noi dung phap ly.
Rong (`[]`) la hop le, UI chi an phan goi y neu vay.

`officialWebDomains: string[]` — ten mien chinh phu (vd `"gov.au"`, khop ca ten mien con) ma AI duoc tra web
khi kho chua du du lieu (muc chat, "Tang tra web"). Rong = quoc gia nay khong co tang tra web. Admin sua qua
`PATCH /admin/countries/:id`.

### 8.2. Legal content

[!] **Cong chan tam thoi (`LEGAL_LOOKUP_ENABLED`, mac dinh `false`)**: khi tat, moi
`/api/legal/*` va `/api/chat/*` tra `403 FORBIDDEN` kem `error.details.reason =
"FEATURE_DISABLED"` (khong them ErrorCode moi -- enum dong). Client phan biet loi nay
voi loi phan quyen that qua `details.reason`, khong qua message. `/api/countries`,
SOS, incidents, dich, canh bao khong bi anh huong. Bat lai: `LEGAL_LOOKUP_ENABLED=true`.

```
GET /legal/topics?country=KR                          200, kem articleCount/chu de
GET /legal/articles?country=KR&topic=&page=&limit=     200, meta {page,limit,total}
GET /legal/articles/:country/:slug                     200 kem relatedArticles
                                                         (toi da 4, cung topic),
                                                         hoac 404 neu chua publish
GET /legal/search?q=&country=KR&topic=&page=           200, meta {page,limit,total}
```

[!] **Tim khong dau**: `q` duoc tach tung tu, moi tu phai xuat hien o
`titleNorm` hoac `summaryNorm` (da bo dau + lowercase, tu dong tinh lai moi
lan luu bai — xem `LegalArticle.js` hook `pre('save')`). "phat vape" khop
"Muc phat ... (vape)" du hai tu khong lien tiep. Chu `d` va `đ` khop lan nhau
("dai su quan" ra "Đại sứ quán"). `q` toi da 200 ky tu, rong/qua dai --> 400.

**Truong noi bo khong tra ra API cong khai** (QA-2, INV-05.8): bai luat o
`/legal/articles` va `/legal/articles/:country/:slug` KHONG co `titleNorm`,
`summaryNorm`, `reviewNote`, `reviewedBy`, `indexState`, `createdBy`,
`updatedBy`, `__v`. Admin van thay day du qua `/admin/legal/articles/:id`.

**Diem thay the cho B4**: khi `legal_chunks` + Atlas Search san sang, chi cai
lai PHAN THAN cua `publicContent.service.js#searchArticles` sang goi Atlas
Search — chu ky ham va shape ket qua ben duoi GIU NGUYEN, controller/route/
mobile khong phai sua.

Shape 1 ket qua tim kiem:

```jsonc
{ "id": "...", "countryCode": "KR", "slug": "bang-lai-nuoc-ngoai",
  "title": "...", "summaryVi": "...", "topicSlug": "giao-thong",
  "topicLabel": "Giao thông", "sourceAgency": "Korea Legislation Research Institute" }
```

### 8.3. Trips — `/api/users/trips` (can dang nhap, khong can role rieng)

```
GET    /users/trips             200, chuyen di CUA CHINH user dang goi
POST   /users/trips             201, LUON tao isCurrent:false
PUT    /users/trips/:id         200, cap nhat quoc gia/dia diem/ngay/tuy chon canh bao cua chuyen di
PUT    /users/trips/:id/current 200, dat chuyen di nay la current, cac chuyen
                                      di khac cua user tu dong isCurrent:false
DELETE /users/trips/:id         200 { deleted: true }
```

[!] **Chi 1 `isCurrent:true` moi user tai mot thoi diem** — ep bang partial
unique index `{userId}` where `isCurrent:true` tren model `Trip` (cung mau
voi `LegalArticle`), cong voi logic tuan tu o service layer. Goi
`:id` khong thuoc ve user dang goi --> `404 NOT_FOUND` (khong lo ra `403`
de tranh do thong tin ID cua nguoi khac ton tai).

## 9. ENDPOINT CHAT AI — `/api/chat/*` (B4 backend + B5 mobile, can dang nhap)

Mobile noi qua `mobile/src/lib/api/chat.ts` (xem `mobile/src/app/chat/index.tsx`).
Toan bo pipeline (retrieval + guard chong ao giac) xem `backend/src/rag/`,
`docs/atlas-indexes.md`.

```
GET    /chat/sessions                              200, danh sach phien CUA CHINH user
POST   /chat/sessions            {countryCode}      201, tao phien moi
DELETE /chat/sessions/:id                           200 { deleted: true }
GET    /chat/sessions/:id/messages                  200, lich su tin nhan cua phien
POST   /chat/sessions/:id/messages {question, focusArticleId?, regenerate?}  201 { sessionId, message } --
                                                      [!] TRA MOT LAN, KHONG STREAMING (master plan B.7).
                                                      focusArticleId (B5): CTA "Hoi AI ve bai nay" tu man
                                                      hinh chi tiet bai luat -- uu tien chunk cua bai do
                                                      trong RRF (xem rag/retrieval.js FOCUS_ARTICLE_WEIGHT).
                                                      regenerate (nut "Tao lai"): true --> bo qua cache cau tra loi
                                                      va bo nho cau hoi lap lai, goi lai LLM, van tinh luot quota.
POST   /chat/sessions/:id/messages/:messageId/feedback {feedback:'up'|'down'}  200
```

`message` (role='assistant') co dang:
```jsonc
{
  "text": "cau tra loi da qua guard.js, kem [S1][S2]... va disclaimer (markdown, da ghep tu sections)",
  "route": "legal",       // "legal" | "emergency" | "personal_advice" | "out_of_scope" | "greeting"
  "sections": { "answer": "...", "actions": ["... [S1]"], "avoid": ["... [S1]"] },  // null neu khong co AI tra loi
  "citations": [{ "marker":"S1", "articleId", "articleSlug", "title", "heading",
                  "sourceType": "article",   // hoac "au_legislation" (van ban luat goc, CHUA duoc Be.Travel kiem chung)
                                             // hoac "official_web" (trang web chinh phu AI da doc khi tra web, CHUA kiem chung)
                  "officialUrl": "" }],      // co voi au_legislation va official_web; bai noi bo mo trong app theo articleSlug
  "retrieval": { "topScore": 0.63, "chunkIds": [...], "passed": true },
  "fallbackReason": null,  // hoac "INSUFFICIENT_EVIDENCE" | "GUARD_REJECTED" | "PROVIDER_ERROR" | "OUT_OF_SCOPE"
                           // INSUFFICIENT_EVIDENCE: text do CODE soan (rag/noEvidence.js), markdown: neu cau hoi
                           // thuoc chu de kho chua co (core/aiCoverageGaps.js) thi neu ly do + link trang chinh thuc;
                           // khong thi loi tu choi chuan + danh sach chu de AI tra loi duoc. Shape khong doi.
  "confidence": "medium",
  "needsOfficialHelp": false,
  "answerSource": "ai",    // hoac "approved_faq": tra tu cau tra loi admin da duyet (muc 10b), khong goi LLM
                           // hoac "official_web": AI tra trang web chinh phu vi kho khong du du lieu (CHUA kiem chung)
  "repeated": false,       // true = dung lai cau tra loi cua cau hoi trung lap (khong goi AI, khong tru luot)
  "faqId": null            // id FAQ khi answerSource="approved_faq"
}
```

[!] **Tra loi lap lai** (`services/answerMemory.service.js`): voi luong `legal`, khong `regenerate`, khong
`focusArticleId`, cau hoi trung CHINH XAC (bo khac biet hoa/thuong, dau tieng Viet, dau cau, khoang trang; cung
quoc gia) voi cau da tra loi trong `AI_CACHE_TTL_HOURS` (mac dinh 120 = 5 ngay) duoc tra NGAY, truoc ca buoc tao
tu khoa. Cau khac chu nhung cung tu khoa (Jaccard >= `ANSWER_REPEAT_MIN_SIMILARITY`) duoc tra sau buoc tao tu
khoa. Ca hai: `repeated:true`, khong goi LLM, khong tru luot quota. Cau tra loi tu kho chi duoc dung lai khi moi
nguon con dung phien ban (bai `published`+`isCurrent`, cung `version` va `updatedAt`; luat Uc cung `registerId`),
khong thi bi xoa va tra loi lai. Chi luu cau tra loi khong co `fallbackReason`. FAQ admin da duyet duoc uu tien.

[!] **Tang tra web** (`rag/webAnswer.js`, bat bang `WEB_SEARCH_ENABLED`): voi luong `legal`, khi kho khong du bang
chung (truy hoi duoi nguong, AI bao `answerable:false`, hoac chu de kho chua co trong `core/aiCoverageGaps.js`),
backend tra web CHI tren `Country.officialWebDomains` (vd `gov.au`, khop ca ten mien con). Truoc khi tra: con tran
`WEB_SEARCH_DAILY_LIMIT_USER` cau/nguoi/ngay va ngan sach `WEB_SEARCH_DAILY_BUDGET_VND`, va model nho xac nhan cau
hoi thuoc chu de phap ly du lich (`rag/webTopicGate.js`). Code chi giu nguon la URL https thuoc danh sach ten mien
VA nam trong tap trang cong cu tim kiem thuc su tra ve; moi khoi co so lieu bat buoc co marker toi nguon hop le.
Thanh cong: `answerSource:"official_web"`, citations `sourceType:"official_web"`, disclaimer rieng ("Be.Travel chua
kiem chung"). Khong ra cau tra loi dung duoc: van la `INSUFFICIENT_EVIDENCE` nhu truoc. Thoi gian 15-50 giay.

[!] **Cau tra loi da duyet (FAQ, muc 10b)**: voi luong `legal`, khong `regenerate`, khong `focusArticleId`,
backend so tu khoa cau hoi voi FAQ `active` cung quoc gia; khop du nguong `FAQ_MATCH_MIN_SIMILARITY` va nguon
con hieu luc thi tra nguyen van FAQ (`answerSource:"approved_faq"`), van tinh luot quota. Nut "Tao lai"
(`regenerate:true`) luon bo qua FAQ. Client hien nhan "Da duoc Be.Travel duyet".

[!] **Phan luong cau hoi bang code** (`backend/src/rag/scope.js`, chay TRUOC retrieval, khong goi LLM):
`out_of_scope` va `greeting` tra loi do code soan, `fallbackReason:"OUT_OF_SCOPE"`, **khong ton quota**.
`emergency`: khoi so khan cap lay tu `Country.emergencyNumbers` + `Country.embassy.phone` dung DAU
`text`, `needsOfficialHelp:true`; neu het luot AI trong ngay van nhan duoc khoi nay (khong bi 429).
`personal_advice`: van tra thong tin nhung `text` them cau ranh gioi co dinh. `sections` gom 3 phan do
LLM sinh; phan "Nguon" cua UI dung `citations`, KHONG phai do LLM viet. `text` van la ban ghep san
(co tieu de `**Tra loi ngan**`, `**Viec nen lam**`, `**Dieu can tranh**`) de client cu khong vo.

[!] **Cau hoi nhac ten mot quoc gia KHAC voi `countryCode` cua session** duoc
chan o tang service (`chat.service.js#detectOtherCountryMention`) TRUOC ca
retrieval -- tra loi co dinh moi nguoi dung doi quoc gia, khong bao gio de
LLM tu quyet dinh (deterministic, khong ton chi phi goi LLM).

[!] **Quota 2 lop** (CLAUDE.md muc 4.1): `express-rate-limit` RAM (20
req/15p/IP, lop 1) + quota luu DB `users.aiUsage` theo ngay (`AI_DAILY_QUOTA_USER`,
mac dinh 40/ngay/user; van an toan he thong `AI_DAILY_QUOTA_GLOBAL`, mac dinh
800/ngay) -- vuot quota --> `429 QUOTA_EXCEEDED`. Day la lop THAT SU bao ve
chi phi vi khong reset khi server restart.

## 10. ENDPOINT ADMIN RAG — `/api/admin/rag/*` (B4, role admin)

```
GET  /admin/rag/status?countryCode=            200, trang thai index tung bai published+isCurrent
POST /admin/rag/reindex-country {countryCode}   200 { queued: N }, xep lai job reindex_article
GET  /admin/rag/au-laws                         200, 31 luat lien bang Uc tuyen chon:
                                                  [{ titleId, name|null, topics[], index:{chunks,registerId,embeddingModel}|null,
                                                     job:{status,lastError,createdAt}|null }]
POST /admin/rag/au-laws/index {titleIds[]}      200 { queued[], skipped[] }, xep job index_au_law (chay nen,
                                                  luat dang co job pending/running thi bi bo qua); ma ngoai danh sach
                                                  tuyen chon --> 400 VALIDATION_ERROR
DELETE /admin/rag/au-laws/:titleId              200 { titleId, deleted }, xoa chunk cua luat do khoi RAG
```

Chunk luat goc (`sourceType:"au_legislation"`) nam trong CUNG collection `legal_chunks`, dung chung
`vec_idx`/`txt_idx` (filter `countryCode:"AU"`), nen khong can them Atlas index. CLI tuong duong:
`npm run index-au-laws -- <titleId...> | --topic <slug> | --list | --remove <titleId>`.

## 10b. ENDPOINT ADMIN FAQ — `/api/admin/faq/*` (G6, role admin)

Gom nhom de xuat: loc so bo bang tu khoa chung (`FAQ_PREFILTER_MIN_OVERLAP`), roi **AI cham muc trung lap noi dung**
giua cac cau hoi (0-100); chi cau dat `FAQ_AI_MIN_SIMILARITY` (mac dinh 85%) moi vao nhom. Nhom duoc hoi >=
`FAQ_MIN_REPEAT` lan trong `FAQ_WINDOW_DAYS` ngay moi hien la de xuat. AI cham loi --> nhom KHONG hien (khong dua nhom
chua kiem len). Admin chi DUYET NGUYEN VAN mot cau tra loi AI da sinh (khong sua noi dung).

```
GET   /admin/faq/candidates?countryCode=   200, [{ countryCode, count, questions[] (cau goc dau tien), minSimilarity, keywordTerms[],
                                              answers:[{ messageId, text, sections, citations, createdAt }],
                                              feedback:{ up, down } }]
GET   /admin/faq?status=                   200, [{ _id, countryCode, question, answer, sections, citations, status,
                                              statusReason, approvedAt, servedCount, feedback:{up,down}, warning }]
                                              status: active | needs_review | retired | dismissed
POST  /admin/faq {sourceMessageId, decision:'approve'|'dismiss'}   201 FAQ vua tao.
                                              approve: tin nhan phai la cau tra loi AI khong fallback, co trich dan,
                                              nguon con hieu luc (khong --> 409 CONFLICT); AI cham trung FAQ dang mo
                                              >= 85% --> 409; AI cham loi --> 502 UPSTREAM_ERROR.
                                              dismiss: luu de nhom do khong con hien la de xuat.
PATCH /admin/faq/:id {status:'active'|'retired'}  200. Kich hoat lai phai qua kiem nguon (khong --> 409).
```

[!] Moi lan phat FAQ, backend kiem lai nguon: bai `published`+`isCurrent` dung version, luat Uc dung `registerId`
hien hanh. Nguon doi --> FAQ tu chuyen `needs_review` va khong phat. Collection `approvedfaqs` la MongoDB thuong,
khong them Atlas Search index.

## 11. ENDPOINT FEEDBACK — `/api/feedback` (B5, can dang nhap)

Rieng voi thumbs nhanh o muc 9 (`ChatMessage.feedback`, khong note). Day la
feedback CO NOTE, sinh tu nut "Bao sai" trong AnswerCard.tsx, vao hang doi A08
cho admin xu ly. `targetId` phai la 1 `ChatMessage` role=assistant CUA CHINH
user goi (backend xac minh qua `sessionId.userId`, khong tin client).

```
POST /feedback {targetType:'chat_message', targetId, rating:'up'|'down', note?, context?:{countryCode,question}}
     201, { ..., status:'pending', reviewerId:null, reviewerNote:'' }
```

## 12. ENDPOINT ADMIN FEEDBACK — `/api/admin/feedback/*` (B5, A08, role admin)

```
GET   /admin/feedback?rating=&status=&countryCode=&page=&limit=   200, {data:[...], meta:{page,limit,total}}
GET   /admin/feedback/:id                                          200, { feedback, message } --
                                                                     message la ChatMessage lien quan
                                                                     (text, citations, retrieval, model)
                                                                     de reviewer thay LY DO AI tra loi vay
PATCH /admin/feedback/:id {status:'pending'|'resolved'|'dismissed', reviewerNote?}  200
```

[!] Feedback KHONG tu dong sua knowledge base -- doi trang thai chi de theo doi,
sua bai luat (neu can) van la thao tac rieng qua `/admin/legal/articles/:id`.

## 13. ENDPOINT ADMIN ANALYTICS — `/api/admin/analytics/overview` (B5, A01 nang cap, role admin)

```
GET /admin/analytics/overview?days=7   200
```
```jsonc
{
  "days": 7,
  "totalChats": 42,
  "fallbackCount": 10,
  "fallbackRate": 0.238,
  "avgLatencyMs": 1450,
  "costEstimateUsd": 0,  // [!] luon 0 -- provider Gemini/OpenAI chua tra usage tokens, xem docs/PROGRESS.md muc "No ky thuat"
  "pendingFeedbackCount": 3,
  "routeCounts": { "legal": 30, "emergency": 3, "out_of_scope": 8, "greeting": 1 },  // theo luong phan loai (rag/scope.js)
  "topFallbackQuestions": [{ "question": "...", "count": 4 }]
}
```

[!] `fallbackCount`, `fallbackRate` va `topFallbackQuestions` CHI tinh khoang trong nguon
(`INSUFFICIENT_EVIDENCE`, `GUARD_REJECTED`, `PROVIDER_ERROR`); cau `OUT_OF_SCOPE` (thoi tiet, chao hoi...)
khong phai thieu du lieu nen bi loai. ai_event cu khong co `route` duoc dem la `legal`.

## 14. ENDPOINT SOS LOCATIONS CONG KHAI — `/api/support-locations/*` (B6)

Mobile 06/10: giữ nguyên shape API và GeoJSON `[lng,lat]`. Các lựa chọn bán kính
5/20/50 km dùng query hiện có, limit=50; tìm tên/địa chỉ diễn ra trên danh sách
đã tải (không phải tìm toàn bộ địa điểm Google). Mọi điểm công khai phải verified.
Location và incident lồng trong favorites cũng không trả `createdBy`, `updatedBy`, `__v`.

```
GET /support-locations/nearby?lat&lng&country=&type=&radiusKm=&limit=   200
     -- $geoNear, tra kem distanceMeters. Khong co diem trong radiusKm ->
        TU DONG mo rong het toan bo quoc gia (khong tra mang rong, SOS khong
        duoc phep "khong tim thay gi"). Toa do GeoJSON [lng, lat].
GET /support-locations?country=&type=   200 -- fallback khi tu choi GPS,
     sap xep verified truoc, khong co distanceMeters.
```

`location` (moi item) co dang:
```jsonc
{
  "_id": "...", "countryCode": "KR", "type": "embassy",
  "name": "...", "nameLocal": "...", "address": "...", "phone": "...",
  "website": "", "openHours": "08:30 - 17:00",
  "location": { "type": "Point", "coordinates": [127.0016, 37.5407] },
  "verified": true, "verifiedAt": "...", "distanceMeters": 450  // chi co o /nearby
}
```

## 14b. DIA DIEM BO SUNG TU BEN THU BA — `/api/support-locations/external` (OpenStreetMap | SerpApi)

[!] Lop BO SUNG, CHUA xac minh. Khac `/support-locations` va `/nearby` (chi tra diem `verified:true`
do admin xac minh), endpoint nay luon tra `verified:false` va `source` la ten nguon:
`"openstreetmap"` (PLACES_PROVIDER=osm, mien phi) hoac `"google_maps"` (serpapi). Client BAT BUOC
hien nhan "chua xac minh" va khong tron voi diem da xac minh. Khong ghi gi vao DB.

```
GET /support-locations/external?lat&lng&type=embassy|hospital|police|pharmacy   200
GET /support-locations/external?country=KR&type=embassy                          200
     -- type BAT BUOC, la enum co dinh, KHONG nhan chuoi tim kiem tu do. Hai cach goi:
        (1) lat + lng (cung nhau): tim quanh diem, sap xep gan -> xa, kem distanceMeters (so).
        (2) country (ISO-2, chi chu cai) + type=embassy, KHONG can toa do: dai su quan/lanh su Viet Nam
            cua nuoc do (the OSM country=VN, target=<ISO2>), sap xep theo ten, distanceMeters = null.
            Dung khi chua co GPS va du lieu quoc gia chua dien toa do dai su quan. Chi nguon osm/mock;
            serpapi tra 400 vi can toa do.
     -- Toi da 20 diem. Toa do GeoJSON [lng, lat].
     -- 400 VALIDATION_ERROR  thieu/sai tham so
     -- 429 RATE_LIMITED      qua 30 yeu cau / 15 phut / IP
     -- 429 QUOTA_EXCEEDED    het tran luot goi nha cung cap trong ngay (PLACES_DAILY_LIMIT)
     -- 502 UPSTREAM_ERROR    nha cung cap loi/qua han (PLACES_TIMEOUT_MS); khong lo key hay chi tiet
```

Item (xem `fixtures/public.externalPlace.json`): `placeId`, `name`, `type`, `category`, `address`,
`phone`, `website`, `openState`, `rating|null`, `reviews|null`, `location` (GeoJSON Point),
`verified:false`, `source`, `distanceMeters` (so hoac null, xem tren). Voi OSM, `openState` la chuoi `opening_hours` cua OSM
(vd "Mo-Fr 09:00-17:00") va `rating`/`reviews` luon null; `embassy` chi gom co quan ngoai giao Viet Nam
(the OSM `country=VN`) trong ban kinh 500 km.

Cache theo (type, o ~1 km) trong `PLACES_CACHE_TTL_MINUTES`. `PLACES_PROVIDER=mock` (mac dinh) tra
du lieu mau, khong goi mang. Overpass cong cong co luc cham 10-20 giay hoac 504: backend thu lai 1 lan
voi loi tam thoi; lan dau co the cham, cac lan sau trong 24 gio lay tu cache.

## 15. ENDPOINT ADMIN LOCATIONS BULK — `/api/admin/locations/bulk-*` (B6, role admin)

```
POST /admin/locations/bulk-import {rows:[LocationInput...]}   200
     { createdCount, createdIds, skipped:[{index,name,reason}] } --
     [!] moi dong xu ly DOC LAP, dong loi bi bo qua kem ly do thay vi lam hong
       ca file (Rule 7 -- khong "tat ca hoac khong gi" voi du lieu nguoi go tay).
POST /admin/locations/bulk-verify {ids:[...]}   200 { verifiedCount }
```

[!] Validate khi tao/sua 1 diem (khong ap dung cho tung dong bulk-import, xem tren):
`name` + `address` bat buoc, toa do phai hop le (lat [-90,90], lng [-180,180]),
va can IT NHAT 1 trong 2: `phone` hoac `website` -- diem chi co ten+dia chi
khong "Goi ngay" duoc, giam gia tri tinh nang SOS.

## 16. Rà soát tính đúng đắn (24/09/2026)

- Query đã validate giữ nguyên kiểu/default của Zod trên Express 5. ID sai định
  dạng hoặc JSON lỗi trả `VALIDATION_ERROR`; xung đột ghi DB trả `CONFLICT`.
- Bài `published`/`superseded`/`archived` không sửa nội dung trực tiếp: tạo
  phiên bản nháp mới hoặc chuyển về `draft`/`pending_review` trước. PATCH trả
  `409 CONFLICT` nếu không thỏa; `countryCode` và `slug` giữ nguyên qua các phiên bản.
- PATCH bài kiểm tra `updatedAt` nguyên tử tại DB, kể cả hai request đồng thời.
- Chat chỉ tạo session cho quốc gia tồn tại và đang active. `focusArticleId`
  phải là ObjectId hợp lệ; nội dung ưu tiên vẫn phải cùng quốc gia session.
- Retrieval `chunkIds` là ID chunk thật; citation nội bộ có `chunkId` để tạo cache; shape citation công khai giữ nguyên.
  Cache phụ thuộc thứ tự marker/nội dung/model và kiểm tra expiresAt khi đọc.
- Lỗi embedding/search được trả thành câu trả lời fallback `PROVIDER_ERROR`,
  giống lỗi LLM. `confidence` và `needsOfficialHelp` giữ kết quả đã validate.
- Quota global cấp lượt nguyên tử trong collection `aiquotas` theo ngày UTC;
  quota user vẫn tại `users.aiUsage`. Request đồng thời không vượt trần.

## 17. ENDPOINT INCIDENTS CONG KHAI — `/api/incidents/*` (B7)

```
GET /incidents?country=   200 -- gop workflow toan cuc (countryCode:null) +
     workflow rieng cua country. Quoc gia chua co workflow rieng van thay
     nhom toan cuc, KHONG tra mang rong. CHI tra status:'published'.
GET /incidents/:slug   200 | 404 NOT_FOUND (draft hoac khong ton tai)
```

`IncidentType` (moi item) co dang:
```jsonc
{
  "_id": "...", "slug": "mat-ho-chieu", "countryCode": null,
  "title": "Mất hộ chiếu", "iconKey": "IdCard", "tone": "red", "urgent": true,
  "reassurance": "...", "status": "published",
  "steps": [
    {
      "order": 0, "title": "Trình báo công an", "body": ["..."],
      "checklist": [{ "label": "..." }],
      "contactRefs": ["<SupportLocation._id>"], "articleRefs": ["<LegalArticle._id>"],
      "ctas": [{ "type": "map", "label": "Đồn gần nhất", "payload": { "locationType": "police" } }]
    }
  ]
}
```
`cta.type`: `map` (payload.locationType loc SOS map) · `call` (payload.phone,
rong = dung SDT dai su quan cua country dang chon) · `ai` (payload.question
prefill man hinh chat) · `link` (payload.url mo ngoai).

## 18. ENDPOINT TIEN DO SU CO — `/api/users/incident-progress/:incidentId` (B7, can dang nhap)

```
GET /users/incident-progress/:incidentId   200 { completedSteps: number[] }
PUT /users/incident-progress/:incidentId {completedSteps:[...]}   200
     -- step.order khong con ton tai trong workflow hien hanh bi LOC BO am
        tham lang (workflow co the da duoc admin sua sau lan tick truoc do).
     -- rieng tung user, KHONG chia se giua 2 tai khoan.
```
Guest (chua dang nhap) xem workflow qua `/api/incidents` binh thuong nhung
KHONG goi duoc endpoint nay (401 UNAUTHORIZED) -- man hinh tu chan, hien
banner moi dang nhap thay vi goi API roi nhan loi.

## 19. ENDPOINT TRANSLATOR — `/api/translate`, `/api/quick-phrases/*` (B7)

Việt–Anh hai chiều độc lập với quốc gia. `from`/`to` nhận mã
`vi/en/ko/ja/th/zh/fr/de`, mã vùng như `en-US`, hoặc tên hiển thị tương ứng
của client cũ. Ngôn ngữ khác trả VALIDATION_ERROR. Cùng ngôn ngữ trả nguyên
văn, không gọi AI. `text` dịch đầy đủ; `phrase` ưu tiên cách nói tự nhiên,
lịch sự nhưng không bỏ thông tin. Lượt gọi AI tính quota DB chung với chat.
Response giữ nguyên. Bộ câu mẫu mở offline: `docs/TRANSLATION.md` (mục 1).

```
POST /translate {text, from, to, mode:'text'|'phrase'}   can dang nhap
     200 { translated, phonetic } -- text toi da 500 ky tu, rong hoac qua dai
     bi VALIDATION_ERROR. Loi provider -> UPSTREAM_ERROR (KHONG bao gio tra
     loi cau hoi trong text, prompt CHI DICH).
GET  /quick-phrases?country=   200 -- cong khai, sap xep theo `order` tang dan.
GET/POST/PATCH/DELETE /admin/quick-phrases[/:id]   role admin, CRUD don gian.
GET/POST/PATCH/DELETE /admin/incidents[/:id]        role admin, A07 Incident
     Workflow Builder. PATCH gui LAI TRON VEN mang `steps` -- server chuan
     hoa lai `order` theo dung vi tri trong mang gui len (khong tu dien so
     order o client). PATCH nhận thêm `updatedAt` (ISO date) của bản đang sửa:
     nếu đã thay đổi thì trả 409 CONFLICT, không ghi đè. Admin portal luôn gửi;
     client cũ không gửi vẫn tương thích nhưng chưa có chống ghi đè giữa hai người.
```

## 20. ENDPOINT GEO ALERTS — `/api/alerts/applicable`, `/api/admin/geo-alerts/*` (B8, A06)

```
GET /alerts/applicable?country=&lat=&lng=   cong khai
     200 -- co toa do: alert scope 'area' trong ban kinh + alert scope
     'country'. Khong co toa do: CHI alert scope 'country' (khong bao gio
     tra rong tuyet doi chi vi thieu vi tri). LUON loc status:'published' +
     con hieu luc (effectiveFrom<=now<=effectiveTo hoac effectiveTo rong).
     Sap xep severity giam dan (danger truoc warn truoc info).
GET/POST/PATCH/DELETE /admin/geo-alerts[/:id]   role admin, A06 CRUD.
     scope:'area' BAT BUOC co `center`{Point,[lng,lat]} + `radiusM`; khong co
     -> VALIDATION_ERROR. scope:'country' khong can hai truong nay.
```

`GeoAlert` (moi item) co dang:
```jsonc
{
  "_id": "...", "countryCode": "KR", "scope": "area",
  "center": { "type": "Point", "coordinates": [127.0016, 37.5407] },
  "radiusM": 5000, "title": "...", "message": "...", "severity": "danger",
  "behaviorsToAvoid": ["..."], "linkedArticleId": "<LegalArticle._id>",
  "effectiveFrom": "...", "effectiveTo": null, "status": "published"
}
```
`severity`: dung chung enum `RiskLevel` voi LegalArticle (`info`|`warn`|`danger`).
Mobile hien `danger` = modal chan, `warn`/`info` = banner (khong chan thao tac).

## 21. ENDPOINT FAVORITES — `/api/users/favorites` (B8, can dang nhap)

```
GET    /users/favorites                              200 -- gom du 3 loai
POST   /users/favorites {targetType, targetId}        201 -- targetType:
       'article'|'location'|'incident'. Luu trung 1 muc khong loi (coi nhu
       thanh cong), khong tao 2 ban ghi. targetId khong ton tai -> 404.
DELETE /users/favorites/:targetType/:targetId         200 { deleted: true }
```
Chỉ cho lưu/đọc bài published hiện hành, địa điểm verified và incident published.
Bản nháp, bài archived và nội dung đã thu hồi xác minh trả 404 khi thêm;
khi liệt kê thì ẩn nhưng giữ nguyên bản ghi Favorite trong DB.
Ngoại lệ lịch sử: bài superseded không hiện hành vẫn giữ bookmark, nhưng
`article` chỉ có `_id`, `countryCode`, `slug`, `title`, `topicSlug` (không trả
nội dung pháp lý cũ). Kèm `isOutdated:true` và `currentArticleId` chỉ trỏ tới
bản published hiện hành; chưa có bản công khai thì null. Các mục hiện hành
vẫn trả đối tượng `article`/`location`/`incident` như trước.
Fixture: `fixtures/favorites.json`.

## 22. ENDPOINT PREFERENCES — `/api/users/preferences` (B8, can dang nhap)

```
PUT /users/preferences {locale?, alerts?{legal?,safety?,tripReminder?}, locationConsent?}
     200 -- tra ve TRON VEN object preferences sau khi cap nhat. Chi ghi de
     dung field duoc gui, cac field khac giu nguyen (khong phai PUT thay the
     toan bo). Doc preferences hien tai qua `GET /api/auth/me` (da tra kem
     `user.preferences`), khong co GET rieng.
```
Gia tri mac dinh (user moi dang ky): `{locale:'vi', alerts:{legal:true,
safety:true, tripReminder:false}, locationConsent:true}`.

## 23. ĐỔI TÊN PHIÊN CHAT — `PATCH /api/chat/sessions/:id` (B8 muc 16)

```
PATCH /chat/sessions/:id {title}   200 -- title 1-100 ky tu, khong duoc rong.
     Chi doi ten phien CUA CHINH MINH -- phien cua user khac tra 404
     (khong phai 403, tranh lo phien do co ton tai hay khong).
```

---

## 24. LUAT LIEN BANG UC — `/api/laws/australia/*` (cong khai, chi doc)

Nguon: Federal Register of Legislation (`https://api.prod.legislation.gov.au/v1`, OData v4, khong can key).
[!] Chi phu luat Commonwealth, KHONG gom luat cua cac bang/vung lanh tho. Du lieu la ban sao chi-doc,
KHONG ghi vao `legal_articles`, KHONG vao RAG, chua qua kiem chung cua Be.Travel (`verifiedByBeTravel:false`).
Tat/mo cung cong tac `LEGAL_LOOKUP_ENABLED` voi `/api/legal/*`. Rate limit 120 luot/15 phut/IP.

| Endpoint | Query | Tra ve |
|---|---|---|
| `GET /laws/australia` | `page` `limit`(<=50, mac dinh 20) `inForce`(mac dinh true) `collection` `q`(>=2 ky tu) | `data: AuLawSummary[]` + `meta` |
| `GET /laws/australia/search` | nhu tren, `q` BAT BUOC | nhu tren |
| `GET /laws/australia/:id` | — | `AuLawDetail` (kem `version`, `documents`, `hasReadableText`) |
| `GET /laws/australia/:id/versions` | `page` `limit` | `AuLawVersion[]` + `meta` |
| `GET /laws/australia/:id/content` | `offset`(>=0) `limit`(<=300, mac dinh 100) | `AuLawContent` (cac `blocks` co `citationId`) |

- `:id` la ma van ban cua nguon (vd `C1958A00062`), regex `^[A-Za-z0-9]{6,20}$`.
- `collection` da doi chieu voi nguon: `Act`, `LegislativeInstrument`, `NotifiableInstrument`, `Gazette`.
- Tim kiem chi theo TEN van ban (tieng Anh), khong tim toan van. Sap xep theo `name` (nguon loi 400 khi
  `$orderby=makingDate` di cung `$filter isInForce`).
- Loi: `VALIDATION_ERROR` (tham so), `NOT_FOUND` (ma khong ton tai, hoac van ban khong co ban doc duoc —
  khi do `error.details.officialUrl` tro ve ban chinh thuc), `UPSTREAM_ERROR` (nguon Uc loi/timeout).
- `blocks[].citationId` = `<registerId>:<chi so doan>`, on dinh trong mot ban bien soan (registerId bat bien),
  dung de AI trich dan dung doan. Moi cau tra loi AI ve luat Uc PHAI dua tren `blocks` kem `source.officialUrl`.
- Ngay tra ve dang `YYYY-MM-DD` (nguon khong co mui gio).
- Danh sach (muc 24): voi `collection=Act` sap xep MOI NHAT truoc (`year desc,name`), con lai sap theo `name`.
  Nhom luat thue "A New Tax System" bi loai khoi ket qua (khong lien quan nguoi di du lich; nguon khong ho tro loc
  phu dinh nen loai sau khi lay trang) => mot trang co the it hon `limit` phan tu, tham chi rong; `meta.total` la
  tong cua nguon (gom ca phan bi loai). Client dua vao `meta.total` de biet con trang sau.

### 24b. Phan loai theo 5 muc — `GET /laws/australia/topics`, `?topic=<slug>`

Nguon KHONG co truong chu de, nen 5 muc do Be.Travel TUYEN CHON THU CONG (backend/src/core/auLawTopics.js),
moi ma van ban da doi chieu voi API nguon (17/10/2026). Khong phai danh sach day du, khong phai tu van phap ly.
Mot dao luat co the nam o nhieu muc (vd Migration Act 1958: `cu-tru` va `xuat-nhap-canh`).

| slug | Muc | So van ban |
|---|---|---|
| `giao-thong` | Giao thong | 5 |
| `cu-tru` | Cu tru | 6 |
| `xuat-nhap-canh` | Xuat nhap canh | 5 |
| `hai-quan-hanh-ly` | Hai quan hanh ly | 7 |
| `quyen-loi-khieu-nai` | Quyen loi va khieu nai | 11 |

- `GET /laws/australia/topics` -> `[{ slug, label, note, lawCount }]` (`note` la ghi chu pham vi hien kem muc).
- `GET /laws/australia?topic=<slug>` (va `/search`) loc theo muc; khi co `topic` thi BO QUA `collection`
  (trong mot muc co ca Act lan van ban duoi luat). `topic` ngoai danh sach -> `VALIDATION_ERROR`.
- Moi item danh sach co them `topics: string[]` (rong neu luat khong thuoc muc nao).
- [!] Quy tac giao thong duong bo (toc do, bang lai, muc phat) va luat thue nha do tung bang ban hanh nen KHONG
  co trong nguon lien bang; `note` cua muc tuong ung noi ro dieu nay.

### 24c. Tom luoc noi dung chinh — `GET /laws/australia/:id/summary`

Hai tang, tach bach nguon va AI:
1. **Co nguon, khong qua AI**: `purpose` (tieu de dai cua luat, nguyen van) va `outline` (cac Chuong/Phan, toi da 60 muc,
   `level`: `chapter|part|division`), moi muc co `citationId` tro ve dung doan trong `/content`. Tieng Anh, rut thang tu van ban.
2. **AI dien giai tieng Viet** (`summaryVi: { summary, keyPoints[], aiGenerated:true }`): CHI dua tren `purpose` + `outline`,
   khong doc toan van. Hau kiem bang code: moi con so AI viet ra phai co trong dau vao, neu khong bo ca ban AI. Thu toi da 2 lan.
   Chi luat da tuyen chon (auLawTopics.js) moi goi AI; ket qua cache DB 30 ngay theo `registerId` (bat bien theo ban bien soan).

Ban dich tieng Viet cua cac muc nguon: `purpose.textVi`, `outline[].textVi`, `deepSummary.parts[].headingVi` (chuoi hoac `null`).
Chi doc tu cache ban dich da co (khong goi AI); `null` khi doan chua dich/khong qua hau kiem so lieu, client hien ban goc tieng Anh.

`summaryViStatus`: `ready` | `not_eligible` (luat ngoai danh sach tuyen chon, hoac khong co tieu de/dan y) |
`unavailable` (AI loi/vi pham hau kiem: van tra tang 1, `summaryVi = null`). `disclaimer` luon co mat va phai duoc hien thi.
Loi: `NOT_FOUND` neu ma khong ton tai hoac van ban khong co ban doc duoc (kem `details.officialUrl`).
Tom luoc la cong cu ho tro thong tin, khong thay the tu van phap ly.

### 24d. Dich sang tieng Viet theo yeu cau — `GET /laws/australia/:id/content-vi`

Cung hinh dang voi `/content` nhung moi block them `textVi` (ban dich may, `null` neu doan chua dich/khong qua kiem tra —
client hien ban goc), va co `translationNotice` (PHAI hien thi). Query: `offset` (boi so cua 25), `limit` (<=100, mac dinh 100).
- Dich THEO YEU CAU theo cum 25 doan, cache DB 180 ngay theo `registerId` + cum; chi dich phan nguoi dung dang xem.
- Chi luat da tuyen chon (chi tiet luat co `canTranslate:true`); luat khac -> `FORBIDDEN` kem `details.reason:"NOT_TRANSLATABLE"`.
- Hau kiem tung doan bang code: khong them/bot con so nao (cho phep ten thang -> so thang, cho phep nhac lai ten luat tieng Anh
  trong ngoac). Doan khong dat -> `textVi:null`. Ban dich la dich may, KHONG phai ban dich chinh thuc; ban tieng Anh la chuan.
- Dung model dich rieng (`TRANSLATION_MODEL`), khong dung model chat, de khong tieu han muc cua chat AI.
- `/summary` them `deepStatus`: `ready|generating|not_generated|not_eligible|unavailable` va `deepSummary` (tom tat tung Phan, xem 24c);
  mac dinh KHONG tu sinh (`AU_LAW_DEEP_SUMMARY_AUTOGEN=false`), sinh bang `npm run summarize-au-laws`.

### 24e. Ten tieng Viet cua luat — truong `nameVi`, `nameViSource`

Moi item danh sach (`/laws/australia`, `/search`) va chi tiet (`/laws/australia/:id`) co them:
- `nameVi: string | null` — ten tieng Viet THAM KHAO; `null` neu chua co (client hien ten tieng Anh).
- `nameViSource: "curated" | "machine" | null` — `curated`: 31 luat tuyen chon, ten viet san (backend/src/core/auLawNames.js);
  `machine`: AI dich ten theo lo (mot luot goi cho ca trang), cache DB, tat bang `AU_LAW_TITLE_TRANSLATION=false`.
- Ten chinh thuc la tieng Anh (`name`) va PHAI luon hien thi kem. Ban dich bi loai neu them hoac bot con so (nam, so hieu).
- Dich ten khong lam cham danh sach: cho toi da 8 giay, qua han hoac loi thi `nameVi:null` va viec dich van chay nen de lan sau co san.

### 14c. Tim dia diem theo chu — `GET /api/places/search?q=&country=`

Tim ten/dia chi/khu vuc de ban do bay toi dung cho (Nominatim cua OpenStreetMap, mien phi). Ket qua CHUA xac minh, chi
dung de dinh huong ban do, khong thay the diem ho tro da xac minh. Cong khai, rate limit 90 luot/15 phut/IP.
- Query: `q` (2-120 ky tu, bat buoc), `country` (ISO-2, tuy chon). Co `country` thi tim trong nuoc do truoc, khong co ket
  qua thi tim toan cau; `meta.scope` = `"country"` | `"global"` de client gan nhan.
- `data`: toi da 8 phan tu `{ placeId, name, address, category, location:{type:"Point",coordinates:[lng,lat]}, verified:false,
  source:"openstreetmap" }`. `name` uu tien ten tieng Viet, roi tieng Anh, roi ten ban dia.
- Loi: `VALIDATION_ERROR`, `RATE_LIMITED`, `QUOTA_EXCEEDED` (tran theo ngay `GEOCODE_DAILY_LIMIT`), `UPSTREAM_ERROR`.
- Chinh sach Nominatim: User-Agent nhan dien (`PLACES_USER_AGENT`), toi da 1 yeu cau/giay (server tu gian cach), cache 24 gio.

`GET /support-locations/external` (muc 14b): Overpass nay co may chu du phong (`PLACES_OVERPASS_FALLBACK_URLS`); neu TAT CA that
bai thi dung Nominatim (khong co so dien thoai, gio mo cua) thay vi tra `UPSTREAM_ERROR`.
