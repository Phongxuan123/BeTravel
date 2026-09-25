import GeoAlert from "../models/GeoAlert.js";
import { RiskLevel } from "../core/constants.js";
import { parsePagination, buildPageMeta } from "../core/pagination.js";

// ── Admin CRUD (dung voi core/adminCrudController.js) ───────────────────
export const listGeoAlertsAdmin = async (query) => {
  const pagination = parsePagination(query);
  const filter = {};
  if (query.countryCode) filter.countryCode = query.countryCode;
  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    GeoAlert.find(filter).sort({ effectiveFrom: -1 }).skip(pagination.skip).limit(pagination.limit),
    GeoAlert.countDocuments(filter),
  ]);

  return { items, meta: buildPageMeta(pagination, total) };
};

export const getGeoAlertById = async (id) => GeoAlert.findById(id);

export const createGeoAlert = async (data, actorId) =>
  GeoAlert.create({ ...data, createdBy: actorId, updatedBy: actorId });

export const updateGeoAlert = async (id, data, actorId) =>
  GeoAlert.findByIdAndUpdate(id, { ...data, updatedBy: actorId }, { returnDocument: "after" });

export const deleteGeoAlert = async (id) => GeoAlert.findByIdAndDelete(id);

// ── Cong khai (B8 muc 2) ──────────────────────────────────────────────────
const SEVERITY_ORDER = { [RiskLevel.DANGER]: 0, [RiskLevel.WARN]: 1, [RiskLevel.INFO]: 2 };

// So luong geo alert 'area' dang published cua MOT quoc gia rat nho (vai
// chuc ban ghi) -- tinh khoang cach bang Haversine ngay trong ung dung don
// gian hon han dung $geoWithin/$centerSphere (moi alert co BAN KINH RIENG,
// khong phai mot ban kinh co dinh cho ca truy van) (Rule 9 KISS).
function haversineMeters(lat1, lng1, lat2, lng2) {
  const EARTH_RADIUS_M = 6_371_000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/*
 * Co toa do -> alert 'area' trong ban kinh + alert 'country'. Khong co toa
 * do (tu choi GPS) -> CHI alert 'country', khong bao gio tra rong tuyet doi
 * chi vi thieu vi tri (PROMPT B8 muc 2). LUON loc status:'published' va con
 * hieu luc (effectiveFrom <= now <= effectiveTo, hoac effectiveTo rong).
 */
export const findApplicable = async ({ country, lat, lng }) => {
  const now = new Date();
  const baseFilter = {
    countryCode: country.toUpperCase(),
    status: "published",
    effectiveFrom: { $lte: now },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: now } }],
  };

  const countryAlerts = await GeoAlert.find({ ...baseFilter, scope: "country" });

  let areaAlerts = [];
  if (lat !== undefined && lng !== undefined) {
    const candidates = await GeoAlert.find({ ...baseFilter, scope: "area" });
    areaAlerts = candidates.filter((alert) => {
      const [centerLng, centerLat] = alert.center.coordinates;
      return haversineMeters(lat, lng, centerLat, centerLng) <= alert.radiusM;
    });
  }

  return [...countryAlerts, ...areaAlerts].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
};
