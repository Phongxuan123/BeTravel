/*
 * Phân loại luật liên bang Úc theo 5 mục của Be.Travel.
 * Nguồn Federal Register of Legislation KHÔNG có trường chủ đề, nên đây là danh sách
 * do Be.Travel tuyển chọn thủ công: mỗi mã (titleId) đã đối chiếu với API nguồn
 * (đúng tên, đang có hiệu lực, 17/10/2026). Không phải danh sách đầy đủ và không
 * phải tư vấn pháp lý. Một đạo luật được nằm ở nhiều mục. Thêm luật: chỉ cần thêm mã vào đây.
 */

export const AU_LAW_TOPICS = Object.freeze([
  {
    slug: "giao-thong",
    label: "Giao thông",
    // Gợi ý ngắn trong lời từ chối của AI (rag/noEvidence.js), tránh hiểu nhầm là có luật đường bộ.
    aiScopeHint: "tiêu chuẩn phương tiện, hàng không, hàng hải; không gồm luật đường bộ của bang",
    note:
      "Quy tắc giao thông đường bộ (tốc độ, bằng lái, mức phạt) do từng bang và vùng lãnh thổ " +
      "ban hành nên KHÔNG có trong nguồn liên bang. Mục này gồm luật liên bang về phương tiện, " +
      "hàng không và hàng hải.",
    titleIds: [
      "C2018A00163", // Road Vehicle Standards Act 2018
      "C2004A03656", // Civil Aviation Act 1988
      "C2004A01242", // Aviation Transport Security Act 2004
      "C1920A00050", // Air Navigation Act 1920
      "C2012A00128", // Navigation Act 2012
    ],
  },
  {
    slug: "cu-tru",
    label: "Cư trú",
    aiScopeHint: "visa, quốc tịch, du học; không gồm luật thuê nhà của bang",
    note:
      "Visa, thường trú, quốc tịch và du học. Luật thuê nhà ở do từng bang quy định, " +
      "không có trong nguồn liên bang.",
    titleIds: [
      "C1958A00062", // Migration Act 1958
      "F1996B03551", // Migration Regulations 1994
      "C2007A00020", // Australian Citizenship Act 2007
      "C2004A00757", // Education Services for Overseas Students Act 2000
      "C1971A00003", // Immigration (Education) Act 1971
      "C1946A00045", // Immigration (Guardianship of Children) Act 1946
    ],
  },
  {
    slug: "xuat-nhap-canh",
    label: "Xuất nhập cảnh",
    note: "Visa, hộ chiếu, kiểm soát biên giới và phí xuất cảnh.",
    titleIds: [
      "C1958A00062", // Migration Act 1958
      "F1996B03551", // Migration Regulations 1994
      "C2005A00005", // Australian Passports Act 2005
      "C2015A00040", // Australian Border Force Act 2015
      "C2004A01918", // Passenger Movement Charge Collection Act 1978
    ],
  },
  {
    slug: "hai-quan-hanh-ly",
    label: "Hải quan hành lý",
    note: "Hàng cấm và hàng phải khai báo, kiểm dịch sinh học (thực phẩm, thực vật, động vật), thuế hải quan.",
    titleIds: [
      "C1901A00006", // Customs Act 1901
      "C2004A04997", // Customs Tariff Act 1995
      "C2015A00061", // Biosecurity Act 2015
      "F1996B03651", // Customs (Prohibited Imports) Regulations 1956
      "F1996B03403", // Customs (Prohibited Exports) Regulations 1958
      "F2015L00375", // Customs Regulation 2015 (bổ sung 21/10/2026)
      "C2004A03952", // Therapeutic Goods Act 1989
      "C2015A00040", // Australian Border Force Act 2015
    ],
  },
  {
    slug: "quyen-loi-khieu-nai",
    label: "Quyền lợi và khiếu nại",
    note:
      "Bảo vệ người tiêu dùng, chống phân biệt đối xử, khiếu nại và xem xét quyết định hành chính, " +
      "quyền riêng tư, bồi thường trong vận chuyển hàng không.",
    titleIds: [
      "C2004A00109", // Competition and Consumer Act 2010 (gồm Australian Consumer Law)
      "C1959A00002", // Civil Aviation (Carriers' Liability) Act 1959
      "C2024A00040", // Administrative Review Tribunal Act 2024
      "C2004A01697", // Administrative Decisions (Judicial Review) Act 1977
      "C2004A01611", // Ombudsman Act 1976
      "C2004A03712", // Privacy Act 1988
      "C2004A02562", // Freedom of Information Act 1982
      "C2004A03366", // Australian Human Rights Commission Act 1986
      "C2004A00274", // Racial Discrimination Act 1975
      "C2004A02868", // Sex Discrimination Act 1984
      "C2004A04426", // Disability Discrimination Act 1992
    ],
  },
]);

export const AU_LAW_TOPIC_SLUGS = AU_LAW_TOPICS.map((topic) => topic.slug);

export const findAuLawTopic = (slug) => AU_LAW_TOPICS.find((topic) => topic.slug === slug);

// Các mục chứa một đạo luật (rỗng nếu luật không nằm trong danh sách tuyển chọn).
export const topicSlugsForTitle = (titleId) =>
  AU_LAW_TOPICS.filter((topic) => topic.titleIds.includes(titleId)).map((topic) => topic.slug);

// Chỉ luật đã tuyển chọn mới được AI diễn giải tiếng Việt: giới hạn số lần gọi LLM (tốn tiền) ở một tập nhỏ.
const CURATED_TITLE_IDS = new Set(AU_LAW_TOPICS.flatMap((topic) => topic.titleIds));
export const isCuratedTitle = (titleId) => CURATED_TITLE_IDS.has(titleId);
