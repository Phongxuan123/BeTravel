/*
 * `src/core/env.js` tự gọi dotenv.config() khi được import lần đầu -- đặt ở
 * đó thay vì ở đây vì ESM hoist mọi lệnh import lên đầu file: nếu nạp .env
 * tại server.js, các module con vẫn có thể đã đọc process.env trước khi nó
 * kịp chạy. Import env.js sớm nhất tại đây để đảm bảo toàn bộ app phía sau
 * luôn thấy .env đã nạp và đã được validate.
 */
import { env } from "./core/env.js";
import app from "./app.js";
import connectDB from "./config/db.js";
import { startJobWorker } from "./services/job.service.js";
import { registerRagJobHandlers } from "./rag/jobs/index.js";
import { warmAuRegisterChecks } from "./rag/retrieval.js";
import { warmMemorySearchCache } from "./rag/search/memory.driver.js";

const startServer = async () => {
  try {
    await connectDB();

    // Worker job queue (collection `jobs`, khong can Redis -- xem CLAUDE.md B.11).
    // Dang ky handler that (reindex/purge chunk, B4) TRUOC khi worker bat dau
    // poll, tranh mot job den truoc khi handler kip dang ky.
    registerRagJobHandlers();
    startJobWorker();
    // Không chờ: nạp chunk và nguồn luật Úc chậm không được làm server khởi động chậm.
    if (env.SEARCH_DRIVER === "memory") {
      warmMemorySearchCache()
        .then((count) => console.log(`[search] đã nạp ${count} chunk vào RAM`))
        .catch((error) => console.error("[search] nạp chunk thất bại:", error.message));
    }
    warmAuRegisterChecks().catch((error) =>
      console.error("[rag] xác minh trước luật Úc thất bại:", error.message),
    );

    app.listen(env.PORT, () => {
      console.log(`BeTravel server running at http://localhost:${env.PORT}`);
    });
  } catch (error) {
    const message = String(error?.message || "Unknown startup error");

    console.error("Server startup failed:", message);

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("bad auth") || lowerMessage.includes("authentication failed")) {
      console.error("MongoDB Atlas rejected the database username/password in MONGODB_URI.");
      console.error(
        "Check Atlas Database Access credentials. Do not change the database name in code.",
      );
    } else if (lowerMessage.includes("server selection") || lowerMessage.includes("timed out")) {
      console.error("Check MongoDB Atlas Network Access / IP allowlist and cluster availability.");
    }

    process.exit(1);
  }
};

startServer();
