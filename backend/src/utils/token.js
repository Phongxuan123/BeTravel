import crypto from "crypto";
import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET is missing");
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
    },
  );
};

export const verifyAccessToken = (token) => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET is missing");
  }

  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

export const generateRefreshToken = () => crypto.randomBytes(64).toString("hex");

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
