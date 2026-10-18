import { env } from "../core/env.js";
import { AppError, ErrorCode } from "../core/errors.js";

/*
 * Lớp HTTP mỏng gọi Federal Register of Legislation (OData v4, không cần key).
 * Chỉ làm ba việc: dựng URL, đặt timeout, dịch lỗi HTTP sang ErrorCode của
 * Be.Travel. Không biết gì về nghiệp vụ -- chuẩn hóa dữ liệu nằm ở service.
 */

const UPSTREAM_UNAVAILABLE_MESSAGE =
  "Chưa lấy được dữ liệu từ Federal Register of Legislation. Vui lòng thử lại sau.";

const upstreamError = () => new AppError(ErrorCode.UPSTREAM_ERROR, UPSTREAM_UNAVAILABLE_MESSAGE);

// Khóa OData ($top, $filter, ...) giữ nguyên ký tự $; chỉ mã hóa phần giá trị.
const buildQueryString = (query = {}) =>
  Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");

const buildUrl = (path, query) => {
  const base = env.AU_LEGISLATION_API_URL.replace(/\/$/, "");
  const queryString = buildQueryString(query);
  return `${base}/${path}${queryString ? `?${queryString}` : ""}`;
};

const request = async (path, { query, accept, timeoutMs }) => {
  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      headers: { Accept: accept, "User-Agent": env.AU_LEGISLATION_USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (failure) {
    // Timeout hoặc mất mạng: ghi tên lỗi để vận hành biết, không lộ ra client.
    console.warn(`[au-legislation] ${path.split("?")[0]} thất bại: ${failure?.name}`);
    throw upstreamError();
  }

  if (response.status === 404) {
    throw new AppError(ErrorCode.NOT_FOUND, "Không tìm thấy văn bản trong nguồn luật Úc.");
  }
  if (!response.ok) {
    // Không đưa body của nguồn ra ngoài (có thể chứa stacktrace nội bộ của họ).
    console.warn(`[au-legislation] ${path.split("?")[0]} trả HTTP ${response.status}`);
    throw upstreamError();
  }
  return response;
};

export const getJson = async (path, query) => {
  const response = await request(path, {
    query,
    accept: "application/json",
    timeoutMs: env.AU_LEGISLATION_TIMEOUT_MS,
  });
  try {
    return await response.json();
  } catch {
    throw upstreamError();
  }
};

// Tải file văn bản lớn (XHTML trong EPUB); timeout dài hơn truy vấn metadata.
export const getText = async (path) => {
  const response = await request(path, {
    accept: "*/*",
    timeoutMs: env.AU_LEGISLATION_CONTENT_TIMEOUT_MS,
  });
  try {
    return await response.text();
  } catch {
    throw upstreamError();
  }
};
