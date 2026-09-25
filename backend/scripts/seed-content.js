/*
 * Seed cho B3 + B9: 4 quoc gia, 6 chu de phap ly KR, 8 bai luat KR o trang
 * thai DRAFT co nguon that (xem docs/06_Legal_Content_Seed_KR.md), 1 tai
 * khoan admin, 5 huong dan xu ly su co (toan cuc), 25 cau dich san KR.
 *
 * [!] 8 bai luat la NGUYEN LIEU THO da co nguon -- nguoi that (CPO/nhom noi
 * dung) phai doc lai, doi chieu nguon, viet bodyMd day du va tu chuyen
 * pending_review -> published qua Admin Portal. Script nay KHONG BAO GIO tu
 * dong publish noi dung phap ly.
 *
 * [!] KHONG seed support_locations (diem SOS) hay geo_alerts (canh bao vi
 * tri) o day -- ca hai deu la du lieu AN TOAN THOI GIAN THUC (toa do GPS da
 * xac minh, tinh hinh an ninh hien tai) ma AI khong duoc phep bia (CLAUDE.md
 * "8 bai co nguon that tot hon 20 bai bia nguon", ap dung nguyen quyet dinh
 * da chot o B6). Nguoi phu trach nhap qua Admin Portal ("Diem ho tro" ->
 * "Nhap CSV" da co san, "Canh bao vi tri" -> "Them canh bao" thu cong).
 *
 * Idempotent: chay lai nhieu lan khong tao trung. Neu ban ghi da ton tai,
 * BO QUA (khong ghi de) de khong mat cong suc nguoi dung da chinh sua qua
 * Admin Portal sau lan seed dau.
 *
 * Dung: npm run seed (seed) hoac npm run seed:demo (seed + reindex bai da
 * published -- xem scripts/seed-demo.js).
 */
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";

import { env } from "../src/core/env.js";
import Country from "../src/models/Country.js";
import LegalTopic from "../src/models/LegalTopic.js";
import LegalArticle from "../src/models/LegalArticle.js";
import User from "../src/models/User.js";
import IncidentType from "../src/models/IncidentType.js";
import QuickPhrase from "../src/models/QuickPhrase.js";
import { CountryStatus, ContentStatus, RiskLevel, KeyPointSeverity, UserRole } from "../src/core/constants.js";

export const COUNTRIES = [
  {
    code: "KR",
    name: "Hàn Quốc",
    language: "Tiếng Hàn",
    status: CountryStatus.ACTIVE,
    emergencyNumbers: { police: "112", ambulance: "119", fire: "119", marine: "122" },
    // Nguon: docs/06_Legal_Content_Seed_KR.md bai 8 (Dai su quan VN tai Seoul,
    // trang lien he chinh thuc). KHONG co toa do da kiem chung -- de trong
    // thay vi doan, nhom noi dung bo sung lat/lng that khi ranh.
    embassy: {
      name: "Đại sứ quán Việt Nam tại Hàn Quốc",
      address: "123 Bukchon-ro, Jongno-gu, Seoul (03052), Hàn Quốc",
      phone: "+82-2-720-5510",
    },
  },
  {
    code: "JP",
    name: "Nhật Bản",
    language: "Tiếng Nhật",
    status: CountryStatus.COMING_SOON,
    // So khan cap cong cong, kien thuc pho thong da kiem chung, khong phai
    // du lieu phap ly can nguon rieng.
    emergencyNumbers: { police: "110", ambulance: "119", fire: "119", marine: "118" },
    embassy: {},
  },
  {
    code: "TH",
    name: "Thái Lan",
    language: "Tiếng Thái",
    status: CountryStatus.COMING_SOON,
    emergencyNumbers: { police: "191", ambulance: "1669", fire: "199", marine: "1196" },
    embassy: {},
  },
  {
    code: "SG",
    name: "Singapore",
    language: "Tiếng Anh",
    status: CountryStatus.COMING_SOON,
    emergencyNumbers: { police: "999", ambulance: "995", fire: "995", marine: "999" },
    embassy: {},
  },
];

export const KR_TOPICS = [
  { slug: "nhap-canh", label: "Nhập cảnh", order: 1 },
  { slug: "giao-thong", label: "Giao thông", order: 2 },
  { slug: "hinh-su", label: "Hình sự", order: 3 },
  { slug: "hai-quan", label: "Hải quan", order: 4 },
  { slug: "lao-dong", label: "Lao động", order: 5 },
  { slug: "khan-cap", label: "Khẩn cấp", order: 6 },
];

