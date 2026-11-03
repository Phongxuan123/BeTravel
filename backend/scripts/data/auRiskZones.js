/*
 * Vung nguy co o Uc, xuat ban san de moi nguoi dung chung (npm run seed:au-risk-zones). Quy uoc trung thuc:
 * - Mo ta CHI neu dieu nguon da xac nhan; phan chua xac nhan ghi ro trong description va reviewNote.
 * - source.period ghi ro pham vi/nam cua so lieu va noi no chi la tin bao chi hoac cap bang.
 * - Tam (center) va ban kinh (radiusM) la VE TAY xap xi, KHONG phai ranh gioi chinh thuc.
 * Chua doi chieu duoc bang goc cua CSA/BOCSAR (cac trang nay chan truy cap tu dong): xem reviewNote.
 */
const MELBOURNE_SOURCE = {
  name: "Victoria Police - số liệu Crime Statistics Agency (CSA)",
  url: "https://www.police.vic.gov.au/victoria-police-statement-relation-crime-statistics-agency-data-release",
  period: "Cả bang Victoria, năm tới 6/2025 (chưa có số liệu riêng từng điểm)",
};
const MELBOURNE_DESCRIPTION =
  "Điểm đông du khách ở trung tâm Melbourne. Victoria ghi nhận trộm đồ trong xe tăng mạnh: 86.351 vụ trong năm tới 6/2025, tăng 24.409 vụ (cả bang). Vị trí này do Be.Travel chọn theo nơi đông khách, chưa có số liệu riêng cho từng điểm.";
const MELBOURNE_TIPS = [
  "Không để lại đồ trong xe, kể cả cốp xe và dưới ghế.",
  "Giữ ví và điện thoại ở túi khó với tới ở nơi đông người.",
];
const MELBOURNE_REVIEW_NOTE =
  "Da xac nhan: so lieu cap bang (86.351 vu, +24.409) tu trang Victoria Police. CHUA xac nhan: thu hang cua City of Melbourne va so vu theo tung diem. Doi chieu bang 'LGA Recorded Offences' cua CSA (loc 'Steal from motor vehicle' + 'Melbourne (C)'), roi chinh lai mo ta va period. Tam/ban kinh ve tay.";

export const AU_RISK_ZONES = [
  {
    countryCode: "AU",
    category: "theft",
    name: "Melbourne - Ga Flinders Street và Federation Square",
    description: MELBOURNE_DESCRIPTION,
    severity: "warn",
    center: { type: "Point", coordinates: [144.96775, -37.81825] },
    radiusM: 250,
    tips: MELBOURNE_TIPS,
    source: MELBOURNE_SOURCE,
    reviewNote: MELBOURNE_REVIEW_NOTE,
    status: "published",
  },
  {
    countryCode: "AU",
    category: "theft",
    name: "Melbourne - Bourke Street Mall",
    description: MELBOURNE_DESCRIPTION,
    severity: "warn",
    center: { type: "Point", coordinates: [144.963, -37.8139] },
    radiusM: 200,
    tips: MELBOURNE_TIPS,
    source: MELBOURNE_SOURCE,
    reviewNote: MELBOURNE_REVIEW_NOTE,
    status: "published",
  },
  {
    countryCode: "AU",
    category: "theft",
    name: "Melbourne - Chợ Queen Victoria",
    description: MELBOURNE_DESCRIPTION,
    severity: "warn",
    center: { type: "Point", coordinates: [144.95675, -37.80775] },
    radiusM: 250,
    tips: MELBOURNE_TIPS,
    source: MELBOURNE_SOURCE,
    reviewNote: MELBOURNE_REVIEW_NOTE,
    status: "published",
  },
  {
    countryCode: "AU",
    category: "theft",
    name: "Melbourne - Ga Southern Cross",
    description: MELBOURNE_DESCRIPTION,
    severity: "warn",
    center: { type: "Point", coordinates: [144.9525, -37.81825] },
    radiusM: 170,
    tips: MELBOURNE_TIPS,
    source: MELBOURNE_SOURCE,
    reviewNote: MELBOURNE_REVIEW_NOTE,
    status: "published",
  },
  {
    countryCode: "AU",
    category: "theft",
    name: "Kings Cross - Phố Darlinghurst (Sydney)",
    description:
      "BOCSAR (cơ quan thống kê tội phạm NSW) từng xác định Kings Cross là điểm nóng tội phạm của nội thành Sydney; số vụ trộm và cướp ở đây giảm dần đến năm 2012. Chưa kiểm tra số liệu mới hơn, nên hãy cẩn thận như ở mọi khu giải trí đêm đông người.",
    severity: "warn",
    center: { type: "Point", coordinates: [151.2235, -33.8754] },
    radiusM: 300,
    tips: [
      "Cất điện thoại, ví khi đi bộ buổi tối; tránh dùng điện thoại sát mép đường.",
      "Đi theo nhóm và chọn đường đông người, đủ sáng.",
    ],
    source: {
      name: "NSW BOCSAR - xu hướng tội phạm Kings Cross",
      url: "https://bocsar.nsw.gov.au/research-evaluations/2013/bb90-trends-in-property-and-illicit-drug-crime-kings-cross.html",
      period: "1999-2012 (cũ, chưa có số liệu mới hơn)",
    },
    reviewNote:
      "Chi xac nhan qua trich dan tim kiem (trang BOCSAR chan truy cap tu dong): khu vuc tung la diem nong, xu huong giam den 2012. Can doc ban goc va tim so lieu BOCSAR moi nhat. Tam/ban kinh ve tay.",
    status: "published",
  },
  {
    countryCode: "AU",
    category: "wrong_way_driving",
    name: "Great Ocean Road - Ngã giao Princetown (Victoria)",
    description:
      "Cung đường du lịch nhiều khách quốc tế lái xe thuê. Báo chí địa phương ghi nhận một vụ va chạm tại Princetown năm 2019 do tài xế nước ngoài đi sai làn, và 71 vụ có người chết hoặc bị thương nặng trên toàn tuyến từ 11/2014 đến 8/2019. Chưa có số liệu chính thức cho thấy tài xế nước ngoài nguy hiểm hơn.",
    severity: "warn",
    center: { type: "Point", coordinates: [143.166, -38.717] },
    radiusM: 800,
    tips: [
      "Úc lái xe bên TRÁI; sau mỗi lần dừng nghỉ hãy nhắc lại làn đường.",
      "Không lái khi mệt; dừng ở điểm nghỉ thay vì cố đi tiếp.",
    ],
    source: {
      name: "Geelong Independent / Standard (tin địa phương)",
      url: "https://geelongindy.com.au/news/05-07-2019/foreigner-crashes-still-high-on-gor",
      period: "2014-2019 (tin báo chí, chưa có số liệu chính thức)",
    },
    reviewNote:
      "Chi xac nhan qua trich dan tim kiem (trang bao chan truy cap tu dong). Con so ~20% cua chinh tri gia bi chinh quyen phan bac vi khong co du lieu luu luong tai xe. Can so lieu TAC/Transport Victoria; ve lai vung theo tuyen duong. Tam/ban kinh ve tay.",
    status: "published",
  },
];

// Vung ban dau ve qua rong: seed chuyen ve 'draft' de khong con hien tren ban do (khong xoa du lieu).
export const RETIRED_AU_RISK_ZONE_NAMES = [
  "Trung tâm Melbourne (CBD)",
  "Kings Cross - Darlinghurst (Sydney)",
  "Great Ocean Road - khu Princetown (Victoria)",
];
