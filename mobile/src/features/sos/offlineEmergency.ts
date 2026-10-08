/*
 * Số khẩn cấp đóng gói sẵn trong app (quyết định D4 ngày 08/10/2026): dùng khi mở app lần đầu
 * lúc không có mạng, chưa tải được dữ liệu quốc gia. Đây là DỮ LIỆU theo mã quốc gia, không
 * phải logic riêng cho một nước -- mở nước mới thì thêm một mục sau khi có người xác minh.
 *
 * Chỉ ghi số đã đối chiếu nguồn chính thức. Đường dây bảo hộ công dân 24/7 chưa xác minh nên
 * không đưa vào. Đổi số --> cập nhật `checkedAt` và nguồn.
 */
export type OfflineEmergencyEntry = {
  countryCode: string;
  countryName: string;
  numbers: { label: string; phone: string }[];
  embassy: { name: string; phone: string; address: string };
  sources: string[];
  checkedAt: string;
};

export const OFFLINE_EMERGENCY: OfflineEmergencyEntry[] = [
  {
    countryCode: 'KR',
    countryName: 'Hàn Quốc',
    numbers: [
      { label: 'Cảnh sát', phone: '112' },
      { label: 'Cấp cứu, cứu hoả, cứu hộ', phone: '119' },
      { label: 'Tai nạn trên biển', phone: '122' },
    ],
    embassy: {
      name: 'Đại sứ quán Việt Nam tại Hàn Quốc',
      phone: '+82-2-720-5124',
      address: '123 Bukchon-ro, Jongno-gu, Seoul (03052)',
    },
    sources: [
      'https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=3&cnpClsNo=1&csmSeq=1702&popMenu=ov',
      'https://vnembassy-seoul.mofa.gov.vn/lien-he',
    ],
    checkedAt: '2026-10-08',
  },
];
