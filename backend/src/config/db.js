import mongoose from "mongoose";

import { env } from "./env.js";

const sanitizeMongoUriForLog = (uri) => {
  try {
    const parsed = new URL(uri);

    return {
      username: parsed.username ? decodeURIComponent(parsed.username) : "",
      host: parsed.host,
      database: parsed.pathname ? parsed.pathname.replace(/^\//, "") : "",
    };
  } catch {
    return {
      username: "",
      host: "",
      database: "",
    };
  }
};

const connectDB = async () => {
  // env.js đã validate MONGODB_URI bằng Zod lúc khởi động (fail fast) -- không
  // cần kiểm tra lại ở đây.
  const uri = env.MONGODB_URI;
  const safeInfo = sanitizeMongoUriForLog(uri);

  console.log("MongoDB connection target:", {
    username: safeInfo.username,
    host: safeInfo.host,
    database: safeInfo.database || "(not specified in URI)",
  });

  await mongoose.connect(uri, {
    /*
     * IMPORTANT:
     * BeTravel uses exactly the database written in MONGODB_URI.
     * Do not override dbName here.
     *
     * Example URI:
     * mongodb+srv://user:password@<cluster-host>/WDPPROJECT01
     * => mongoose.connection.name === "WDPPROJECT01"
     */
    serverSelectionTimeoutMS: 10000,
    // Atlas M0 giới hạn kết nối chặt -- không đặt pool lớn hơn mức này (Rủi ro R14).
    maxPoolSize: env.MONGO_MAX_POOL_SIZE,
  });

  console.log("MongoDB Atlas connected successfully");
  console.log("Database name:", mongoose.connection.name);
};

export default connectDB;
