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

const startServer = async () => {
  try {
    await connectDB();

    // Worker job queue (collection `jobs`, khong can Redis -- xem CLAUDE.md B.11).
    // Handler that (reindex/purge chunk) duoc dang ky o B4; gio moi job tam thoi
    // duoc danh dau 'done' de khong ket qua doi vo han.
    startJobWorker();

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
