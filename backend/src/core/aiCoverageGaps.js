/*
 * Chủ đề người dùng hay hỏi nhưng kho tri thức của Be.Travel CHƯA có, theo từng quốc gia. Khi AI
 * không tìm đủ bằng chứng mà câu hỏi rơi vào một chủ đề ở đây, lời từ chối nói rõ vì sao và chỉ
 * nơi tra cứu chính thức, thay cho câu "chưa đủ dữ liệu" chung chung.
 *
 * Đây là dữ liệu do Be.Travel biên soạn thủ công (giống core/auLawTopics.js):
 *   - `generalInfo` chỉ gồm sự kiện đã đối chiếu với trang chính thức ghi trong `officialLinks`
 *     (21/10/2026), KHÔNG có mức phạt hay con số; không phải tư vấn pháp lý.
 *   - Có dữ liệu luật thật cho chủ đề nào thì xoá mục đó khỏi đây.
 * `triggers` viết có dấu; câu hỏi gõ không dấu vẫn khớp (utils/textNormalize.js#containsPhrase).
 * [!] `answerBeforeSearch: true`: khớp trigger thì chat trả lời NGAY lời từ chối, không chạy truy hồi
 *     (services/chat.service.js), nên chỉ dùng cụm từ chắc chắn thuộc chủ đề. Tránh từ chung như "ô tô"
 *     ("mang ô tô vào Úc" là câu hải quan, kho có dữ liệu). `false`: kho có dữ liệu một phần, vẫn
 *     tìm và để AI trả lời; chỉ khi không đủ bằng chứng mới dùng lời từ chối của mục này.
 */
export const AI_COVERAGE_GAPS = Object.freeze({
  AU: [
    {
      slug: "giao-thong-duong-bo",
      label: "Quy tắc giao thông đường bộ",
      answerBeforeSearch: true,
      triggers: [
        "lái xe",
        "giao thông",
        "làn đường",
        "làn xe",
        "tốc độ",
        "bằng lái",
        "giấy phép lái",
        "đỗ xe",
        "đậu xe",
        "đèn đỏ",
        "phạt nguội",
        "nồng độ cồn",
        "drive",
        "driving",
        "road rules",
        "speed limit",
        "parking",
      ],
      reason:
        "Ở Úc, quy tắc giao thông đường bộ (làn đường, tốc độ, bằng lái, nồng độ cồn, mức phạt) do " +
        "từng bang và vùng lãnh thổ ban hành. Kho dữ liệu của Be.Travel hiện chỉ có luật liên bang, " +
        "nên mình chưa trả lời chắc chắn được câu này.",
      generalInfo: [
        "Ở Úc xe chạy bên TRÁI đường; đỗ xe cũng ở phía bên trái (theo Tourism Australia).",
        "Mức phạt và giới hạn tốc độ khác nhau giữa các bang: hãy tra đúng bang bạn đang lái xe.",
      ],
      officialLinks: [
        {
          label: "Tourism Australia - Lái xe ở Úc",
          url: "https://www.australia.com/en/facts-and-planning/getting-around/driving-in-australia.html",
        },
        {
          label: "New South Wales (Sydney) - Luật đường bộ",
          url: "https://www.nsw.gov.au/driving-boating-and-transport/roads-safety-and-rules",
        },
        {
          label: "Victoria (Melbourne) - Luật đường bộ",
          url: "https://www.vicroads.vic.gov.au/safety-and-road-rules",
        },
      ],
    },
    {
      slug: "thue-nha",
      label: "Thuê nhà",
      answerBeforeSearch: true,
      triggers: [
        "thuê nhà",
        "thuê phòng",
        "phòng trọ",
        "chủ nhà",
        "hợp đồng thuê",
        "tiền cọc nhà",
        "rent",
        "rental",
        "lease",
        "landlord",
        "tenant",
      ],
      reason:
        "Ở Úc, luật thuê nhà (hợp đồng, tiền cọc, quyền của người thuê) do từng bang và vùng lãnh thổ " +
        "ban hành. Kho dữ liệu của Be.Travel hiện chỉ có luật liên bang, nên mình chưa trả lời chắc " +
        "chắn được câu này.",
      generalInfo: [],
      officialLinks: [
        {
          label: "New South Wales - Thuê nhà",
          url: "https://www.nsw.gov.au/housing-and-construction/renting-a-place-to-live",
        },
        {
          label: "Victoria - Thuê nhà",
          url: "https://www.consumer.vic.gov.au/housing/renting",
        },
      ],
    },
    {
      slug: "kiem-dich-hang-mang-theo",
      label: "Danh mục chi tiết hàng được mang vào Úc",
      // Kho có Biosecurity Act và quy định hàng cấm nhập: vẫn để AI tìm và trả lời trước.
      answerBeforeSearch: false,
      triggers: [
        "thú cưng",
        // Không dùng "chó" đơn lẻ: câu gõ không dấu có "cho" (cho tôi hỏi...) sẽ khớp nhầm.
        "con chó",
        "chó cưng",
        "mèo",
        "chim",
        "hạt giống",
        "cây trồng",
        "trái cây",
        "hoa quả",
        "thịt",
        "đồ ăn",
        "thực phẩm",
        "kiểm dịch",
        "pet",
        "food",
        "seeds",
      ],
      reason:
        "Điều kiện cho từng món cụ thể (thực phẩm, thực vật, động vật, thú cưng) nằm trong danh mục " +
        "nhập khẩu chi tiết của Úc, Be.Travel chưa có trong dữ liệu, nên mình chưa trả lời chắc chắn " +
        "được câu này.",
      generalInfo: [
        "Trang 'Can you bring it in?' của Lực lượng Biên phòng Úc cho tra từng món: món nào phải " +
          "khai báo (DECLARE IT) và món nào bị cấm.",
        "Không chắc thì khai báo khi nhập cảnh để nhân viên kiểm tra.",
      ],
      officialLinks: [
        {
          label: "Australian Border Force - Can you bring it in?",
          url: "https://www.abf.gov.au/entering-and-leaving-australia/can-you-bring-it-in",
        },
      ],
    },
  ],
});
