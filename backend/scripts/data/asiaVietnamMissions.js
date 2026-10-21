/*
 * Đại sứ quán Việt Nam tại Nhật Bản, Thái Lan, Singapore, đối chiếu ngày 21/10/2026.
 *
 * Mỗi điểm khớp địa chỉ giữa trang chính thức của cơ quan và OpenStreetMap (toạ độ). CHƯA gọi điện xác nhận.
 * CHƯA nhập (thiếu nguồn đủ tin, không đoán): TLSQ Busan (mới mở 13/08/2025, chưa tìm thấy địa chỉ chính thức),
 * TLSQ Osaka (có địa chỉ và số trên trang chính thức nhưng chưa có toạ độ), TLSQ Fukuoka và Khon Kaen (chỉ có danh bạ
 * bên thứ ba), Đại sứ quán Seoul (OSM đang đánh dấu địa chỉ 123 Bukchon-ro là "cũ", cần xác nhận có chuyển trụ sở chưa).
 */
import { VERIFIED_ON } from "./auVietnamMissions.js";

export { VERIFIED_ON };

const METHOD_NOTE =
  "Đối chiếu nguồn online 21/10/2026, CHƯA gọi điện xác nhận: hãy gọi trước khi đến.";

export const ASIA_VIETNAM_MISSIONS = Object.freeze([
  {
    countryCode: "JP",
    type: "embassy",
    name: "Đại sứ quán Việt Nam tại Nhật Bản (Tokyo)",
    nameLocal: "在日本ベトナム大使館",
    address: "50-11 Motoyoyogi-cho, Shibuya-ku, Tokyo 151-0062, Nhật Bản",
    phone: "+81 3 3466 3311",
    website: "https://vnembassy-jp.org",
    openHours: "",
    lat: 35.672831,
    lng: 139.6858213,
    source:
      "[SITE] vnembassy-jp.org (địa chỉ, điện thoại 3466-3311/3313/3314); " +
      "[OSM] node diplomatic 'ベトナム大使館', Motoyoyogi-cho, Shibuya. Giờ làm việc chưa xác nhận. " +
      METHOD_NOTE,
  },
  {
    countryCode: "TH",
    type: "embassy",
    name: "Đại sứ quán Việt Nam tại Thái Lan (Bangkok)",
    nameLocal: "สถานเอกอัครราชทูตเวียดนาม",
    address: "83/1 Wireless Road, Lumpini, Pathumwan, Bangkok, Thái Lan",
    phone: "+66 2 650 8979",
    website: "https://vnembassy-bangkok.mofa.gov.vn",
    openHours: "",
    lat: 13.7407314,
    lng: 100.5475563,
    source:
      "[SITE] vnembassy-bangkok.mofa.gov.vn (83/1 Wireless Road; +66 2 650 8979 / +66 2 251 7525); " +
      "[OSM] node diplomatic 'สถานเอกอัครราชทูตเวียดนาม', Soi Witthayu 1 (cùng khu, OSM không ghi số nhà). " +
      "Giờ làm việc chưa xác nhận. " +
      METHOD_NOTE,
  },
  {
    countryCode: "SG",
    type: "embassy",
    name: "Đại sứ quán Việt Nam tại Singapore",
    nameLocal: "Embassy of the Socialist Republic of Vietnam in Singapore",
    address: "10 Leedon Park, Singapore 267887",
    phone: "+65 6462 5994",
    website: "https://vnembassy-singapore.mofa.gov.vn",
    openHours: "",
    lat: 1.3165858,
    lng: 103.796538,
    source:
      "[SITE] vnembassy-singapore.mofa.gov.vn (10 Leedon Park; +65 6462 5994 / 6462 5936); " +
      "[OSM] node diplomatic 'Embassy of Vietnam, 10 Leedon Park'. Giờ làm việc chưa xác nhận. " +
      METHOD_NOTE,
  },
]);

// Dùng cho Country.embassy (màn SOS và thẻ liên hệ của AI).
export const toCountryEmbassy = ({ name, address, phone, lat, lng }) => ({ name, address, phone, lat, lng });