// Noi dung dich nguyen tu docs/06_Legal_Content_Seed_KR.md -- KHONG duoc tu
// them/bot du lieu phap ly o day, chi duoc sua loi ky thuat khi seed.
// Export de test/golden/kr.golden.test.js tai su dung CHINH noi dung nay lam
// du lieu RAG that (khong bia mot bo du lieu gia lap song song, Rule 3 DRY).
export const KR_ARTICLES = [
  {
    topicSlug: "nhap-canh",
    slug: "visa-nhap-canh",
    title: "Người Việt cần visa để vào Hàn Quốc — không đủ điều kiện dùng K-ETA",
    summaryVi:
      "Công dân Việt Nam KHÔNG nằm trong danh sách miễn thị thực của Hàn Quốc, do đó KHÔNG thể dùng K-ETA (giấy phép du lịch điện tử) để nhập cảnh như công dân một số nước khác. Người Việt đi du lịch/công tác ngắn hạn phải xin visa C-3 (visa ngắn hạn) tại Đại sứ quán/Tổng Lãnh sự quán Hàn Quốc tại Việt Nam trước khi bay.",
    keyPoints: [
      { text: "K-ETA chỉ áp dụng cho công dân các quốc gia đã được Hàn Quốc miễn thị thực (visa waiver) — Việt Nam không thuộc nhóm này.", severity: KeyPointSeverity.NORMAL },
      { text: "Người Việt đi du lịch, thăm thân, công tác ngắn hạn cần visa C-3, xin trước ở Việt Nam.", severity: KeyPointSeverity.NORMAL },
      { text: "Nhầm lẫn K-ETA với visa là lỗi phổ biến khiến bị từ chối nhập cảnh ngay tại sân bay Hàn Quốc.", severity: KeyPointSeverity.CRIMINAL },
    ],
    penalties: [],
    exceptions: [
      "Người có visa dài hạn hợp lệ (du học, lao động E-9, kết hôn...) không cần xin lại C-3 khi đã có visa tương ứng còn hiệu lực.",
    ],
    foreignerNotes: [
      "[secondary] Một số bài blog gọi nhầm K-ETA là 'visa điện tử cho mọi nước' — không đúng với Việt Nam. Cần đối chiếu danh sách quốc gia miễn thị thực mới nhất tại k-eta.go.kr trước khi publish.",
    ],
    sources: [
      { title: "Official Korea Electronic Travel Authorization (K-ETA)", url: "https://www.k-eta.go.kr/", authority: "Korea Immigration Service (법무부 출입국·외국인정책본부)", kind: "gov", accessedAt: "2026-09-22" },
      { title: "South Korea Visa for Vietnamese Citizens: Complete 2026 Guide (C-3 Short-Term)", url: "https://www.mytravelready.ai/blog/vietnam-south-korea-visa-guide-2026", authority: "TravelReady (tổng hợp)", kind: "secondary", accessedAt: "2026-09-22" },
    ],
    effectiveFrom: "2025-01-01",
    riskLevel: RiskLevel.WARN,
    tags: ["visa", "nhap-canh", "k-eta"],
  },
  {
    topicSlug: "nhap-canh",
    slug: "qua-han-luu-tru",
    title: "Mức phạt khi ở quá hạn visa (quá hạn lưu trú) tại Hàn Quốc",
    summaryVi:
      "Luật Kiểm soát Xuất nhập cảnh Hàn Quốc (Immigration Control Act) quy định mức phạt tiền tăng dần theo số ngày/tháng ở lại quá hạn visa, kèm nguy cơ bị trục xuất và cấm nhập cảnh trở lại. Đây là vi phạm rất phổ biến với người Việt đi lao động/du lịch rồi 'ở lại làm thêm'.",
    keyPoints: [
      { text: "Phạt tiền tăng theo thời gian quá hạn, từ khoảng 2 triệu KRW (dưới 1 tháng) đến tối đa khoảng 30 triệu KRW (trên 7 năm).", severity: KeyPointSeverity.CRIMINAL },
      { text: "Ngoài phạt tiền, người quá hạn còn đối mặt lệnh trục xuất và cấm nhập cảnh Hàn Quốc trong một khoảng thời gian.", severity: KeyPointSeverity.CRIMINAL },
      { text: "Có chương trình tự nguyện xuất cảnh (voluntary departure) giúp giảm nhẹ hình phạt nếu chủ động trình báo trước khi bị phát hiện.", severity: KeyPointSeverity.NORMAL },
    ],
    penalties: [
      { behavior: "Quá hạn lưu trú dưới 1 tháng", amountText: "khoảng 2.000.000 KRW", currency: "KRW", note: "[secondary] cần đối chiếu law.go.kr trước khi publish" },
      { behavior: "Quá hạn lưu trú 1–2 năm", amountText: "khoảng 10.000.000 KRW", currency: "KRW", note: "[secondary] cần đối chiếu law.go.kr trước khi publish" },
      { behavior: "Quá hạn lưu trú trên 7 năm", amountText: "khoảng 30.000.000 KRW (mức trần)", currency: "KRW", note: "[secondary] cần đối chiếu law.go.kr trước khi publish" },
    ],
    exceptions: [
      "Chương trình tự nguyện xuất cảnh (2023 Voluntary Departure Program) do Bộ Tư pháp Hàn Quốc công bố có thể giảm nhẹ hình phạt — cần cập nhật điều kiện áp dụng hiện hành.",
    ],
    foreignerNotes: [
      "[!] Bảng mức phạt trong bài này lấy từ trang tổng hợp dịch vụ visa (allvisakorea.com), KHÔNG phải văn bản luật gốc. Trước khi publish, đối chiếu lại với Immigration Act (law.go.kr, Law No. 9142) hoặc Cục Xuất nhập cảnh Hàn Quốc để xác nhận số liệu và số điều khoản chính xác.",
    ],
    sources: [
      { title: "Guide to Immigration Petitions", url: "https://www.immigration.go.kr/bbs/immigration/47/447103/download.do", authority: "Korea Immigration Service", kind: "gov", accessedAt: "2026-09-22" },
      { title: "Ministry of Justice Offers 2023 Voluntary Departure Program", url: "https://www.immigration.go.kr/bbs/immigration_eng/229/458399/download.do", authority: "Bộ Tư pháp Hàn Quốc / Korea Immigration Service", kind: "gov", publishedAt: "2023-01-01", accessedAt: "2026-09-22" },
      { title: "Penalties and Fines for Violation of the Immigration Control Act", url: "https://www.allvisakorea.com/en/post/penalties-and-fines-for-violation-of-the-immigration-control-act", authority: "AllVisaKorea (dịch vụ tư vấn visa tư nhân)", kind: "secondary", accessedAt: "2026-09-22" },
      { title: "IMMIGRATION ACT (영문법령)", url: "https://law.go.kr/LSW/lsInfoP.do?chrClsCd=010203&lsiSeq=90211&viewCls=engLsInfoR&urlMode=engLsInfoR", authority: "Bộ Tư pháp Hàn Quốc — Cổng thông tin pháp luật quốc gia (국가법령정보센터)", kind: "gov", accessedAt: "2026-09-22" },
    ],
    effectiveFrom: "2009-06-20",
    riskLevel: RiskLevel.DANGER,
    tags: ["visa", "qua-han", "truc-xuat"],
  },
  {
    topicSlug: "giao-thong",
    slug: "bang-lai-nuoc-ngoai",
    title: "Dùng bằng lái nước ngoài / bằng lái quốc tế (IDP) để lái xe tại Hàn Quốc",
    summaryVi:
      "Theo Luật Giao thông Đường bộ Hàn Quốc (Road Traffic Act), người nước ngoài được lái xe tại Hàn Quốc tối đa 1 năm kể từ ngày nhập cảnh nếu có Bằng lái quốc tế (IDP) theo Công ước Geneva 1949/Vienna 1968, hoặc bằng lái nước ngoài được công nhận song phương. Lái xe không có bằng hợp lệ là hành vi hình sự, không chỉ là phạt hành chính.",
    keyPoints: [
      { text: "Được lái xe tối đa 1 năm kể từ ngày nhập cảnh với IDP hoặc bằng lái được công nhận song phương (Điều 96(1) Luật Giao thông Đường bộ).", severity: KeyPointSeverity.NORMAL },
      { text: "Lái xe không có bằng lái Hàn Quốc / IDP / bằng công nhận song phương hợp lệ có thể bị phạt tù đến 1 năm hoặc phạt tiền đến 3.000.000 KRW (Điều 152).", severity: KeyPointSeverity.CRIMINAL },
      { text: "Không mang theo bằng lái khi lái xe bị phạt đến 200.000 KRW (Điều 156), dù có bằng hợp lệ.", severity: KeyPointSeverity.NORMAL },
      { text: "Xe kinh doanh vận tải hành khách/hàng hóa KHÔNG được lái bằng IDP, trừ xe cho thuê (rental).", severity: KeyPointSeverity.NORMAL },
    ],
    penalties: [
      { behavior: "Lái xe không có bằng lái hợp lệ (không IDP/không công nhận song phương)", amountText: "phạt tù đến 1 năm hoặc phạt tiền đến 3.000.000 KRW", currency: "KRW", note: "Điều 152 Luật Giao thông Đường bộ" },
      { behavior: "Không mang theo bằng lái khi lái xe", amountText: "phạt tiền đến 200.000 KRW", currency: "KRW", note: "Điều 156 Luật Giao thông Đường bộ" },
    ],
    exceptions: ["Xe cho thuê (rental) vẫn được phép dù thuộc nhóm xe kinh doanh vận tải."],
    foreignerNotes: [
      "IDP phải xin TRƯỚC khi rời Việt Nam (ở Cục CSGT / Sở GTVT) — không xin được sau khi đã ở Hàn Quốc.",
      "Sau 1 năm kể từ ngày nhập cảnh, phải đổi sang bằng lái Hàn Quốc nếu muốn tiếp tục lái xe hợp pháp.",
    ],
    sources: [
      { title: "Using a Foreign Driver's License", url: "https://easylaw.go.kr/CSM/CsmOvSave.laf?csmSeq=2332&ccfNo=1&cciNo=1&cnpClsNo=1", authority: "Korea Legislation Research Institute — Easy-to-Find Practical Legal Info (찾기 쉬운 생활법령정보, Bộ Tư pháp Hàn Quốc)", kind: "gov", accessedAt: "2026-09-22" },
      { title: "Traffic and Driving > Prohibition related to driving", url: "https://www.easylaw.go.kr/CSM/CsmOvSave.laf?csmSeq=740&ccfNo=1&cciNo=1&cnpClsNo=1", authority: "Korea Legislation Research Institute — Easy-to-Find Practical Legal Info", kind: "gov", accessedAt: "2026-09-22" },
    ],
    effectiveFrom: "2009-06-20",
    riskLevel: RiskLevel.DANGER,
    tags: ["giao-thong", "bang-lai", "idp"],
  },
  {
    topicSlug: "hinh-su",
    slug: "ma-tuy-canh-bao",
    title: "Ma túy tại Hàn Quốc — cấm tuyệt đối, kể cả cần sa hợp pháp ở nước khác",
    summaryVi:
      "Hàn Quốc áp dụng chính sách hình sự hóa ma túy rất nghiêm khắc, bao gồm cả cần sa (marijuana/cannabis) dù chất này hợp pháp hoặc được y tế hóa ở nhiều quốc gia khác. Luật ma túy Hàn Quốc có hiệu lực NGOÀI LÃNH THỔ (extraterritorial) áp dụng cho CÔNG DÂN HÀN QUỐC sử dụng ma túy ở nước ngoài — người nước ngoài không thuộc diện luật ngoài lãnh thổ này, nhưng vẫn bị xử lý đầy đủ theo luật hình sự Hàn Quốc nếu sử dụng/tàng trữ/vận chuyển ma túy TRONG lãnh thổ Hàn Quốc.",
    keyPoints: [
      { text: "Cần sa (marijuana) KHÔNG hợp pháp tại Hàn Quốc cho mục đích giải trí, kể cả với người đến từ nước đã hợp pháp hóa.", severity: KeyPointSeverity.CRIMINAL },
      { text: "Luật Hàn Quốc có điều khoản xử lý công dân Hàn Quốc sử dụng ma túy ở nước ngoài (hiệu lực ngoài lãnh thổ) — không áp dụng cho người nước ngoài, nhưng cho thấy mức độ nghiêm khắc chung của chính sách.", severity: KeyPointSeverity.NORMAL },
      { text: "Xét nghiệm ma túy ngẫu nhiên tại sân bay và biên giới có thể áp dụng cho người nhập cảnh nếu có nghi ngờ.", severity: KeyPointSeverity.CRIMINAL },
    ],
    penalties: [],
    exceptions: [],
    foreignerNotes: [
      "[!] Bài này CHƯA có trích dẫn điều luật cụ thể (số điều trong Đạo luật Kiểm soát Ma túy Hàn Quốc) — cần nhóm nội dung tra cứu law.go.kr trước khi publish, KHÔNG publish ở dạng cảnh báo chung chung không có nguồn điều luật.",
      "Đây là chủ đề rủi ro pháp lý cao (W5-tương đương) — ưu tiên người có chuyên môn pháp lý xác minh trước khi lên bài, không seed thẳng qua bước review.",
    ],
    sources: [
      { title: "Cannabis in South Korea", url: "https://en.wikipedia.org/wiki/Cannabis_in_South_Korea", authority: "Wikipedia (tổng hợp, KHÔNG phải nguồn chính phủ — chỉ dùng để định hướng tra cứu tiếp)", kind: "secondary", accessedAt: "2026-09-22" },
      { title: "Koreans who smoke weed overseas to face criminal charges, gov't warns", url: "https://www.koreatimes.co.kr/southkorea/law-crime/20240527/south-koreans-who-smoke-weed-overseas-to-face-criminal-charges-govt-warns", authority: "The Korea Times (báo chí)", kind: "secondary", publishedAt: "2024-05-27", accessedAt: "2026-09-22" },
    ],
    effectiveFrom: null,
    riskLevel: RiskLevel.DANGER,
    tags: ["ma-tuy", "hinh-su", "can-sa"],
  },
  {
    topicSlug: "hai-quan",
    slug: "hai-quan-tien-mat-mien-thue",
    title: "Khai báo tiền mặt và hạn mức hàng miễn thuế khi nhập cảnh Hàn Quốc",
    summaryVi:
      "Hải quan Hàn Quốc (Korea Customs Service) quy định hạn mức hàng miễn thuế cho khách nhập cảnh và yêu cầu khai báo nếu mang theo tiền mặt/ngoại tệ vượt ngưỡng quy định.",
    keyPoints: [
      { text: "Hạn mức hàng miễn thuế tổng cộng cho hành lý cá nhân: không quá 600 USD giá trị.", severity: KeyPointSeverity.NORMAL },
      { text: "Rượu: không quá 1 lít VÀ không quá 400 USD giá trị.", severity: KeyPointSeverity.NORMAL },
      { text: "Thuốc lá: 1 cây (200 điếu). Nước hoa: không quá 60ml.", severity: KeyPointSeverity.NORMAL },
      { text: "Người dưới 19 tuổi bị hạn chế riêng với hạn mức rượu và thuốc lá.", severity: KeyPointSeverity.NORMAL },
    ],
    penalties: [],
    exceptions: [
      "Nông sản và thuốc đông y được mang theo tối đa 40kg, giá trị mua ở nước ngoài không quá 100.000 KRW, và phải qua kiểm dịch.",
    ],
    foreignerNotes: [
      "[!] Ngưỡng bắt buộc khai báo tiền mặt/ngoại tệ (thường được nói tới là 10.000 USD ở nhiều quốc gia) CHƯA được xác nhận trực tiếp từ trang customs.go.kr trong lần tra cứu này — cần nhóm nội dung fetch lại trang tiếng Anh của Hải quan Hàn Quốc và điền số chính xác trước khi publish, KHÔNG dùng số 10.000 USD như một giả định.",
    ],
    sources: [
      { title: "What is the Duty-Free Allowance for a Traveler's Personal Belongings", url: "https://www.customs.go.kr/english/cm/cntnts/cntntsView.do?mi=8028&cntntsId=2716", authority: "Korea Customs Service (관세청)", kind: "gov", accessedAt: "2026-09-22" },
    ],
    effectiveFrom: null,
    riskLevel: RiskLevel.INFO,
    tags: ["hai-quan", "mien-thue", "tien-mat"],
  },
  {
    topicSlug: "lao-dong",
    slug: "lao-dong-eps-luong-toi-thieu",
    title: "Lương tối thiểu 2026 và quyền lợi cơ bản của lao động Việt Nam diện EPS (visa E-9)",
    summaryVi:
      "Lao động Việt Nam sang Hàn Quốc theo Chương trình Cấp phép Việc làm (EPS, visa E-9) được bảo vệ bởi Luật Tiêu chuẩn Lao động và mức lương tối thiểu quốc gia do Bộ Việc làm và Lao động Hàn Quốc (MOEL) công bố hàng năm, không phân biệt quốc tịch.",
    keyPoints: [
      { text: "Mức lương tối thiểu năm 2026 là 10.320 KRW/giờ, áp dụng từ 01/01/2026, theo thông báo chính thức số 2025-47 của MOEL.", severity: KeyPointSeverity.NORMAL },
      { text: "Mức lương tối thiểu áp dụng cho MỌI người lao động tại Hàn Quốc, bao gồm lao động nước ngoài diện E-9 — không được trả thấp hơn dù có thỏa thuận riêng với chủ sử dụng lao động.", severity: KeyPointSeverity.CRIMINAL },
      { text: "Trang eps.go.kr có phiên bản tiếng Việt chính thức để lao động EPS tra cứu hợp đồng, chuyển đổi nơi làm việc, và khiếu nại.", severity: KeyPointSeverity.NORMAL },
    ],
    penalties: [],
    exceptions: [],
    foreignerNotes: [
      "[secondary] Số liệu lương tối thiểu 2026 lấy từ một trang tổng hợp dịch vụ nhân sự (mercans.com), trích dẫn thông báo MOEL 2025-47 — nên đối chiếu lại với eps.go.kr hoặc moel.go.kr trước khi publish để có nguồn gov trực tiếp.",
      "eps.go.kr có giao diện tiếng Việt — nên dùng làm nguồn gov chính khi nhóm nội dung viết lại bài này đầy đủ.",
    ],
    sources: [
      { title: "EPS (Employment Permit System) — phiên bản tiếng Việt", url: "https://www.eps.go.kr/eo/langMain.eo?langCD=vi", authority: "Bộ Việc làm và Lao động Hàn Quốc (고용노동부, MOEL) — Cơ quan Phát triển Nguồn nhân lực Hàn Quốc (HRD Korea)", kind: "gov", accessedAt: "2026-09-22" },
      { title: "South Korea: 2026 Minimum Wage Officially Notified (고시)", url: "https://mercans.com/resources/statutory-alerts/south-korea-2026-minimum-wage-officially-notified-%EA%B3%A0%EC%8B%9C/", authority: "Mercans (tư vấn nhân sự quốc tế, tổng hợp thông báo MOEL 2025-47)", kind: "secondary", publishedAt: "2025-11-07", accessedAt: "2026-09-22" },
    ],
    effectiveFrom: "2026-01-01",
    riskLevel: RiskLevel.WARN,
    tags: ["lao-dong", "eps", "e-9", "luong-toi-thieu"],
  },
  {
    topicSlug: "khan-cap",
    slug: "so-khan-cap-va-tong-dai-ho-tro",
    title: "Số điện thoại khẩn cấp và tổng đài hỗ trợ người nước ngoài tại Hàn Quốc",
    summaryVi:
      "Danh sách số điện thoại khẩn cấp công cộng của Hàn Quốc và tổng đài hỗ trợ người nước ngoài, dùng khi gặp sự cố an ninh, y tế, hoặc cần tư vấn thủ tục xuất nhập cảnh.",
    keyPoints: [
      { text: "112 — Cảnh sát (an ninh, trộm cắp, tai nạn hình sự). Có hỗ trợ dịch qua điện thoại 3 bên.", severity: KeyPointSeverity.NORMAL },
      { text: "119 — Cứu hỏa và cấp cứu y tế.", severity: KeyPointSeverity.NORMAL },
      { text: "1345 — Trung tâm tư vấn xuất nhập cảnh cho người nước ngoài (Immigration Contact Center), đa ngôn ngữ, do Bộ Tư pháp Hàn Quốc vận hành.", severity: KeyPointSeverity.NORMAL },
      { text: "1330 — Tổng đài du lịch Hàn Quốc (Korea Travel Hotline), hỗ trợ 24/7 nhiều ngôn ngữ cho khách du lịch.", severity: KeyPointSeverity.NORMAL },
    ],
    penalties: [],
    exceptions: [],
    foreignerNotes: [
      "[!] Số 1345 và 1330 được xác nhận qua nhiều nguồn tổng hợp (chính quyền địa phương, UNHCR Korea) nhưng KHÔNG fetch được trực tiếp trang mô tả chi tiết của Bộ Tư pháp trong lần tra cứu này — nên xác minh lại bằng cách gọi thử trước khi đưa vào bản published.",
    ],
    sources: [
      { title: "Foreigner Comprehensive Information Center (1345)", url: "https://yesan.go.kr/eng/sub03_07.do", authority: "Chính quyền địa phương Hàn Quốc (Yesan County) — mô tả dịch vụ 1345 do Bộ Tư pháp vận hành", kind: "secondary", accessedAt: "2026-09-22" },
      { title: "Government Helpline for Foreigners in Korea", url: "https://help.unhcr.org/southkorea/services-in-korea/government-helpline-for-foreigners-in-korea/", authority: "UNHCR Republic of Korea", kind: "secondary", accessedAt: "2026-09-22" },
    ],
    effectiveFrom: null,
    riskLevel: RiskLevel.INFO,
    tags: ["khan-cap", "hotline", "so-dien-thoai"],
  },
  {
    topicSlug: "khan-cap",
    slug: "mat-ho-chieu-ho-tro-cong-dan",
    title: "Mất hộ chiếu tại Hàn Quốc — liên hệ Đại sứ quán Việt Nam tại Seoul",
    summaryVi:
      "Khi mất hộ chiếu hoặc giấy tờ tùy thân tại Hàn Quốc, công dân Việt Nam cần trình báo cảnh sát địa phương (để lấy biên bản trình báo mất giấy tờ) và liên hệ ngay Đại sứ quán Việt Nam tại Seoul để được hướng dẫn cấp giấy thông hành hoặc hộ chiếu mới.",
    keyPoints: [
      { text: "Bước 1: Trình báo mất giấy tờ tại đồn cảnh sát gần nhất (gọi 112 nếu cần hỗ trợ khẩn) để lấy biên bản — bắt buộc khi làm thủ tục xin cấp lại giấy tờ và khi xuất cảnh.", severity: KeyPointSeverity.NORMAL },
      { text: "Bước 2: Liên hệ Đại sứ quán Việt Nam tại Seoul để được hướng dẫn hồ sơ cấp hộ chiếu mới hoặc giấy thông hành để về nước.", severity: KeyPointSeverity.NORMAL },
      { text: "Đường dây nóng bảo hộ công dân của Đại sứ quán hoạt động ngoài giờ hành chính cho các trường hợp khẩn cấp tại sân bay.", severity: KeyPointSeverity.NORMAL },
    ],
    penalties: [],
    exceptions: [],
    foreignerNotes: [
      "Địa chỉ và số điện thoại dưới đây lấy trực tiếp từ trang liên hệ chính thức của Đại sứ quán — nhóm nội dung nên gọi xác nhận lại trước khi publish vì thông tin liên hệ đại sứ quán có thể thay đổi theo thời gian.",
      "Địa chỉ: 123 Bukchon-ro, Jongno-gu, Seoul (03052), Hàn Quốc.",
      "Điện thoại lễ tân/hành chính: +82-2-720-5510. Đường dây khẩn cấp sân bay (visa/giấy tờ, hoạt động ngoài giờ): +82-2-738-2318.",
      "Email hỗ trợ: support@vietnamembassy-seoul.org",
    ],
    sources: [
      { title: "Contact Us — Vietnam Visa Support & Consular Information in Seoul", url: "https://vietnamembassy-seoul.org/contact-us/", authority: "Đại sứ quán nước Cộng hòa Xã hội Chủ nghĩa Việt Nam tại Hàn Quốc", kind: "gov", accessedAt: "2026-09-22" },
    ],
    effectiveFrom: null,
    riskLevel: RiskLevel.INFO,
    tags: ["khan-cap", "ho-chieu", "dai-su-quan", "bao-ho-cong-dan"],
  },
];

