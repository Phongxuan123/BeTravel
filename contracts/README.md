# BE.TRAVEL — CONTRACT API

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

`forgot-password` va `resend-reset-otp` luon bao thanh cong du email co ton tai hay khong —
co y, de khong ro ri danh sach email dang ky.

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

★ **Chong ghi de**: `PATCH` phai kem `updatedAt` cua ban dang xem. Khac voi
`updatedAt` hien co trong DB --> `409 CONFLICT`, `details: {updatedBy, updatedAt}`
la trang thai hien hanh de client tai lai.

★ **May trang thai** qua `POST .../status`:
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
GET /countries              200, tra CA active lan coming_soon kem articleCount
GET /countries/:code        200, hoac 404 NOT_FOUND
```

`status: 'coming_soon'` nghia la da co du lieu trong DB nhung chua mo cho
nguoi dung — client phai TU hien trang thai ro rang (vi du "Sap ra mat"),
KHONG bia noi dung, khong loi.

### 8.2. Legal content

```
GET /legal/topics?country=KR                          200, kem articleCount/chu de
GET /legal/articles?country=KR&topic=&page=&limit=     200, meta {page,limit,total}
GET /legal/articles/:country/:slug                     200 kem relatedArticles
                                                         (toi da 4, cung topic),
                                                         hoac 404 neu chua publish
GET /legal/search?q=&country=KR&topic=&page=           200, meta {page,limit,total}
```

★ **Tim khong dau**: `q` duoc tach tung tu, moi tu phai xuat hien o
`titleNorm` hoac `summaryNorm` (da bo dau + lowercase, tu dong tinh lai moi
lan luu bai — xem `LegalArticle.js` hook `pre('save')`). "phat vape" khop
"Muc phat ... (vape)" du hai tu khong lien tiep.

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

★ **Chi 1 `isCurrent:true` moi user tai mot thoi diem** — ep bang partial
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
POST   /chat/sessions/:id/messages {question, focusArticleId?}  201 { sessionId, message } --
                                                      ★ TRA MOT LAN, KHONG STREAMING (master plan B.7).
                                                      focusArticleId (B5): CTA "Hoi AI ve bai nay" tu man
                                                      hinh chi tiet bai luat -- uu tien chunk cua bai do
                                                      trong RRF (xem rag/retrieval.js FOCUS_ARTICLE_WEIGHT).
POST   /chat/sessions/:id/messages/:messageId/feedback {feedback:'up'|'down'}  200
```

`message` (role='assistant') co dang:
```jsonc
{
  "text": "cau tra loi da qua guard.js, kem [S1][S2]... va disclaimer",
  "citations": [{ "marker":"S1", "articleId", "articleSlug", "title", "heading" }],
  "retrieval": { "topScore": 0.63, "chunkIds": [...], "passed": true },
  "fallbackReason": null,  // hoac "INSUFFICIENT_EVIDENCE" | "GUARD_REJECTED" | "PROVIDER_ERROR"
  "confidence": "medium",
  "needsOfficialHelp": false
}
```

★ **Cau hoi nhac ten mot quoc gia KHAC voi `countryCode` cua session** duoc
chan o tang service (`chat.service.js#detectOtherCountryMention`) TRUOC ca
retrieval -- tra loi co dinh moi nguoi dung doi quoc gia, khong bao gio de
LLM tu quyet dinh (deterministic, khong ton chi phi goi LLM).

★ **Quota 2 lop** (CLAUDE.md muc 4.1): `express-rate-limit` RAM (20
req/15p/IP, lop 1) + quota luu DB `users.aiUsage` theo ngay (`AI_DAILY_QUOTA_USER`,
mac dinh 40/ngay/user; van an toan he thong `AI_DAILY_QUOTA_GLOBAL`, mac dinh
800/ngay) -- vuot quota --> `429 QUOTA_EXCEEDED`. Day la lop THAT SU bao ve
chi phi vi khong reset khi server restart.

## 10. ENDPOINT ADMIN RAG — `/api/admin/rag/*` (B4, role admin)

```
GET  /admin/rag/status?countryCode=            200, trang thai index tung bai published+isCurrent
POST /admin/rag/reindex-country {countryCode}   200 { queued: N }, xep lai job reindex_article
```

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

★ Feedback KHONG tu dong sua knowledge base -- doi trang thai chi de theo doi,
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
  "costEstimateUsd": 0,  // ★ luon 0 -- provider Gemini/OpenAI chua tra usage tokens, xem docs/PROGRESS.md muc "No ky thuat"
  "pendingFeedbackCount": 3,
  "topFallbackQuestions": [{ "question": "...", "count": 4 }]
}
```

## 14. ENDPOINT SOS LOCATIONS CONG KHAI — `/api/support-locations/*` (B6)

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

## 15. ENDPOINT ADMIN LOCATIONS BULK — `/api/admin/locations/bulk-*` (B6, role admin)

```
POST /admin/locations/bulk-import {rows:[LocationInput...]}   200
     { createdCount, createdIds, skipped:[{index,name,reason}] } --
     ★ moi dong xu ly DOC LAP, dong loi bi bo qua kem ly do thay vi lam hong
       ca file (Rule 7 -- khong "tat ca hoac khong gi" voi du lieu nguoi go tay).
POST /admin/locations/bulk-verify {ids:[...]}   200 { verifiedCount }
```

★ Validate khi tao/sua 1 diem (khong ap dung cho tung dong bulk-import, xem tren):
`name` + `address` bat buoc, toa do phai hop le (lat [-90,90], lng [-180,180]),
va can IT NHAT 1 trong 2: `phone` hoac `website` -- diem chi co ten+dia chi
khong "Goi ngay" duoc, giam gia tri tinh nang SOS.
