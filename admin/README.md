# Be.Travel Admin Portal

SPA quản trị nội dung pháp lý, quốc gia, chủ đề, điểm hỗ trợ SOS và nhật ký thao tác.
Vite + React 19 + TypeScript + Tailwind v4 + React Router + TanStack Query.

Dự án npm **độc lập**, không dùng npm workspaces với `backend/` hay `mobile/` (xem `CLAUDE.md` gốc repo).

## Chạy dev

```bash
cp .env.example .env    # sửa VITE_API_BASE_URL nếu backend không chạy ở localhost:3000
npm install
npm run dev              # http://localhost:5173
```

Cần `backend/` đang chạy (`npm run dev` ở `backend/`) và một tài khoản admin:

```bash
cd ../backend
npm run create-admin -- --email admin@example.com --password MatKhau123
```

## Lệnh

```bash
npm run dev         # dev server
npm run build        # tsc -b + vite build -> dist/
npm run typecheck    # tsc -b --noEmit
npm run test          # vitest run -- đối chiếu contracts/fixtures/
npm run lint          # oxlint
npm run preview       # xem thử bản build
```

## Cấu trúc

```
src/
├─ lib/
│  ├─ apiClient.ts     fetch wrapper hiểu envelope {ok,data}, tự refresh khi 401
│  ├─ auth.ts          login/logout/restoreSession
│  ├─ authContext.tsx  React context bọc trạng thái đăng nhập
│  ├─ api.ts           các hàm gọi /api/admin/* (countries, topics, articles, locations, audit, dashboard)
│  ├─ resource.ts       factory CRUD dùng chung cho Country/Topic/Location
│  ├─ types.ts          type khớp 1-1 với backend/src/models/*.js
│  └─ schemas.ts        Zod schema đối chiếu contracts/fixtures/ (chỉ dùng ở test)
├─ components/
│  ├─ Layout.tsx, ProtectedRoute.tsx, MapPicker.tsx
│  ├─ ui/               Button, Field, Table, Modal, Badge, Pagination...
│  └─ article-editor/   SourcesEditor, KeyPointsEditor, PenaltiesEditor, StatusBar
└─ pages/                một file mỗi màn hình (Dashboard, Countries, Topics, Articles, ArticleEditor, Locations, Audit)
```

## Ghi chú vận hành

- **Auth**: đăng nhập dùng chung `/api/auth/login` với mobile. Chỉ tài khoản `role: 'admin'` được vào — kiểm ở
  cả client (trải nghiệm) lẫn backend (`requireRole('admin')`, đây mới là lớp bảo vệ thật).
- **Refresh token**: đọc/ghi cả cookie (nếu `AUTH_TRANSPORT` backend có `cookie`) lẫn `localStorage` (nếu có
  `body`) — chạy đúng bất kể backend đang cấu hình `AUTH_TRANSPORT` là gì.
- **Bản đồ điểm hỗ trợ**: Leaflet + OpenStreetMap, click để đặt marker. Không dùng Google Places API.
  Trang `LocationsPage` được code-split (`React.lazy`) vì kéo theo ~150kB Leaflet.
- **Soạn bài luật**: tự động lưu nháp vào `localStorage` mỗi 10 giây (khoá theo id bài, hoặc `new`).
- **Optimistic concurrency**: sửa bài luật bắt buộc gửi kèm `updatedAt` đang xem; backend từ chối nếu ai đó
  đã sửa trước — xem `articlesApi.update` trong `lib/api.ts`.