// B4: bodyMd co cau truc heading -- rag/chunking.js cat theo heading markdown,
// khong chunk duoc gi co ich tu mot doan van xuoi duy nhat (truoc day bodyMd
// chi la ban sao summaryVi). Penalties KHONG lap lai o day vi chunking.js tu
// sinh rieng 1 chunk cho moi penalty tu article.penalties.
export function buildBodyMd(a) {
  const sections = [`## Tổng quan\n${a.summaryVi}`];

  if (a.keyPoints?.length) {
    sections.push(`## Điểm cần lưu ý\n${a.keyPoints.map((k) => `- ${k.text}`).join("\n")}`);
  }
  if (a.exceptions?.length) {
    sections.push(`## Trường hợp ngoại lệ\n${a.exceptions.map((e) => `- ${e}`).join("\n")}`);
  }
  if (a.foreignerNotes?.length) {
    sections.push(`## Lưu ý cho người nước ngoài\n${a.foreignerNotes.map((n) => `- ${n}`).join("\n")}`);
  }

  return sections.join("\n\n");
}

// Huong dan xu ly su co -- noi dung THU TUC chung (goi ai, lam gi truoc/sau),
// KHONG phai tuyen bo phap ly can trich dan dieu luat (khac ban chat voi
// KR_ARTICLES) nen seed truc tiep o trang thai published, ap dung TOAN CAU
// (countryCode: null) vi cac buoc nay giong nhau o hau het quoc gia.
export const GLOBAL_INCIDENTS = [
  {
    slug: "mat-ho-chieu",
    countryCode: null,
    title: "Mất hộ chiếu",
    iconKey: "IdCard",
    tone: "red",
    urgent: true,
    reassurance: "Giữ bình tĩnh. Bạn vẫn được rời khỏi nước sở tại hợp pháp bằng giấy thông hành do Đại sứ quán cấp.",
    steps: [
      { title: "Trình báo tại đồn công an gần nhất", body: ["Xin giấy xác nhận mất giấy tờ.", "Giữ số hồ sơ — Đại sứ quán sẽ yêu cầu số này."], ctas: [{ type: "map", label: "Đồn công an gần nhất", payload: { locationType: "police" } }] },
      { title: "Liên hệ Đại sứ quán Việt Nam", body: ["Gọi trong giờ hành chính, mang theo giấy xác nhận của công an."], ctas: [{ type: "call", label: "Gọi Đại sứ quán", payload: {} }] },
      { title: "Chuẩn bị giấy tờ", body: [], checklist: [{ label: "Ảnh 4x6 nền trắng (2 tấm)" }, { label: "Bản sao hộ chiếu hoặc ảnh chụp trang thông tin" }, { label: "Vé máy bay hoặc lịch trình về nước" }] },
      { title: "Nhận giấy thông hành", body: ["Thường mất 1-3 ngày làm việc. Dùng giấy này để về Việt Nam."] },
    ],
    status: "published",
  },
  {
    slug: "bi-kiem-tra-giay-to",
    countryCode: null,
    title: "Bị công an kiểm tra giấy tờ",
    iconKey: "ShieldAlert",
    tone: "blue",
    urgent: false,
    reassurance: "Đây thường là việc kiểm tra thông thường. Hợp tác xuất trình giấy tờ để tránh rắc rối không cần thiết.",
    steps: [
      { title: "Giữ bình tĩnh, xuất trình giấy tờ", body: ["Đưa hộ chiếu hoặc thẻ lưu trú khi được yêu cầu."] },
      { title: "Hỏi lý do kiểm tra", body: ["Bạn có quyền hỏi lý do một cách lịch sự."] },
      { title: "Ghi nhớ tên đồn, số hiệu cán bộ", body: ["Dùng nếu cần khiếu nại sau này."] },
    ],
    status: "published",
  },
  {
    slug: "tai-nan-giao-thong",
    countryCode: null,
    title: "Tai nạn giao thông",
    iconKey: "Car",
    tone: "orange",
    urgent: true,
    reassurance: "Ưu tiên an toàn tính mạng trước — gọi cấp cứu ngay nếu có người bị thương.",
    steps: [
      { title: "Gọi cấp cứu và công an", body: ["Ưu tiên gọi số cấp cứu y tế nếu có người bị thương, sau đó báo công an nếu có va chạm."] },
      { title: "Không rời khỏi hiện trường", body: ["Rời hiện trường trước khi công an đến có thể bị coi là bỏ trốn."] },
      { title: "Chụp ảnh hiện trường", body: ["Ghi lại biển số, vị trí, tình trạng phương tiện."] },
      { title: "Lấy thông tin liên hệ", body: ["Trao đổi thông tin bảo hiểm với bên còn lại."] },
      { title: "Báo bảo hiểm du lịch", body: ["Liên hệ công ty bảo hiểm để được hướng dẫn tiếp."] },
    ],
    status: "published",
  },
  {
    slug: "mat-do-bi-trom-cap",
    countryCode: null,
    title: "Mất đồ hoặc bị trộm cắp",
    iconKey: "ShoppingBag",
    tone: "blue",
    urgent: false,
    reassurance: "Trình báo sớm giúp tăng khả năng tìm lại đồ và cần thiết cho yêu cầu bảo hiểm.",
    steps: [
      { title: "Trình báo tại đồn công an gần nhất", body: ["Xin giấy xác nhận mất đồ."], ctas: [{ type: "map", label: "Đồn công an gần nhất", payload: { locationType: "police" } }] },
      { title: "Khoá thẻ ngân hàng nếu mất ví", body: ["Gọi ngân hàng để khoá thẻ ngay lập tức."] },
      { title: "Liên hệ nơi lưu trú", body: ["Hỏi camera an ninh nếu mất đồ tại khách sạn."] },
      { title: "Báo bảo hiểm du lịch", body: ["Chuẩn bị giấy xác nhận của công an để yêu cầu bồi thường."] },
    ],
    status: "published",
  },
  {
    slug: "can-ho-tro-y-te",
    countryCode: null,
    title: "Cần hỗ trợ y tế",
    iconKey: "Plus",
    tone: "green",
    urgent: false,
    reassurance: "Gọi cấp cứu ngay cho tình huống nguy hiểm tính mạng; trường hợp nhẹ có thể tới phòng khám gần nhất.",
    steps: [
      { title: "Đánh giá mức độ khẩn cấp", body: ["Gọi số cấp cứu y tế địa phương nếu nguy hiểm tính mạng."] },
      { title: "Tìm bệnh viện gần bạn", body: ["Dùng SOS Map để tìm cơ sở y tế gần nhất."], ctas: [{ type: "map", label: "Bệnh viện gần nhất", payload: { locationType: "hospital" } }] },
      { title: "Mang theo bảo hiểm du lịch", body: ["Giữ giấy tờ bảo hiểm để làm thủ tục thanh toán."] },
    ],
    status: "published",
  },
];

