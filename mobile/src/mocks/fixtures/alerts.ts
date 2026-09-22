import type { Alert } from '../schemas';

export const alerts: Alert[] = [
  {
    __mock: true,
    id: 'al1',
    category: 'safety',
    title: 'Cảnh báo an ninh khu Kabukicho',
    body: 'Tránh khu vực này sau 23h. Có báo cáo về mời chào và lừa đảo nhắm vào du khách.',
    meta: 'Shinjuku · 2 giờ trước',
    read: false,
    createdAt: '2026-09-21T08:00:00',
  },
  {
    __mock: true,
    id: 'al2',
    category: 'legal',
    title: 'Bạn đang ở khu cấm hút thuốc',
    body: 'Toàn bộ quận Shinjuku cấm hút thuốc trên phố. Mức phạt đến 50.000 ¥.',
    meta: 'Theo vị trí · 5 giờ trước',
    read: false,
    createdAt: '2026-09-21T05:00:00',
  },
  {
    __mock: true,
    id: 'al3',
    category: 'legal',
    title: 'Cập nhật quy định visa quá cảnh',
    body: 'Thời gian quá cảnh miễn visa tăng lên 96 giờ từ 01/10/2026.',
    meta: 'Nhật Bản · 3 ngày trước',
    read: true,
    createdAt: '2026-09-18T09:00:00',
  },
  {
    __mock: true,
    id: 'al4',
    category: 'trip',
    title: 'Chuyến đi Singapore sắp bắt đầu',
    body: 'Tải trước cẩm nang pháp luật Singapore để dùng khi không có mạng.',
    meta: '5 ngày trước',
    read: true,
    createdAt: '2026-09-16T09:00:00',
  },
];
