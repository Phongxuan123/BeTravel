/*
 * Bệnh viện (có khoa cấp cứu) và đồn cảnh sát ở các thành phố lớn của Úc, đối chiếu ngày 21/10/2026.
 *
 * Mỗi điểm khớp giữa trang của cơ quan nhà nước (bang/lãnh thổ) và OpenStreetMap (toạ độ). CHƯA gọi điện xác nhận.
 * Số 000 là số khẩn cấp quốc gia: gặp nguy hiểm thì gọi 000 trước, các số dưới đây là tổng đài của cơ sở.
 * CHƯA nhập (thiếu nguồn đủ tin, không đoán):
 *   - Nhà thuốc: không tìm được danh sách nhà thuốc 24 giờ có nguồn chính thức, các trang tổng hợp mâu thuẫn nhau
 *     (ở Sydney, Brisbane, Perth gần như không có nhà thuốc 24 giờ trong khu trung tâm).
 *   - Đồn Brisbane City và đồn ở Canberra: chưa có số điện thoại và giờ hiện hành từ trang cảnh sát.
 */
import { VERIFIED_ON } from "./auVietnamMissions.js";

export { VERIFIED_ON };

const METHOD_NOTE =
  "Đối chiếu nguồn online 21/10/2026, CHƯA gọi điện xác nhận: gặp nguy hiểm hãy gọi 000.";

const hospital = (fields) => ({ countryCode: "AU", type: "hospital", ...fields });
const police = (fields) => ({ countryCode: "AU", type: "police", ...fields });

