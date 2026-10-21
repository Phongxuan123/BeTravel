import { env } from "../core/env.js";
import { AppError, ErrorCode } from "../core/errors.js";
import { createTtlCache } from "../utils/ttlCache.js";

/*
 * Tìm địa điểm theo CHỮ (tên, địa chỉ, khu vực) để bản đồ bay tới đúng chỗ, bằng Nominatim của OpenStreetMap
 * (miễn phí, không cần key, cùng hệ dữ liệu với lớp gợi ý Overpass). Kết quả CHƯA xác minh: chỉ dùng để
 * định hướng bản đồ, không thay thế địa điểm hỗ trợ đã xác minh.
 *
 * Bảo vệ nhà cung cấp theo chính sách sử dụng của Nominatim: (1) User-Agent nhận diện ứng dụng;
 * (2) tối đa 1 yêu cầu/giây, code tự giãn cách toàn cục; (3) cache theo câu tìm kiếm; (4) trần số lượt
 * gọi thật mỗi ngày; (5) rate limit theo IP ở route. PLACES_PROVIDER=mock trả dữ liệu mẫu, không gọi mạng.
 */

export const GEOCODE_SOURCE = "openstreetmap";

const MAX_RESULTS = 8;
// Giới hạn mặc định của callNominatim cho tìm theo chữ; lớp dự phòng địa điểm hỗ trợ xin nhiều hơn.
// Nominatim cho tối đa 1 yêu cầu/giây; chừa thêm chút để không chạm ngưỡng.
const MIN_GAP_BETWEEN_CALLS_MS = 1100;
const MAX_CACHE_ENTRIES = 500;
const MS_PER_MINUTE = 60_000;
const SEARCH_LANGUAGE = "vi";

const cache = createTtlCache({
  ttlMs: env.GEOCODE_CACHE_TTL_MINUTES * MS_PER_MINUTE,
  maxEntries: MAX_CACHE_ENTRIES,
});
const usage = { day: "", count: 0 };
let queueTail = Promise.resolve();
let lastCallAt = 0;

export const resetGeocodeState = () => {
  cache.clear();
  usage.day = "";
  usage.count = 0;
  queueTail = Promise.resolve();
  lastCallAt = 0;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Xếp hàng toàn cục: mỗi lệnh gọi chờ cho đủ khoảng cách với lệnh trước, lỗi của lệnh trước không chặn lệnh sau.
const runThrottled = (task) => {
  const result = queueTail.then(async () => {
    const waitMs = Math.max(0, lastCallAt + MIN_GAP_BETWEEN_CALLS_MS - Date.now());
    if (waitMs > 0) await sleep(waitMs);
    lastCallAt = Date.now();
    return task();
  });
  queueTail = result.catch(() => undefined);
  return result;
};

const consumeDailyAllowance = () => {
  const day = new Date().toISOString().slice(0, 10);
  if (usage.day !== day) {
    usage.day = day;
    usage.count = 0;
  }
  if (usage.count >= env.GEOCODE_DAILY_LIMIT) {
    throw new AppError(
      ErrorCode.QUOTA_EXCEEDED,
      "Tính năng tìm địa điểm đã hết lượt hôm nay. Bạn vẫn có thể chọn vị trí bằng cách giữ lâu trên bản đồ.",
    );
  }
  usage.count += 1;
};

const upstreamError = () =>
  new AppError(ErrorCode.UPSTREAM_ERROR, "Chưa tìm được địa điểm lúc này. Vui lòng thử lại sau.");

// Bỏ kết quả thiếu tọa độ hợp lệ. GeoJSON LUÔN là [lng, lat], giống support_locations để client dùng chung code vẽ ghim.
export const normalizeNominatimResults = (json) => {
  if (!Array.isArray(json)) return [];
  return json
    .map((item) => {
      const lat = Number(item?.lat);
      const lng = Number(item?.lon);
      const address = String(item?.display_name ?? "");
      // Ưu tiên tên tiếng Việt, rồi tiếng Anh, rồi tên bản địa để người dùng dễ nhận ra địa điểm.
      const names = item?.namedetails ?? {};
      const name = String(
        names["name:vi"] || names["name:en"] || item?.name || address.split(",")[0] || "",
      ).trim();
      const isValid = Number.isFinite(lat) && Number.isFinite(lng) && name !== "";
      if (!isValid) return null;
      return {
        placeId: `${item.osm_type}/${item.osm_id}`,
        name,
        address,
        category: String(item.type ?? item.category ?? ""),
        location: { type: "Point", coordinates: [lng, lat] },
        verified: false,
        source: GEOCODE_SOURCE,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_RESULTS);
};

// viewbox "left,top,right,bottom" (độ); bounded=1 chỉ trả kết quả nằm trong khung đó.
const buildSearchUrl = (query, { country, viewbox, limit = MAX_RESULTS } = {}) => {
  const params = new URLSearchParams({
    format: "jsonv2",
    q: query,
    limit: String(limit),
    namedetails: "1",
    "accept-language": SEARCH_LANGUAGE,
  });
  if (country) params.set("countrycodes", country.toLowerCase());
  if (viewbox) {
    params.set("viewbox", viewbox);
    params.set("bounded", "1");
  }
  return `${env.GEOCODE_URL.replace(/\/$/, "")}/search?${params.toString()}`;
};

// Một lần gọi Nominatim: có trần theo ngày, giãn cách toàn cục, lỗi quy về UPSTREAM_ERROR.
export const searchNominatim = async (query, options = {}) => {
  consumeDailyAllowance();
  try {
    const response = await runThrottled(() =>
      fetch(buildSearchUrl(query, options), {
        headers: { "User-Agent": env.PLACES_USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(env.GEOCODE_TIMEOUT_MS),
      }),
    );
    if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
    const results = normalizeNominatimResults(await response.json());
    return options.limit ? results.slice(0, options.limit) : results;
  } catch (error) {
    // Chỉ log thông điệp: không log câu tìm kiếm của người dùng.
    console.error("[geocode] loi:", error?.message);
    throw error instanceof AppError ? error : upstreamError();
  }
};

const MOCK_RESULTS = Object.freeze([
  {
    placeId: "mock/1",
    name: "[Dữ liệu mẫu] Seoul",
    address: "Seoul, Hàn Quốc",
    category: "city",
    location: { type: "Point", coordinates: [126.978, 37.5665] },
    verified: false,
    source: GEOCODE_SOURCE,
  },
]);

/*
 * Ưu tiên tìm trong quốc gia đang chọn (người dùng thường tìm địa điểm ở nước mình đến); không có kết quả thì
 * tìm toàn cầu để không bắt người dùng đổi quốc gia chỉ vì gõ tên một nơi khác. `scope` cho client biết để gắn nhãn.
 * @returns { places, scope: "country" | "global" }
 */
export const searchPlacesByText = async ({ q, country }) => {
  if (env.PLACES_PROVIDER === "mock") return { places: [...MOCK_RESULTS], scope: "global" };

  const query = q.trim().replace(/\s+/g, " ");
  const key = `${country ?? "-"}|${query.toLowerCase()}`;
  return cache.getOrLoad(key, async () => {
    if (country) {
      const inCountry = await searchNominatim(query, { country });
      if (inCountry.length > 0) return { places: inCountry, scope: "country" };
    }
    return { places: await searchNominatim(query), scope: "global" };
  });
};
