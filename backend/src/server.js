import dotenv from "dotenv";

/*
 * Always load the local backend/.env and let it override any stale
 * MONGODB_URI that may already exist in the current terminal session.
 * This prevents an old exported URI from silently taking precedence.
 */
dotenv.config({
    path: ".env",
    override: true
});

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(
                `BeTravel server running at http://localhost:${PORT}`
            );
        });
    } catch (error) {
        const message = String(
            error?.message ||
                "Unknown startup error"
        );

        console.error(
            "Server startup failed:",
            message
        );

        const lower =
            message.toLowerCase();

        if (
            lower.includes("bad auth") ||
            lower.includes("authentication failed")
        ) {
            console.error(
                "MongoDB Atlas rejected the database username/password in MONGODB_URI."
            );
            console.error(
                "Check Atlas Database Access credentials. Do not change the database name in code."
            );
        } else if (
            lower.includes("server selection") ||
            lower.includes("timed out")
        ) {
            console.error(
                "Check MongoDB Atlas Network Access / IP allowlist and cluster availability."
            );
        }

        process.exit(1);
    }
};

startServer();
