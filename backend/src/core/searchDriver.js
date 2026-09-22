import { env } from "./env.js";

// Chỉ báo trạng thái cấu hình cho /api/health -- B4 sẽ thay bằng kiểm tra thật
// (ping Atlas Search) khi lớp RAG được dựng.
export const searchDriverStatus = () => env.SEARCH_DRIVER;
