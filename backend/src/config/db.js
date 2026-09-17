import mongoose from "mongoose";

const sanitizeMongoUriForLog = (uri) => {
    try {
        const parsed = new URL(uri);

        return {
            username: parsed.username
                ? decodeURIComponent(parsed.username)
                : "",
            host: parsed.host,
            database: parsed.pathname
                ? parsed.pathname.replace(/^\//, "")
                : ""
        };
    } catch {
        return {
            username: "",
            host: "",
            database: ""
        };
    }
};

const getMongoUri = () => {
    const uri = String(
        process.env.MONGODB_URI || ""
    ).trim();

    if (!uri) {
        throw new Error(
            "MONGODB_URI is missing"
        );
    }

    if (
        !uri.startsWith("mongodb://") &&
        !uri.startsWith("mongodb+srv://")
    ) {
        throw new Error(
            "MONGODB_URI is invalid"
        );
    }

    return uri;
};

const connectDB = async () => {
    const uri = getMongoUri();
    const safeInfo =
        sanitizeMongoUriForLog(uri);

    console.log(
        "MongoDB connection target:",
        {
            username: safeInfo.username,
            host: safeInfo.host,
            database:
                safeInfo.database ||
                "(not specified in URI)"
        }
    );

    await mongoose.connect(uri, {
        /*
         * IMPORTANT:
         * BeTravel uses exactly the database written in MONGODB_URI.
         * Do not override dbName here.
         *
         * Example URI:
         * mongodb+srv://user:password@cluster.mongodb.net/WDPPROJECT01
         * => mongoose.connection.name === "WDPPROJECT01"
         */
        serverSelectionTimeoutMS: 10000
    });

    console.log(
        "MongoDB Atlas connected successfully"
    );
    console.log(
        "Database name:",
        mongoose.connection.name
    );
};

export default connectDB;
