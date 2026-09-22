import type { Incident } from '../schemas';

export const incidents: Incident[] = [
  {
    __mock: true,
    slug: 'mat-ho-chieu',
    title: 'Mất hộ chiếu',
    iconKey: 'IdCard',
    tone: 'red',
    urgent: true,
    reassurance:
      'Giữ bình tĩnh. Bạn vẫn được rời Nhật Bản hợp pháp bằng giấy thông hành do Đại sứ quán cấp.',
    steps: [
      {
        title: 'Trình báo tại đồn cảnh sát',
        body: [
          'Đến đồn gần nhất, xin giấy xác nhận mất giấy tờ (遺失届受理番号).',
          'Giữ số hồ sơ — Đại sứ quán sẽ yêu cầu số này.',
        ],
      },
      {
        title: 'Liên hệ Đại sứ quán Việt Nam',
        body: ['Gọi trong giờ hành chính, mang theo giấy xác nhận của cảnh sát.'],
      },
      {
        title: 'Chuẩn bị giấy tờ',
        body: [],
        checklist: [
          { label: 'Ảnh 4×6 nền trắng (2 tấm)', checked: true },
          { label: 'Bản sao hộ chiếu hoặc ảnh chụp trang thông tin', checked: true },
          { label: 'Vé máy bay hoặc lịch trình về nước', checked: false },
        ],
      },
      {
        title: 'Nhận giấy thông hành',
        body: ['Thường mất 1 – 3 ngày làm việc. Dùng giấy này để về Việt Nam.'],
      },
    ],
  },
  {
    __mock: true,
    slug: 'bi-canh-sat-kiem-tra-giay-to',
    title: 'Bị cảnh sát kiểm tra giấy tờ',
    iconKey: 'ShieldAlert',
    tone: 'blue',
    urgent: false,
    reassurance: 'Đây là việc kiểm tra thông thường. Hợp tác xuất trình giấy tờ để tránh rắc rối không cần thiết.',
    steps: [
      { title: 'Giữ bình tĩnh, xuất trình giấy tờ', body: ['Đưa hộ chiếu hoặc thẻ lưu trú khi được yêu cầu.'] },
      { title: 'Hỏi lý do kiểm tra', body: ['Bạn có quyền hỏi lý do một cách lịch sự.'] },
      { title: 'Ghi nhớ tên đồn, số hiệu cảnh sát', body: ['Dùng nếu cần khiếu nại sau này.'] },
    ],
  },
  {
    __mock: true,
    slug: 'tai-nan-giao-thong',
    title: 'Tai nạn giao thông',
    iconKey: 'Car',
    tone: 'orange',
    urgent: true,
    reassurance: 'Ưu tiên an toàn tính mạng trước — gọi cấp cứu 119 nếu có người bị thương.',
    steps: [
      { title: 'Gọi cấp cứu và cảnh sát', body: ['Cứu thương 119, cảnh sát 110 nếu có va chạm.'] },
      { title: 'Không rời khỏi hiện trường', body: ['Rời hiện trường trước khi cảnh sát đến có thể bị coi là bỏ trốn.'] },
      { title: 'Chụp ảnh hiện trường', body: ['Ghi lại biển số, vị trí, tình trạng phương tiện.'] },
      { title: 'Lấy thông tin liên hệ', body: ['Trao đổi thông tin bảo hiểm với bên còn lại.'] },
      { title: 'Báo bảo hiểm du lịch', body: ['Liên hệ công ty bảo hiểm để được hướng dẫn tiếp.'] },
    ],
  },
  {
    __mock: true,
    slug: 'mat-do-hoac-bi-trom-cap',
    title: 'Mất đồ hoặc bị trộm cắp',
    iconKey: 'ShoppingBag',
    tone: 'blue',
    urgent: false,
    reassurance: 'Trình báo sớm giúp tăng khả năng tìm lại đồ và cần thiết cho yêu cầu bảo hiểm.',
    steps: [
      { title: 'Trình báo tại đồn cảnh sát gần nhất', body: ['Xin giấy xác nhận mất đồ (rieki todoke).'] },
      { title: 'Khoá thẻ ngân hàng nếu mất ví', body: ['Gọi ngân hàng để khoá thẻ ngay lập tức.'] },
      { title: 'Liên hệ nơi lưu trú', body: ['Hỏi camera an ninh nếu mất đồ tại khách sạn.'] },
      { title: 'Báo bảo hiểm du lịch', body: ['Chuẩn bị giấy xác nhận của cảnh sát để yêu cầu bồi thường.'] },
    ],
  },
  {
    __mock: true,
    slug: 'can-ho-tro-y-te',
    title: 'Cần hỗ trợ y tế',
    iconKey: 'Plus',
    tone: 'green',
    urgent: false,
    reassurance: 'Gọi 119 cho tình huống khẩn cấp; các trường hợp nhẹ có thể tới phòng khám gần nhất.',
    steps: [
      { title: 'Đánh giá mức độ khẩn cấp', body: ['Gọi 119 nếu nguy hiểm tính mạng.'] },
      { title: 'Tìm bệnh viện có tiếng Anh', body: ['Dùng SOS Map để tìm cơ sở y tế gần bạn.'] },
      { title: 'Mang theo bảo hiểm du lịch', body: ['Giữ giấy tờ bảo hiểm để làm thủ tục thanh toán.'] },
    ],
  },
  {
    __mock: true,
    slug: 'bi-tam-giu-hoac-bat-giu',
    title: 'Bị tạm giữ hoặc bắt giữ',
    iconKey: 'Siren',
    tone: 'red',
    urgent: true,
    reassurance: 'Bạn có quyền yêu cầu liên hệ Đại sứ quán. Không ký giấy tờ tiếng Nhật nếu chưa hiểu rõ nội dung.',
    steps: [
      { title: 'Yêu cầu liên hệ Đại sứ quán Việt Nam', body: ['Đây là quyền của công dân Việt Nam ở nước ngoài.'] },
      { title: 'Không ký giấy tờ khi chưa hiểu', body: ['Yêu cầu phiên dịch nếu cần thiết.'] },
      { title: 'Ghi nhớ thông tin vụ việc', body: ['Tên đồn, số hồ sơ, tên cán bộ xử lý.'] },
      { title: 'Liên hệ luật sư nếu cần', body: ['Đại sứ quán có thể cung cấp danh sách luật sư hỗ trợ.'] },
      { title: 'Thông báo cho người thân', body: ['Dùng quyền gọi điện nếu được cho phép.'] },
    ],
  },
];

export function getIncidentBySlug(slug: string) {
  return incidents.find((i) => i.slug === slug);
}
