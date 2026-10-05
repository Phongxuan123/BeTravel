import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../core/env.js";

export const generateAccessToken = (user) => {
  if (!env.JWT_ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET is missing");
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES,
    },
  );
};

export const verifyAccessToken = (token) => {
  if (!env.JWT_ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET is missing");
  }

  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};

export const generateRefreshToken = () => crypto.randomBytes(64).toString("hex");

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
