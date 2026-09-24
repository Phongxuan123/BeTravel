import SupportLocation from "../models/SupportLocation.js";

const DEFAULT_RADIUS_KM = 20;
const DEFAULT_LIMIT = 10;

/*
 * $geoNear PHAI la stage DAU TIEN cua pipeline (CLAUDE.md Phan 6 "Cam bay da
 * biet"); loc countryCode/type dat trong `query` cua chinh no, KHONG dung
 * $match rieng truoc do -- $geoNear khong the dung sau mot stage khac.
 */
async function geoNear({ lat, lng, countryQuery, maxDistanceMeters, limit }) {
  return SupportLocation.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        spherical: true,
        query: countryQuery,
        ...(maxDistanceMeters ? { maxDistance: maxDistanceMeters } : {}),
      },
    },
    // Sap xep tang dan theo khoang cach (dung nghia den yeu cau spec), verified
    // chi la tieu chi phu khi khoang cach bang nhau -- tinh huong SOS thi diem
    // GAN NHAT quan trong hon nhan "da kiem chung".
    { $sort: { distanceMeters: 1, verified: -1 } },
    { $limit: limit },
  ]);
}

/**
 * @returns danh sach diem gan, kem `distanceMeters`. Neu khong co diem nao
 * trong ban kinh, tu dong mo rong ra TOAN BO quoc gia (khong gioi han khoang
 * cach) thay vi tra mang rong -- SOS khong duoc phep "khong tim thay gi".
 */
export const findNearby = async ({ lat, lng, country, type, radiusKm, limit }) => {
  const effectiveLimit = limit ?? DEFAULT_LIMIT;
  const countryQuery = {};
  if (country) countryQuery.countryCode = country;
  if (type) countryQuery.type = type;

  const withinRadius = await geoNear({
    lat,
    lng,
    countryQuery,
    maxDistanceMeters: (radiusKm ?? DEFAULT_RADIUS_KM) * 1000,
    limit: effectiveLimit,
  });
  if (withinRadius.length > 0) return withinRadius;

  return geoNear({ lat, lng, countryQuery, maxDistanceMeters: null, limit: effectiveLimit });
};

// Fallback khi tu choi GPS (spec B6 muc 10) -- danh sach thuan theo quoc gia,
// khong can toa do nguoi dung.
export const listByCountry = async ({ country, type }) => {
  const filter = {};
  if (country) filter.countryCode = country;
  if (type) filter.type = type;
  return SupportLocation.find(filter).sort({ verified: -1, name: 1 });
};
