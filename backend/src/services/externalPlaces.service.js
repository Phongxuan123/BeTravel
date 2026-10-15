import { getJson } from "serpapi";

import { env } from "../core/env.js";
import { AppError, ErrorCode } from "../core/errors.js";
import { haversineMeters } from "../utils/geo.js";

/*
 * Lop dia diem BO SUNG tu ben thu ba, chon bang PLACES_PROVIDER:
 *   osm     OpenStreetMap qua Overpass (mien phi, khong can key)
 *   serpapi Google Maps qua SerpApi (engine google_maps, tra phi theo luot)
 *   mock    du lieu mau co dinh cho dev/test
 *
 * [!] Day KHONG phai du lieu da xac minh: moi ket qua luon gan verified:false va
 * `source` ten nguon de client hien nhan "chua xac minh", tach han khoi
 * support_locations (diem do admin goi dien xac minh). Khong ghi gi vao DB.
 *
 * Bao ve nha cung cap: (1) chi cho loc theo `type` trong danh sach co dinh, KHONG
 * nhan chuoi tim kiem/truy van tu do -- tranh bien endpoint cong khai thanh proxy;
 * (2) cache theo loai + o ~1 km; (3) tran luot goi moi ngay; (4) rate limit theo IP o route.
 */

export const GOOGLE_MAPS_SOURCE = "google_maps";
export const OSM_SOURCE = "openstreetmap";

// Tu khoa tim kiem theo loai. "embassy" tim dai su quan Viet Nam (nguoi dung la cong dan Viet Nam).
const SEARCH_TERM_BY_TYPE = Object.freeze({
  embassy: "Vietnam embassy",
  hospital: "hospital",
  police: "police station",
  pharmacy: "pharmacy",
});

const MAP_ZOOM = 14;
const MAX_RESULTS = 20;
// 2 chu so thap phan ~ 1.1 km: cac truy van trong cung o dung chung mot ket qua cache.
const CELL_DECIMALS = 2;
const MAX_CACHE_ENTRIES = 500;
const MS_PER_MINUTE = 60_000;
// SerpApi tra loi 200 kem `error` nay khi truy van hop le nhung khong co ket qua.
const NO_RESULTS_PATTERN = /hasn't returned any results/i;

const cache = new Map();
const usage = { day: "", count: 0 };

export const resetExternalPlacesState = () => {
  cache.clear();
  usage.day = "";
  usage.count = 0;
};

const upstreamError = () =>
  new AppError(
    ErrorCode.UPSTREAM_ERROR,
    "Chưa lấy được địa điểm bổ sung lúc này. Vui lòng thử lại sau.",
  );

// Chuan hoa 1 ket qua cua SerpApi; bo qua ket qua thieu ten hoac toa do hop le.
const normalizeOne = (raw, type) => {
  const lat = Number(raw?.gps_coordinates?.latitude);
  const lng = Number(raw?.gps_coordinates?.longitude);
  if (!raw?.title || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    placeId: String(raw.place_id ?? raw.data_id ?? ""),
    name: String(raw.title),
    type,
    category: String(raw.type ?? raw.types?.[0] ?? ""),
    address: String(raw.address ?? ""),
    phone: String(raw.phone ?? ""),
    website: String(raw.website ?? ""),
    openState: String(raw.open_state ?? ""),
    rating: typeof raw.rating === "number" ? raw.rating : null,
    reviews: typeof raw.reviews === "number" ? raw.reviews : null,
    // GeoJSON LUON la [lng, lat], giong support_locations de client dung chung code ve ghim.
    location: { type: "Point", coordinates: [lng, lat] },
    verified: false,
    source: GOOGLE_MAPS_SOURCE,
  };
};

export const normalizeLocalResults = (json, type) => {
  // Truy van khop dung 1 dia diem thi SerpApi tra place_results thay vi local_results.
  const rawResults = json?.local_results ?? (json?.place_results ? [json.place_results] : []);
  return rawResults.map((raw) => normalizeOne(raw, type)).filter(Boolean);
};

const withTimeout = (promise, ms) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("PLACES_TIMEOUT")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

// Thu vien serpapi reject bang CHUOI JSON ('{"error": "..."}'), khong phai Error -- doc ra thong
// diep thuan de log va nhan dien "khong co ket qua". Chi lay truong error/message, khong in nguyen doi tuong.
export const describeSerpApiFailure = (failure) => {
  if (failure instanceof Error) return failure.message;
  if (typeof failure !== "string") return String(failure?.error ?? failure?.message ?? "unknown");
  try {
    return String(JSON.parse(failure).error ?? failure);
  } catch {
    return failure;
  }
};

