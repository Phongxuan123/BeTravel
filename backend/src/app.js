import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoose from "mongoose";

import { env } from "./core/env.js";
import { ok } from "./core/envelope.js";
import { searchDriverStatus } from "./core/searchDriver.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import publicRoutes from "./routes/public.routes.js";
import tripsRoutes from "./routes/trips.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import translateRoutes from "./routes/translate.routes.js";
import incidentProgressRoutes from "./routes/incidentProgress.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

const app = express();

/* Cần thiết sau Render/Railway/Nginx và để express-rate-limit đọc đúng IP. */
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  }),
);

app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

// mongoose.connection.readyState: 0 disconnected · 1 connected · 2 connecting · 3 disconnecting
const CONNECTION_STATE_LABELS = ["disconnected", "connected", "connecting", "disconnecting"];

/*
 * Dùng cho cron ping chống Render ngủ (xem docs/00_..., Phần B.13) và để
 * người vận hành kiểm tra nhanh trạng thái kết nối DB / search driver.
 */
app.get("/api/health", (req, res) => {
  ok(res, {
    db: CONNECTION_STATE_LABELS[mongoose.connection.readyState] ?? "disconnected",
    searchDriver: searchDriverStatus(),
    version: env.APP_VERSION,
    uptime: process.uptime(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users/trips", tripsRoutes);
app.use("/api/users/incident-progress", incidentProgressRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/translate", translateRoutes);
app.use("/api", publicRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
