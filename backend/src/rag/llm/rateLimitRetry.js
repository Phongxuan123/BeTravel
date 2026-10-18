import { getTranslationProvider } from "./index.js";

/*
 * Gọi LLM nhưng tự chờ rồi thử lại khi gặp 429 NGẮN HẠN (vượt hạn mức token/phút).
 * Thời gian chờ lấy từ thông báo "retry in Ns" của Gemini. Nếu phải chờ quá lâu (hạn mức NGÀY
 * của gói miễn phí, có thể hàng giờ) thì ném lỗi ngay thay vì treo request.
 * Dùng cho tác vụ luật Úc (tóm tắt, dịch) với model dịch riêng, để không tiêu hạn mức của chat AI.
 */

const MAX_RATE_LIMIT_RETRIES = 6;
const DEFAULT_RATE_LIMIT_WAIT_MS = 30_000;
const MAX_ACCEPTABLE_WAIT_MS = 90_000;
const MS_PER_SECOND = 1000;
const RATE_LIMIT_PATTERN = /(?:^|[^\w])429(?:[^\w]|$)/;
const RETRY_AFTER_PATTERN = /retry in (?:(\d+)h)?(?:(\d+)m)?(\d+(?:\.\d+)?)s/i;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// "retry in 9h29m48.06s" / "retry in 27.5s" -> mili giây; null nếu thông báo không nêu.
export const parseRetryAfterMs = (message) => {
  const match = RETRY_AFTER_PATTERN.exec(message);
  if (!match) return null;
  const [, hours = 0, minutes = 0, seconds] = match;
  const totalSeconds =
    Number(hours) * SECONDS_PER_HOUR + Number(minutes) * SECONDS_PER_MINUTE + Number(seconds);
  return Math.ceil(totalSeconds + 1) * MS_PER_SECOND;
};

export const completeWithRateLimitRetry = async (request, getProvider = getTranslationProvider) => {
  for (let retry = 0; ; retry += 1) {
    try {
      return await getProvider().complete(request);
    } catch (error) {
      const message = String(error?.message);
      const isRateLimited = RATE_LIMIT_PATTERN.test(message);
      const waitMs = parseRetryAfterMs(message) ?? DEFAULT_RATE_LIMIT_WAIT_MS;
      const shouldGiveUp =
        !isRateLimited || retry >= MAX_RATE_LIMIT_RETRIES || waitMs > MAX_ACCEPTABLE_WAIT_MS;
      if (shouldGiveUp) throw error;
      await wait(waitMs);
    }
  }
};
