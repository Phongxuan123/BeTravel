/*
 * Vung nguy co o Uc -- TAT CA de 'draft'. Tam (center) va ban kinh (radiusM) la VE TAY xap xi tren ban do, CHUA doi chieu
 * ranh gioi chinh thuc (khong phai so lieu luat); phan so lieu chi ghi nhung gi nguon da neu. Admin phai doi chieu
 * nguon goc, dien source.period roi moi publish (validator chan publish neu thieu nguon). Khong bia so lieu: cho nao
 * nguon chua du thi ghi ro trong reviewNote.
 */
export const AU_RISK_ZONES = [
  {
    countryCode: "AU",
    category: "theft",
    name: "Melbourne - Ga Flinders Street và Federation Square",
    description:
      "Điểm đông du khách trong khu City of Melbourne, nơi có số vụ trộm đồ trong xe thuộc nhóm cao nhất bang Victoria theo Crime Statistics Agency.",
    severity: "warn",
    center: { type: "Point", coordinates: [144.96775, -37.81825] },
    radiusM: 250,
    tips: [
      "Không để lại đồ trong xe, kể cả cốp xe và dưới ghế.",
      "Giữ ví và điện thoại ở túi khó với tới ở nơi đông người.",
    ],
    source: {
      name: "Crime Statistics Agency Victoria",
      url: "https://www.crimestatistics.vic.gov.au/crime-statistics/latest-victorian-crime-data",
      period: "",
    },
    reviewNote:
      "Pham vi thanh pho Melbourne co so vu trom cao theo CSA (con so 5.448 vu nam toi 3/2026 lay tu trang ben thu ba, chua doi chieu). DIEM NHO nay do nguoi viet chon theo noi dong khach, KHONG co so lieu theo tung diem; tam va ban kinh ve tay xap xi. Can doi chieu va dien source.period.",
    status: "draft",
  },
  {
    countryCode: "AU",
    category: "theft",
    name: "Melbourne - Bourke Street Mall",
    description:
      "Điểm đông du khách trong khu City of Melbourne, nơi có số vụ trộm đồ trong xe thuộc nhóm cao nhất bang Victoria theo Crime Statistics Agency.",
    severity: "warn",
    center: { type: "Point", coordinates: [144.963, -37.8139] },
    radiusM: 200,
    tips: [
      "Không để lại đồ trong xe, kể cả cốp xe và dưới ghế.",
      "Giữ ví và điện thoại ở túi khó với tới ở nơi đông người.",
    ],
    source: {
      name: "Crime Statistics Agency Victoria",
      url: "https://www.crimestatistics.vic.gov.au/crime-statistics/latest-victorian-crime-data",
      period: "",
    },
    reviewNote:
      "Pham vi thanh pho Melbourne co so vu trom cao theo CSA (con so 5.448 vu nam toi 3/2026 lay tu trang ben thu ba, chua doi chieu). DIEM NHO nay do nguoi viet chon theo noi dong khach, KHONG co so lieu theo tung diem; tam va ban kinh ve tay xap xi. Can doi chieu va dien source.period.",
    status: "draft",
  },
  {
    countryCode: "AU",
    category: "theft",
    name: "Melbourne - Chợ Queen Victoria",
    description:
      "Điểm đông du khách trong khu City of Melbourne, nơi có số vụ trộm đồ trong xe thuộc nhóm cao nhất bang Victoria theo Crime Statistics Agency.",
    severity: "warn",
    center: { type: "Point", coordinates: [144.95675, -37.80775] },
    radiusM: 250,
    tips: [
      "Không để lại đồ trong xe, kể cả cốp xe và dưới ghế.",
      "Giữ ví và điện thoại ở túi khó với tới ở nơi đông người.",
    ],
    source: {
      name: "Crime Statistics Agency Victoria",
      url: "https://www.crimestatistics.vic.gov.au/crime-statistics/latest-victorian-crime-data",
      period: "",
    },
    reviewNote:
      "Pham vi thanh pho Melbourne co so vu trom cao theo CSA (con so 5.448 vu nam toi 3/2026 lay tu trang ben thu ba, chua doi chieu). DIEM NHO nay do nguoi viet chon theo noi dong khach, KHONG co so lieu theo tung diem; tam va ban kinh ve tay xap xi. Can doi chieu va dien source.period.",
    status: "draft",
  },
  {
    countryCode: "AU",
    category: "theft",
    name: "Melbourne - Ga Southern Cross",
    description:
      "Điểm đông du khách trong khu City of Melbourne, nơi có số vụ trộm đồ trong xe thuộc nhóm cao nhất bang Victoria theo Crime Statistics Agency.",
    severity: "warn",
    center: { type: "Point", coordinates: [144.9525, -37.81825] },
    radiusM: 170,
    tips: [
      "Không để lại đồ trong xe, kể cả cốp xe và dưới ghế.",
      "Giữ ví và điện thoại ở túi khó với tới ở nơi đông người.",
    ],
    source: {
      name: "Crime Statistics Agency Victoria",
      url: "https://www.crimestatistics.vic.gov.au/crime-statistics/latest-victorian-crime-data",
      period: "",
    },
    reviewNote:
      "Pham vi thanh pho Melbourne co so vu trom cao theo CSA (con so 5.448 vu nam toi 3/2026 lay tu trang ben thu ba, chua doi chieu). DIEM NHO nay do nguoi viet chon theo noi dong khach, KHONG co so lieu theo tung diem; tam va ban kinh ve tay xap xi. Can doi chieu va dien source.period.",
    status: "draft",
  },
  {
    countryCode: "AU",
    category: "theft",
    name: "Kings Cross - Phố Darlinghurst (Sydney)",
    description:
      "BOCSAR (NSW) từng xác định Kings Cross và Darlinghurst Road là điểm tập trung tội phạm tài sản và hành hung của nội thành Sydney.",
    severity: "warn",
    center: { type: "Point", coordinates: [151.2235, -33.8754] },
    radiusM: 300,
    tips: [
      "Cất điện thoại, ví khi đi bộ buổi tối; tránh dùng điện thoại sát mép đường.",
      "Đi theo nhóm và chọn đường đông người, đủ sáng.",
    ],
    source: {
      name: "NSW BOCSAR - Kings Cross crime trends",
      url: "https://bocsar.nsw.gov.au/research-evaluations/2013/bb90-trends-in-property-and-illicit-drug-crime-kings-cross.html",
      period: "",
    },
    reviewNote:
      "Tam va ban kinh ve tay xap xi, can ve lai theo ban do. Nguon la bao cao 1999-2012 (cu); cho thay xu huong GIAM. Can tim so lieu BOCSAR moi nhat truoc khi publish.",
    status: "draft",
  },
  {
    countryCode: "AU",
    category: "wrong_way_driving",
    name: "Great Ocean Road - Ngã giao Princetown (Victoria)",
    description:
      "Cung đường du lịch nhiều khách quốc tế lái xe thuê. Báo chí địa phương ghi nhận va chạm do tài xế nước ngoài đi sai làn tại Princetown (2019).",
    severity: "warn",
    center: { type: "Point", coordinates: [143.166, -38.717] },
    radiusM: 800,
    tips: [
      "Úc lái xe bên TRÁI; sau mỗi lần dừng nghỉ hãy nhắc lại làn đường.",
      "Không lái khi mệt; dừng ở điểm nghỉ thay vì cố đi tiếp.",
    ],
    source: {
      name: "Geelong Independent / Standard (tin dia phuong)",
      url: "https://geelongindy.com.au/news/05-07-2019/foreigner-crashes-still-high-on-gor",
      period: "",
    },
    reviewNote:
      "Tam va ban kinh ve tay xap xi quanh diem co bao chi neu (Princetown). Nguon la bao chi 2018-2019; chinh quyen noi con so ~20% chi phan anh luong khach dong, khong chung minh loi cua tai xe nuoc ngoai. Can so lieu chinh thuc (TAC/Transport Victoria).",
    status: "draft",
  },
];

// Vung ban dau ve qua rong: seed chuyen ve 'draft' de khong con hien tren ban do (khong xoa du lieu).
export const RETIRED_AU_RISK_ZONE_NAMES = [
  "Trung tâm Melbourne (CBD)",
  "Kings Cross - Darlinghurst (Sydney)",
  "Great Ocean Road - khu Princetown (Victoria)",
];