// Cau dich san khan cap KR -- dich AI (cung muc do tin cay voi tinh nang Dich
// khan cap dang dung), NEN duoc nguoi biet tieng Han ra soat truoc khi dung
// that trong tinh huong khan cap (xem "Dang vuong" o docs/PROGRESS.md).
export const KR_QUICK_PHRASES = [
  { vi: "Tôi cần giúp đỡ", translated: "도와주세요", phonetic: "Dowajuseyo" },
  { vi: "Làm ơn gọi công an", translated: "경찰을 불러주세요", phonetic: "Gyeongchaleul bulleojuseyo" },
  { vi: "Làm ơn gọi cấp cứu", translated: "구급차를 불러주세요", phonetic: "Gugeupchaleul bulleojuseyo" },
  { vi: "Tôi bị mất hộ chiếu", translated: "여권을 잃어버렸어요", phonetic: "Yeogwoneul ireobeoryeosseoyo" },
  { vi: "Tôi cần bác sĩ", translated: "의사가 필요해요", phonetic: "Uisaga piryohaeyo" },
  { vi: "Tôi bị đau ở đây", translated: "여기가 아파요", phonetic: "Yeogiga apayo" },
  { vi: "Tôi không nói được tiếng Hàn", translated: "한국어를 못해요", phonetic: "Hangugeoreul mothaeyo" },
  { vi: "Tôi cần người phiên dịch", translated: "통역이 필요해요", phonetic: "Tongyeogi piryohaeyo" },
  { vi: "Tôi là người Việt Nam", translated: "저는 베트남 사람이에요", phonetic: "Jeoneun Beteunam saramieyo" },
  { vi: "Tôi bị mất cắp đồ", translated: "물건을 도난당했어요", phonetic: "Mulgeoneul donandanghaesseoyo" },
  { vi: "Xin hãy gọi giúp số này", translated: "이 번호로 전화해 주세요", phonetic: "I beonhoro jeonhwahae juseyo" },
  { vi: "Đại sứ quán Việt Nam ở đâu?", translated: "베트남 대사관이 어디예요?", phonetic: "Beteunam daesagwani eodiyeyo?" },
  { vi: "Bệnh viện gần nhất ở đâu?", translated: "가장 가까운 병원이 어디예요?", phonetic: "Gajang gakkaun byeongwoni eodiyeyo?" },
  { vi: "Đồn công an gần nhất ở đâu?", translated: "가장 가까운 경찰서가 어디예요?", phonetic: "Gajang gakkaun gyeongchalseoga eodiyeyo?" },
  { vi: "Tôi bị lạc đường", translated: "길을 잃었어요", phonetic: "Gireul ireosseoyo" },
  { vi: "Xin hãy giúp tôi liên hệ gia đình", translated: "가족에게 연락하는 것을 도와주세요", phonetic: "Gajoge yeollakhaneun geoseul dowajuseyo" },
  { vi: "Tôi bị tai nạn giao thông", translated: "교통사고가 났어요", phonetic: "Gyotongsagoga nasseoyo" },
  { vi: "Xin hãy nói chậm hơn", translated: "천천히 말씀해 주세요", phonetic: "Cheoncheonhi malsseumhae juseyo" },
  { vi: "Tôi bị dị ứng", translated: "저는 알레르기가 있어요", phonetic: "Jeoneun allereugiga isseoyo" },
  { vi: "Tôi cần thuốc", translated: "약이 필요해요", phonetic: "Yagi piryohaeyo" },
  { vi: "Tôi muốn về Việt Nam", translated: "베트남으로 돌아가고 싶어요", phonetic: "Beteunameuro doragago sipeoyo" },
  { vi: "Tôi bị giữ lại, tôi muốn gặp luật sư", translated: "구금되었어요, 변호사를 만나고 싶어요", phonetic: "Gugeumdoeeosseoyo, byeonhosareul mannago sipeoyo" },
  { vi: "Xin cho tôi xem giấy tờ của anh/chị", translated: "신분증을 보여주세요", phonetic: "Sinbunjeungeul boyeojuseyo" },
  { vi: "Cảm ơn, tôi ổn rồi", translated: "감사합니다, 저는 괜찮아요", phonetic: "Gamsahamnida, jeoneun gwaenchanayo" },
  { vi: "Làm ơn đưa tôi đến bệnh viện", translated: "병원에 데려다 주세요", phonetic: "Byeongwone deryeoda juseyo" },
];

