import type { Incident } from '../schemas';

// order/contactRefs/articleRefs/ctas la field mo rong cho B7 -- gan mock id
// on dinh (mock-incident-N) de man hinh tien do (AsyncStorage o mock) hoat
// dong dung nhu API that.
export const incidents: Incident[] = [
  {
    __mock: true,
    _id: 'mock-incident-1',
    slug: 'mat-ho-chieu',
    countryCode: null,
    title: 'Mất hộ chiếu',
    iconKey: 'IdCard',
    tone: 'red',
    urgent: true,
    reassurance:
      'Giữ bình tĩnh. Bạn vẫn được rời Nhật Bản hợp pháp bằng giấy thông hành do Đại sứ quán cấp.',
    steps: [
      {
        order: 0,
        title: 'Trình báo tại đồn cảnh sát',
        body: [
          'Đến đồn gần nhất, xin giấy xác nhận mất giấy tờ (遺失届受理番号).',
          'Giữ số hồ sơ — Đại sứ quán sẽ yêu cầu số này.',
        ],
        ctas: [{ type: 'map', label: 'Đồn công an gần nhất', payload: { locationType: 'police' } }],
      },
      {
        order: 1,
        title: 'Liên hệ Đại sứ quán Việt Nam',
        body: ['Gọi trong giờ hành chính, mang theo giấy xác nhận của cảnh sát.'],
        ctas: [{ type: 'call', label: 'Gọi Đại sứ quán', payload: {} }],
      },
      {
        order: 2,
        title: 'Chuẩn bị giấy tờ',
        body: [],
        checklist: [
          { label: 'Ảnh 4×6 nền trắng (2 tấm)' },
          { label: 'Bản sao hộ chiếu hoặc ảnh chụp trang thông tin' },
          { label: 'Vé máy bay hoặc lịch trình về nước' },
        ],
      },
      {
        order: 3,
        title: 'Nhận giấy thông hành',
        body: ['Thường mất 1 – 3 ngày làm việc. Dùng giấy này để về Việt Nam.'],
      },
    ],
  },
  {
    __mock: true,
    _id: 'mock-incident-2',
    slug: 'bi-canh-sat-kiem-tra-giay-to',
    countryCode: null,
    title: 'Bị cảnh sát kiểm tra giấy tờ',
    iconKey: 'ShieldAlert',
    tone: 'blue',
    urgent: false,
    reassurance: 'Đây là việc kiểm tra thông thường. Hợp tác xuất trình giấy tờ để tránh rắc rối không cần thiết.',
    steps: [
      { order: 0, title: 'Giữ bình tĩnh, xuất trình giấy tờ', body: ['Đưa hộ chiếu hoặc thẻ lưu trú khi được yêu cầu.'] },
      { order: 1, title: 'Hỏi lý do kiểm tra', body: ['Bạn có quyền hỏi lý do một cách lịch sự.'] },
      { order: 2, title: 'Ghi nhớ tên đồn, số hiệu cảnh sát', body: ['Dùng nếu cần khiếu nại sau này.'] },
    ],
  },
  {
    __mock: true,
    _id: 'mock-incident-3',
    slug: 'tai-nan-giao-thong',
    countryCode: null,
    title: 'Tai nạn giao thông',
    iconKey: 'Car',
    tone: 'orange',
    urgent: true,
    reassurance: 'Ưu tiên an toàn tính mạng trước — gọi cấp cứu 119 nếu có người bị thương.',
    steps: [
      { order: 0, title: 'Gọi cấp cứu và cảnh sát', body: ['Cứu thương 119, cảnh sát 110 nếu có va chạm.'] },
      { order: 1, title: 'Không rời khỏi hiện trường', body: ['Rời hiện trường trước khi cảnh sát đến có thể bị coi là bỏ trốn.'] },
      { order: 2, title: 'Chụp ảnh hiện trường', body: ['Ghi lại biển số, vị trí, tình trạng phương tiện.'] },
      { order: 3, title: 'Lấy thông tin liên hệ', body: ['Trao đổi thông tin bảo hiểm với bên còn lại.'] },
      { order: 4, title: 'Báo bảo hiểm du lịch', body: ['Liên hệ công ty bảo hiểm để được hướng dẫn tiếp.'] },
    ],
  },
  {
    __mock: true,
    _id: 'mock-incident-4',
    slug: 'mat-do-hoac-bi-trom-cap',
    countryCode: null,
    title: 'Mất đồ hoặc bị trộm cắp',
    iconKey: 'ShoppingBag',
    tone: 'blue',
    urgent: false,
    reassurance: 'Trình báo sớm giúp tăng khả năng tìm lại đồ và cần thiết cho yêu cầu bảo hiểm.',
    steps: [
      { order: 0, title: 'Trình báo tại đồn cảnh sát gần nhất', body: ['Xin giấy xác nhận mất đồ (rieki todoke).'] },
      { order: 1, title: 'Khoá thẻ ngân hàng nếu mất ví', body: ['Gọi ngân hàng để khoá thẻ ngay lập tức.'] },
      { order: 2, title: 'Liên hệ nơi lưu trú', body: ['Hỏi camera an ninh nếu mất đồ tại khách sạn.'] },
      { order: 3, title: 'Báo bảo hiểm du lịch', body: ['Chuẩn bị giấy xác nhận của cảnh sát để yêu cầu bồi thường.'] },
    ],
  },
  {
    __mock: true,
    _id: 'mock-incident-5',
    slug: 'can-ho-tro-y-te',
    countryCode: null,
    title: 'Cần hỗ trợ y tế',
    iconKey: 'Plus',
    tone: 'green',
    urgent: false,
    reassurance: 'Gọi 119 cho tình huống khẩn cấp; các trường hợp nhẹ có thể tới phòng khám gần nhất.',
    steps: [
      { order: 0, title: 'Đánh giá mức độ khẩn cấp', body: ['Gọi 119 nếu nguy hiểm tính mạng.'] },
      { order: 1, title: 'Tìm bệnh viện có tiếng Anh', body: ['Dùng SOS Map để tìm cơ sở y tế gần bạn.'], ctas: [{ type: 'map', label: 'Bệnh viện gần nhất', payload: { locationType: 'hospital' } }] },
      { order: 2, title: 'Mang theo bảo hiểm du lịch', body: ['Giữ giấy tờ bảo hiểm để làm thủ tục thanh toán.'] },
    ],
  },
  {
    __mock: true,
    _id: 'mock-incident-6',
    slug: 'bi-tam-giu-hoac-bat-giu',
    countryCode: null,
    title: 'Bị tạm giữ hoặc bắt giữ',
    iconKey: 'Siren',
    tone: 'red',
    urgent: true,
    reassurance: 'Bạn có quyền yêu cầu liên hệ Đại sứ quán. Không ký giấy tờ tiếng Nhật nếu chưa hiểu rõ nội dung.',
    steps: [
      { order: 0, title: 'Yêu cầu liên hệ Đại sứ quán Việt Nam', body: ['Đây là quyền của công dân Việt Nam ở nước ngoài.'], ctas: [{ type: 'call', label: 'Gọi Đại sứ quán', payload: {} }] },
      { order: 1, title: 'Không ký giấy tờ khi chưa hiểu', body: ['Yêu cầu phiên dịch nếu cần thiết.'] },
      { order: 2, title: 'Ghi nhớ thông tin vụ việc', body: ['Tên đồn, số hồ sơ, tên cán bộ xử lý.'] },
      { order: 3, title: 'Liên hệ luật sư nếu cần', body: ['Đại sứ quán có thể cung cấp danh sách luật sư hỗ trợ.'] },
      { order: 4, title: 'Thông báo cho người thân', body: ['Dùng quyền gọi điện nếu được cho phép.'] },
    ],
  },
];

export function getIncidentBySlug(slug: string) {
  return incidents.find((i) => i.slug === slug);
}
