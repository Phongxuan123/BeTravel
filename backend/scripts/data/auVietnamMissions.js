/*
 * Cơ quan đại diện của Việt Nam tại Úc, đối chiếu với nguồn chính thức ngày 21/10/2026.
 *
 * Phương pháp xác minh (KHÔNG gọi điện được): mỗi thông tin phải khớp ít nhất hai nguồn trong số
 *   [DFAT]  Danh bạ ngoại giao của chính phủ Úc, protocol.dfat.gov.au (Missions/217, Consulates/217/State)
 *   [SITE]  Website của chính cơ quan (vietnamembassy.org.au, vietnamconsulate.org.au, vietnam-consulate.org.au)
 *   [OSM]   OpenStreetMap/Nominatim (địa chỉ và toạ độ)
 * Danh sách đầy đủ theo DFAT: 1 Đại sứ quán (Canberra) + 2 Tổng lãnh sự quán (Sydney, Perth). KHÔNG có Tổng lãnh sự quán
 * ở Melbourne hay Brisbane và DFAT không liệt kê lãnh sự danh dự; bang Victoria thuộc địa bàn Đại sứ quán Canberra.
 *
 * Điểm cần người gọi điện xác nhận (xem `unconfirmed`): số điện thoại Sydney trên website TLSQ (02 9326 1129 / 02 9326 1202)
 * khác DFAT (02 9327 2539 / 02 9327 1912); đang dùng số của DFAT. Cập nhật lại khi có xác nhận qua điện thoại.
 */

export const VERIFIED_ON = "2026-10-21";
const METHOD_NOTE =
  "Đối chiếu nguồn chính thức online 21/10/2026, CHƯA gọi điện xác nhận: hãy gọi trước khi đến.";

export const AU_EMBASSY = Object.freeze({
  name: "Đại sứ quán Việt Nam tại Úc",
  address: "47 Culgoa Circuit, O'Malley ACT 2606, Úc",
  phone: "+61 2 6169 4916",
  lat: -35.3519969,
  lng: 149.1081765,
});

export const AU_VIETNAM_MISSIONS = Object.freeze([
  {
    countryCode: "AU",
    type: "embassy",
    name: "Đại sứ quán Việt Nam tại Úc (Canberra) - phụ trách ACT, VIC, TAS",
    nameLocal: "Embassy of the Socialist Republic of Vietnam",
    address: "47 Culgoa Circuit, O'Malley ACT 2606, Úc",
    phone: "+61 2 6169 4916",
    website: "https://vietnamembassy.org.au",
    openHours: "Thứ Hai - Thứ Sáu 9:00-17:00; tiếp công dân (lãnh sự): Thứ Ba, Thứ Tư, Thứ Sáu",
    lat: -35.3519969,
    lng: 149.1081765,
    source:
      "[DFAT] protocol.dfat.gov.au/Public/Missions/217 (47 Culgoa Circuit; 6169 4916/4915/4917; 9:00-17:00); " +
      "[SITE] vietnamembassy.org.au (chuyển trụ sở sang 47 Culgoa Circuit từ 24/02/2026; địa bàn ACT, VIC, TAS); " +
      "[OSM] node diplomatic 'Embassy of Vietnam, 47 Culgoa Circuit'. Địa chỉ cũ 6 Timbarra Crescent đã LỖI THỜI. " +
      METHOD_NOTE,
  },
  {
    countryCode: "AU",
    type: "embassy",
    name: "Tổng lãnh sự quán Việt Nam tại Sydney - phụ trách NSW, QLD, SA",
    nameLocal: "Consulate-General of the Socialist Republic of Vietnam",
    address:
      "Suite 205, Level 2, Edgecliff Centre, 203-233 New South Head Road, Edgecliff NSW 2027, Úc",
    phone: "+61 2 9327 2539",
    website: "https://vietnamconsulate.org.au",
    openHours: "Thứ Hai - Thứ Sáu 9:00-12:30 và 13:00-16:00",
    lat: -33.8789745,
    lng: 151.2355215,
    source:
      "[DFAT] protocol.dfat.gov.au/Public/Consulates/217/State (NSW: địa chỉ, 9327 2539 / 9327 1912, giờ làm việc); " +
      "[SITE] vietnamconsulate.org.au (cùng địa chỉ; địa bàn NSW, QLD, SA theo vietnamembassy.org.au); " +
      "[OSM] node diplomatic 'Consulate-General Socialist Republic of Vietnam, 203 New South Head Road'. " +
      "KHÁC BIỆT chưa phân xử: website TLSQ ghi 02 9326 1129 / 02 9326 1202 và giờ 9:00-17:30; đang dùng số và giờ của DFAT. " +
      METHOD_NOTE,
  },
  {
    countryCode: "AU",
    type: "embassy",
    name: "Tổng lãnh sự quán Việt Nam tại Perth - phụ trách WA, NT",
    nameLocal: "Consulate-General of the Socialist Republic of Vietnam",
    address: "Level 8, 16 St Georges Terrace, Perth WA 6000, Úc",
    phone: "+61 8 9350 5367",
    website: "https://vietnam-consulate.org.au",
    openHours: "Thứ Hai - Thứ Sáu 9:00-12:30 và 13:30-17:00",
    lat: -31.956836,
    lng: 115.8644156,
    source:
      "[DFAT] protocol.dfat.gov.au/Public/Consulates/217/State (WA: Level 8, 16 St Georges Terrace; 08 9350 5367; giờ làm việc); " +
      "[SITE] vietnam-consulate.org.au (cùng địa chỉ, PO Box 3122 East Perth WA 6892) và vietnamembassy.org.au (địa bàn WA, NT); " +
      "[OSM] toạ độ toà nhà 16 St Georges Terrace (OSM chưa có điểm riêng của TLSQ). " +
      "Số trực ngoài giờ khẩn cấp +61 499 220 973 (DFAT). " +
      METHOD_NOTE,
  },
]);