const fetchFromSerpApi = async ({ lat, lng, type }) => {
  let json;
  try {
    json = await withTimeout(
      getJson({
        engine: "google_maps",
        type: "search",
        q: SEARCH_TERM_BY_TYPE[type],
        ll: `@${lat},${lng},${MAP_ZOOM}z`,
        hl: "vi",
        api_key: env.SERPAPI_KEY,
      }),
      env.PLACES_TIMEOUT_MS,
    );
  } catch (failure) {
    const reason = describeSerpApiFailure(failure);
    if (NO_RESULTS_PATTERN.test(reason)) return [];
    throw new Error(reason, { cause: failure });
  }
  if (json?.error) {
    if (NO_RESULTS_PATTERN.test(json.error)) return [];
    throw new Error(json.error);
  }
  return normalizeLocalResults(json, type);
};

// Du lieu mau co dinh (toa do that cua Dai su quan Viet Nam tai Seoul) -- chi cho dev/test.
const fetchFromMock = async ({ type }) =>
  normalizeLocalResults(
    {
      local_results: [
        {
          title: "[Dữ liệu mẫu] Đại sứ quán Việt Nam tại Seoul",
          place_id: "mock-place-1",
          type: "Embassy",
          address: "123 Yeongdong-daero, Gangnam-gu, Seoul",
          phone: "+82 2-3141-1400",
          gps_coordinates: { latitude: 37.5385, longitude: 126.9715 },
        },
      ],
    },
    type,
  );

// ── OpenStreetMap (Overpass) ──────────────────────────────────────────────
/*
 * Moi loai la danh sach bo loc the OSM, khop CHINH XAC (khong regex). Thu tu cung quan trong:
 * the dat TRUOC, `around` dat SAU. Do thuc te: dat around truoc hoac dung regex tren ban kinh
 * lon lam Overpass tra 504; dang nay chay ~2 giay.
 * "embassy" chi lay co quan ngoai giao cua Viet Nam (country=VN), vi nguoi dung la cong dan Viet Nam.
 */
const OSM_FILTERS_BY_TYPE = Object.freeze({
  embassy: [
    '["diplomatic"="embassy"]["country"="VN"]',
    '["diplomatic"="consulate"]["country"="VN"]',
  ],
  hospital: ['["amenity"="hospital"]'],
  police: ['["amenity"="police"]'],
  pharmacy: ['["amenity"="pharmacy"]'],
});

// Dai su/lanh su rat thua (co the o thanh pho khac, vd Busan cach Seoul ~325 km) nen ban kinh lon; the hiem
// nen van nhanh. Loai day dac (benh vien, don canh sat, nha thuoc) dung ban kinh nho: 10 km o trung tam
// Seoul mat ~10 giay hoac 504 tren Overpass cong cong.
const OSM_RADIUS_M_BY_TYPE = Object.freeze({
  embassy: 500_000,
  hospital: 5_000,
  police: 5_000,
  pharmacy: 3_000,
});

const OVERPASS_QUERY_TIMEOUT_S = 25;

// lat/lng/country da qua Zod (so thuc, hoac 2 chu cai) nen noi chuoi nay khong the chen ma Overpass QL.
// Theo quoc gia: loc `target=<ISO2>` (nuoc so tai cua co quan ngoai giao) thay cho `around`, khong can toa do.
export const buildOverpassQuery = ({ lat, lng, country, type }) => {
  const scope = country
    ? `["target"="${country}"]`
    : `(around:${OSM_RADIUS_M_BY_TYPE[type]},${lat},${lng})`;
  const statements = OSM_FILTERS_BY_TYPE[type].map((filter) => `nwr${filter}${scope};`).join("");
  return `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_S}];(${statements});out center tags;`;
};

const joinAddress = (tags) =>
  tags["addr:full"] ??
  [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"] ?? tags["addr:town"],
    tags["addr:country"],
  ]
    .filter(Boolean)
    .join(", ");

// Node co lat/lon; way/relation chi co `center` (do `out center`). Bo qua diem khong ten hoac toa do hong.
const normalizeOsmElement = (element, type) => {
  const tags = element?.tags ?? {};
  const lat = Number(element?.lat ?? element?.center?.lat);
  const lng = Number(element?.lon ?? element?.center?.lon);
  const name = tags["name:vi"] ?? tags["name:en"] ?? tags.name;
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    placeId: `${element.type}/${element.id}`,
    name: String(name),
    type,
    category: String(tags.diplomatic ?? tags.amenity ?? tags.office ?? ""),
    address: String(joinAddress(tags)),
    phone: String(tags.phone ?? tags["contact:phone"] ?? ""),
    website: String(tags.website ?? tags["contact:website"] ?? ""),
    // Chuoi opening_hours cua OSM (vd "Mo-Fr 09:00-17:00"), khong phai trang thai mo/dong tuc thoi.
    openState: String(tags.opening_hours ?? ""),
    rating: null,
    reviews: null,
    location: { type: "Point", coordinates: [lng, lat] },
    verified: false,
    source: OSM_SOURCE,
  };
};