// Khong tu connect/disconnect/exit o day -- de scripts/seed-demo.js goi lai
// duoc ham nay TRONG CUNG mot ket noi Mongo roi lam tiep buoc reindex, thay
// vi phai tach tien trinh con. Khoi tu chay ("npm run seed") lo phan
// connect/disconnect/exit o duoi file.
export const run = async () => {
  for (const c of COUNTRIES) {
    const existing = await Country.findOne({ code: c.code });
    if (existing) {
      console.log(`[bo qua] Country ${c.code} da ton tai`);
      continue;
    }
    await Country.create(c);
    console.log(`[tao moi] Country ${c.code} (${c.status})`);
  }

  for (const t of KR_TOPICS) {
    const existing = await LegalTopic.findOne({ countryCode: "KR", slug: t.slug });
    if (existing) {
      console.log(`[bo qua] LegalTopic KR/${t.slug} da ton tai`);
      continue;
    }
    await LegalTopic.create({ countryCode: "KR", ...t });
    console.log(`[tao moi] LegalTopic KR/${t.slug}`);
  }

  for (const a of KR_ARTICLES) {
    const existing = await LegalArticle.findOne({ countryCode: "KR", slug: a.slug });
    if (existing) {
      // Backfill bodyMd cho ban ghi tu lan seed truoc B4 (luc do bodyMd chi la
      // ban sao summaryVi) -- CHI cap nhat khi con dung placeholder cu, KHONG
      // dong vao neu admin da tu sua bodyMd qua Portal (tranh mat cong nguoi dung).
      if (existing.bodyMd === existing.summaryVi) {
        existing.bodyMd = buildBodyMd(a);
        await existing.save();
        console.log(`[cap nhat bodyMd] LegalArticle KR/${a.slug}`);
      } else {
        console.log(`[bo qua] LegalArticle KR/${a.slug} da ton tai`);
      }
      continue;
    }
    await LegalArticle.create({
      ...a,
      countryCode: "KR",
      version: 1,
      isCurrent: true,
      status: ContentStatus.DRAFT,
      bodyMd: buildBodyMd(a),
    });
    console.log(`[tao moi] LegalArticle KR/${a.slug} (draft)`);
  }

  const adminEmail = env.SEED_ADMIN_EMAIL;
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    console.log(`[bo qua] Admin ${adminEmail} da ton tai`);
  } else {
    const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12);
    await User.create({
      username: "admin",
      fullName: "Quản trị viên",
      email: adminEmail,
      phone: "",
      password: passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    });
    console.log(`[tao moi] Admin ${adminEmail} -- DOI MAT KHAU NGAY sau khi dang nhap lan dau`);
  }

  for (const i of GLOBAL_INCIDENTS) {
    const existing = await IncidentType.findOne({ slug: i.slug });
    if (existing) {
      console.log(`[bo qua] IncidentType ${i.slug} da ton tai`);
      continue;
    }
    await IncidentType.create({ ...i, steps: i.steps.map((s, index) => ({ ...s, order: index })) });
    console.log(`[tao moi] IncidentType ${i.slug} (published)`);
  }

  for (const p of KR_QUICK_PHRASES) {
    const existing = await QuickPhrase.findOne({ countryCode: "KR", vi: p.vi });
    if (existing) {
      console.log(`[bo qua] QuickPhrase KR "${p.vi}" da ton tai`);
      continue;
    }
    await QuickPhrase.create({ countryCode: "KR", ...p });
    console.log(`[tao moi] QuickPhrase KR "${p.vi}"`);
  }

  console.log(
    "\n[!] KHONG seed support_locations/geo_alerts -- can nguoi phu trach " +
      "nhap du lieu that qua Admin Portal (xem chu thich dau file).",
  );
};

// Chi thuc thi khi chay truc tiep ("node scripts/seed-content.js" / "npm run
// seed") -- KHONG chay khi file nay duoc import de tai su dung du lieu (vi du
// test/golden/kr.golden.test.js import KR_ARTICLES/buildBodyMd o tren, hoac
// scripts/seed-demo.js import `run` de goi lai trong cung 1 ket noi Mongo).
// pathToFileURL (khong phai ghep chuoi "file://" thu cong) vi Windows dung
// dau `\` va co the co khoang trang trong duong dan (vi du "K9 WDP").
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await mongoose.connect(env.MONGODB_URI, { maxPoolSize: env.MONGO_MAX_POOL_SIZE });
    await run();
    await mongoose.disconnect();
    process.exit(0);
  })().catch((error) => {
    console.error("Loi seed noi dung:", error);
    process.exit(1);
  });
}
