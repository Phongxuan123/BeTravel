import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import authRoutes from "./routes/auth.routes.js";

import {
    errorHandler,
    notFoundHandler
} from "./middleware/error.middleware.js";

const app = express();

/* Useful behind Render/Railway/Nginx and for express-rate-limit. */
app.set("trust proxy", 1);

app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: "cross-origin"
        },
        crossOriginOpenerPolicy: {
            policy: "same-origin-allow-popups"
        }
    })
);

app.use(
    cors({
        origin:
            process.env.CLIENT_URL ||
            "http://localhost:5173",
        credentials: true
    })
);

app.use(
    express.json({ limit: "2mb" })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "2mb"
    })
);

app.use(cookieParser());

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "BeTravel API is running"
    });
});

app.use(
    "/api/auth",
    authRoutes
);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