export const normalizeOverpassElements = (json, type) =>
  (json?.elements ?? []).map((element) => normalizeOsmElement(element, type)).filter(Boolean);

// Overpass cong cong thinh thoang tra 502/503/504 roi lan sau lai chay duoc: thu lai MOT lan, khong hon
// (mien phi nhung dung chung, khong nen don dap).
const OVERPASS_MAX_ATTEMPTS = 2;
const OVERPASS_RETRY_DELAY_MS = 1_000;
const TRANSIENT_HTTP_STATUSES = new Set([429, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const postOverpass = (body) =>
  fetch(env.PLACES_OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": env.PLACES_USER_AGENT,
    },
    body,
    signal: AbortSignal.timeout(env.PLACES_TIMEOUT_MS),
  });

const fetchFromOverpass = async (params) => {
  const body = new URLSearchParams({ data: buildOverpassQuery(params) });
  for (let attempt = 1; ; attempt += 1) {
    const response = await postOverpass(body);
    if (response.ok) return normalizeOverpassElements(await response.json(), params.type);

    const canRetry =
      TRANSIENT_HTTP_STATUSES.has(response.status) && attempt < OVERPASS_MAX_ATTEMPTS;
    if (!canRetry) throw new Error(`Overpass HTTP ${response.status}`);
    await sleep(OVERPASS_RETRY_DELAY_MS);
  }
};

const FETCHERS = Object.freeze({
  osm: fetchFromOverpass,
  serpapi: fetchFromSerpApi,
  mock: fetchFromMock,
});

const todayKey = () => new Date().toISOString().slice(0, 10);

// Tang bo dem luot goi that; vuot tran thi tu choi truoc khi ton quota SerpApi.
const consumeDailyAllowance = () => {
  const day = todayKey();
  if (usage.day !== day) {
    usage.day = day;
    usage.count = 0;
  }
  if (usage.count >= env.PLACES_DAILY_LIMIT) {
    throw new AppError(
      ErrorCode.QUOTA_EXCEEDED,
      "Tính năng địa điểm bổ sung đã hết lượt hôm nay. Vẫn có thể dùng các địa điểm đã xác minh.",
    );
  }
  usage.count += 1;
};

const cacheKeyOf = ({ lat, lng, country, type }) =>
  country
    ? `${type}:country:${country}`
    : `${type}:${lat.toFixed(CELL_DECIMALS)}:${lng.toFixed(CELL_DECIMALS)}`;

const loadPlaces = async (params) => {
  const key = cacheKeyOf(params);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.places;

  consumeDailyAllowance();
  let places;
  try {
    places = await FETCHERS[env.PLACES_PROVIDER](params);
  } catch (error) {
    // Chi log message: khong log params de api_key khong lot vao log.
    console.error(`[places:${env.PLACES_PROVIDER}] loi:`, error.message);
    throw upstreamError();
  }

  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(key, { places, expiresAt: Date.now() + env.PLACES_CACHE_TTL_MINUTES * MS_PER_MINUTE });
  return places;
};

/**
 * @returns dia diem ben thu ba theo `type`: gan (lat, lng) kem distanceMeters va sap xep gan -> xa, hoac
 * (khong co toa do) dai su quan Viet Nam cua `country`, distanceMeters null va sap xep theo ten.
 */
export const searchExternalPlaces = async ({ lat, lng, country, type }) => {
  const hasPoint = lat !== undefined && lng !== undefined;
  if (!hasPoint && env.PLACES_PROVIDER === "serpapi") {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      "Nguồn dữ liệu hiện tại cần lat và lng để tìm địa điểm.",
    );
  }

  const places = await loadPlaces(hasPoint ? { lat, lng, type } : { country, type });
  if (!hasPoint) {
    return places
      .map((place) => ({ ...place, distanceMeters: null }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, MAX_RESULTS);
  }
  return places
    .map((place) => ({
      ...place,
      distanceMeters: Math.round(
        haversineMeters(lat, lng, place.location.coordinates[1], place.location.coordinates[0]),
      ),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, MAX_RESULTS);
};