export const AU_SUPPORT_PLACES = Object.freeze([
  hospital({
    name: "Royal Prince Alfred Hospital (Sydney)",
    nameLocal: "Royal Prince Alfred Hospital",
    address: "Missenden Rd, Camperdown NSW 2050, Úc",
    phone: "+61 2 9515 6111",
    website: "https://slhd.health.nsw.gov.au/rpa",
    openHours: "",
    lat: -33.889186,
    lng: 151.181472,
    source: `[GOV] slhd.health.nsw.gov.au (tổng đài và khoa cấp cứu cùng số 9515 6111); [OSM] hospital, Missenden Road. ${METHOD_NOTE}`,
  }),
  hospital({
    name: "St Vincent's Hospital Sydney",
    nameLocal: "St Vincent's Hospital Sydney",
    address: "390 Victoria St, Darlinghurst NSW 2010, Úc",
    phone: "+61 2 8382 1111",
    website: "https://www.svhs.org.au",
    openHours: "",
    lat: -33.8801299,
    lng: 151.2211799,
    source: `[GOV] svhs.org.au/contact (390 Victoria Street; 8382 1111); [OSM] hospital, Victoria Street. ${METHOD_NOTE}`,
  }),
  hospital({
    name: "Royal Melbourne Hospital (Parkville)",
    nameLocal: "The Royal Melbourne Hospital",
    address: "300 Grattan St, Parkville VIC 3052, Úc",
    phone: "+61 3 9342 7000",
    website: "https://www.thermh.org.au",
    openHours: "Khoa cấp cứu 24/7",
    lat: -37.7991669,
    lng: 144.9562172,
    source: `[GOV] thermh.org.au (switchboard 9342 7000; cấp cứu 24 giờ); [OSM] hospital, Grattan Street. ${METHOD_NOTE}`,
  }),
  hospital({
    name: "Royal Brisbane and Women's Hospital",
    nameLocal: "Royal Brisbane and Women's Hospital",
    address: "Cnr Butterfield St và Bowen Bridge Rd, Herston QLD 4029, Úc",
    phone: "+61 7 3646 8111",
    website: "https://metronorth.health.qld.gov.au/rbwh",
    openHours: "",
    lat: -27.4477301,
    lng: 153.0268109,
    source: `[GOV] metronorth.health.qld.gov.au/rbwh (địa chỉ, (07) 3646 8111); [OSM] hospital, Butterfield Street. ${METHOD_NOTE}`,
  }),
  hospital({
    name: "Royal Perth Hospital",
    nameLocal: "Royal Perth Hospital",
    address: "197 Wellington St, Perth WA 6000, Úc",
    phone: "+61 8 9224 2244",
    website: "https://royalperthhospital.health.wa.gov.au",
    openHours: "Khoa cấp cứu 24/7 (bệnh viện người lớn)",
    lat: -31.954677,
    lng: 115.8678268,
    source: `[GOV] royalperthhospital.health.wa.gov.au (197 Wellington St; (08) 9224 2244; cấp cứu 24 giờ, chỉ người lớn); [OSM] hospital, 189 Wellington Street. ${METHOD_NOTE}`,
  }),
  hospital({
    name: "Royal Adelaide Hospital",
    nameLocal: "Royal Adelaide Hospital",
    address: "Port Rd, Adelaide SA 5000, Úc",
    phone: "+61 8 7074 0000",
    website: "https://www.sahealth.sa.gov.au",
    openHours: "Khoa cấp cứu 24/7",
    lat: -34.9206029,
    lng: 138.5866101,
    source: `[GOV] sahealth.sa.gov.au (Port Road; (08) 7074 0000; cấp cứu 24 giờ); [OSM] hospital, Port Road. ${METHOD_NOTE}`,
  }),
  hospital({
    name: "Canberra Hospital (Garran)",
    nameLocal: "Canberra Hospital",
    address: "Yamba Dr, Garran ACT 2605, Úc",
    phone: "+61 2 5124 0000",
    website: "https://www.canberrahealthservices.act.gov.au",
    openHours: "",
    lat: -35.346247,
    lng: 149.0997033,
    source:
      "[GOV] canberrahealthservices.act.gov.au ((02) 5124 0000; khoa cấp cứu ở Garran); " +
      `[OSM] điểm 'Canberra Hospital, Yamba Drive' (trạm xe buýt trong khuôn viên, KHÔNG phải cổng cấp cứu). ${METHOD_NOTE}`,
  }),
  hospital({
    name: "Gold Coast University Hospital (Southport)",
    nameLocal: "Gold Coast University Hospital",
    address: "1 Hospital Blvd, Southport QLD 4215, Úc",
    phone: "+61 7 5687 0000",
    website: "https://www.goldcoast.health.qld.gov.au",
    openHours: "Khoa cấp cứu 24/7",
    lat: -27.959679,
    lng: 153.3817841,
    source: `[GOV] goldcoast.health.qld.gov.au (1 Hospital Blvd; 07 5687 0000; cấp cứu 24 giờ); [OSM] hospital, Hospital Boulevard. ${METHOD_NOTE}`,
  }),
  police({
    name: "Day Street Police Station (Sydney)",
    nameLocal: "Day Street Police Station",
    address: "192 Day St, Sydney NSW 2000, Úc",
    phone: "+61 2 9265 6499",
    website: "https://www.police.nsw.gov.au",
    openHours: "Mở cửa 24/7",
    lat: -33.8753972,
    lng: 151.2038996,
    source: `[GOV] police.nsw.gov.au (Sydney City PAC, 192 Day St; 9265 6499; mở 24 giờ); [OSM] police, 192 Day Street. ${METHOD_NOTE}`,
  }),
  police({
    name: "Melbourne West Police Station",
    nameLocal: "Melbourne West Police Station",
    address: "313 Spencer St, Melbourne VIC 3008, Úc",
    phone: "+61 3 9624 3999",
    website: "https://www.police.vic.gov.au/melbourne-west-police-station",
    openHours: "Quầy và điện thoại 24/7",
    lat: -37.8135266,
    lng: 144.9512028,
    source: `[GOV] police.vic.gov.au (313 Spencer St; (03) 9624 3999; quầy 24 giờ); [OSM] police, 313 Spencer Street. ${METHOD_NOTE}`,
  }),
  police({
    name: "Perth Police Station (Northbridge)",
    nameLocal: "Perth Police Station",
    address: "2 Fitzgerald St (góc Roe St), Northbridge WA 6003, Úc",
    phone: "+61 8 9422 7111",
    website: "https://www.police.wa.gov.au",
    openHours: "Mở cửa 24/7",
    lat: -31.9466458,
    lng: 115.8525064,
    source: `[GOV] police.wa.gov.au (2 Fitzgerald St; (08) 9422 7111; 24 giờ); [OSM] police, 2 Fitzgerald Street. ${METHOD_NOTE}`,
  }),
  police({
    name: "Adelaide Police Station",
    nameLocal: "Adelaide Police Station",
    address: "176 Grenfell St, Adelaide SA 5000, Úc",
    phone: "+61 8 7322 4800",
    website: "https://www.police.sa.gov.au",
    openHours: "",
    lat: -34.9236104,
    lng: 138.6077479,
    source: `[GOV] police.sa.gov.au (Grenfell St; 7322 4800; giờ làm việc chưa xác nhận); [OSM] police, 176 Grenfell Street. ${METHOD_NOTE}`,
  }),
  police({
    name: "Surfers Paradise Police Station (Gold Coast)",
    nameLocal: "Surfers Paradise Police Station",
    address: "23 Orchid Ave, Surfers Paradise QLD 4217, Úc",
    phone: "+61 7 5657 6888",
    website: "https://www.police.qld.gov.au/station/surfers-paradise-station",
    openHours: "",
    lat: -28.0003639,
    lng: 153.4296735,
    source: `[GOV] police.qld.gov.au (23 Orchid Ave; (07) 5657 6888; giờ làm việc chưa xác nhận); [OSM] police, Orchid Avenue. ${METHOD_NOTE}`,
  }),
]);
