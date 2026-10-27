import { env } from "../../core/env.js";

// Ước tính chi phí một lượt gọi theo đơn giá cấu hình (VND / 1 triệu token), chỉ để thống kê và
// chặn ngân sách tra web; hoá đơn thật vẫn là trang của nhà cung cấp.
export const estimateCostVnd = ({ inputTokens = 0, outputTokens = 0 } = {}) =>
  (inputTokens * env.LLM_PRICE_INPUT_VND_PER_M + outputTokens * env.LLM_PRICE_OUTPUT_VND_PER_M) /
  1_000_000;
