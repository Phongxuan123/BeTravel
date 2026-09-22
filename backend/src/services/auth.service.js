import bcrypt from "bcrypt";

import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";

import { generateAccessToken, generateRefreshToken, hashToken } from "../utils/token.js";

const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9tR1E1uR6f2N6QJ8j5N6I7A2k7x";

const PROFILE_PHONE_REGEX = /^(0|\+84)[0-9]{9}$/;

const normalizeVietnamPhone = (value) => {
  const phone = String(value ?? "")
    .trim()
    .replace(/[\s.-]/g, "");

  if (phone.startsWith("+84")) {
    return `0${phone.slice(3)}`;
  }

  return phone;
};

const serializeUser = (user) => ({
  id: user._id.toString(),
  username: user.username,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone || "",
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const createSession = async (user, refreshTokenDays) => {
  const accessToken = generateAccessToken(user);

  const refreshToken = generateRefreshToken();

  const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
    expiresAt,
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
    user: serializeUser(user),
  };
};

const normalizeUsernameBase = (email) => {
  const prefix = String(email || "")
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);

  return prefix.length >= 3 ? prefix : "traveler";
};

const generateUniqueUsername = async (email) => {
  const base = normalizeUsernameBase(email);
  let username = base;
  let counter = 1;

  while (await User.exists({ username })) {
    const suffix = String(counter);
    username = `${base.slice(0, 30 - suffix.length)}${suffix}`;
    counter += 1;
  }

  return username;
};

export const registerUser = async ({ fullName, username, email, phone = "", password }) => {
  const normalizedFullName = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = normalizeVietnamPhone(phone);

  const emailOwner = await User.findOne({ email: normalizedEmail });

  if (emailOwner) {
    throw new Error("EMAIL_EXISTS");
  }

  const phoneOwner = await User.findOne({ phone: normalizedPhone });

  if (phoneOwner) {
    throw new Error("PHONE_EXISTS");
  }

  let normalizedUsername;

  if (username) {
    normalizedUsername = username.trim().toLowerCase();
    const usernameOwner = await User.findOne({ username: normalizedUsername });
    if (usernameOwner) {
      throw new Error("USERNAME_EXISTS");
    }
  } else {
    normalizedUsername = await generateUniqueUsername(normalizedEmail);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    fullName: normalizedFullName,
    username: normalizedUsername,
    email: normalizedEmail,
    phone: normalizedPhone,
    password: passwordHash,
    role: "user",
    isActive: true,
  });

  return serializeUser(user);
};

export const loginUser = async ({ identifier, password, rememberMe }) => {
  const rawIdentifier = identifier.trim();
  const normalizedIdentifier = rawIdentifier.toLowerCase();
  const normalizedPhoneIdentifier = normalizeVietnamPhone(rawIdentifier);

  const user = await User.findOne({
    $or: [
      { email: normalizedIdentifier },
      { username: normalizedIdentifier },
      { phone: normalizedPhoneIdentifier },
    ],
  }).select("+password");

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new Error("ACCOUNT_NOT_ACTIVE");
  }

  if (!user.password) {
    throw new Error("PASSWORD_LOGIN_UNAVAILABLE");
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    throw new Error("INVALID_CREDENTIALS");
  }

  return createSession(user, rememberMe ? 7 : 1);
};

const generateUniqueGoogleUsername = async (email) => {
  const emailPrefix = email
    .split("@")[0]
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);

  const base = emailPrefix || "googleuser";
  let username = base;
  let counter = 1;

  while (await User.exists({ username })) {
    username = `${base}${counter}`;
    counter += 1;
  }

  return username;
};

export const loginWithGoogle = async ({ googleId, email, fullName }) => {
  if (!googleId || typeof googleId !== "string") {
    throw new Error("GOOGLE_ID_INVALID");
  }

  if (!email || typeof email !== "string") {
    throw new Error("GOOGLE_EMAIL_INVALID");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const normalizedFullName = fullName?.trim() || "Google User";

  let user = await User.findOne({
    googleId,
  });

  if (user) {
    if (!user.isActive) {
      throw new Error("ACCOUNT_NOT_ACTIVE");
    }

    if (!user.fullName || user.fullName === "Google User") {
      user.fullName = normalizedFullName;
      await user.save();
    }

    return createSession(user, 7);
  }

  const existingEmailUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingEmailUser) {
    /*
     * IMPORTANT:
     * BeTravel registration does not verify email ownership.
     * Therefore we must NOT silently link Google to an existing
     * password account merely because the email text matches.
     * User must login first and call /auth/google/link.
     */
    throw new Error("GOOGLE_EMAIL_ALREADY_REGISTERED");
  }

  const username = await generateUniqueGoogleUsername(normalizedEmail);

  user = await User.create({
    username,
    fullName: normalizedFullName,
    email: normalizedEmail,
    phone: "",
    googleId,
    role: "user",
    isActive: true,
  });

  return createSession(user, 7);
};

export const linkGoogleAccount = async ({ userId, googleId, email, fullName }) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (!user.isActive) {
    throw new Error("ACCOUNT_NOT_ACTIVE");
  }

  const normalizedGoogleEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (normalizedGoogleEmail !== user.email.toLowerCase()) {
    throw new Error("GOOGLE_EMAIL_MISMATCH");
  }

  const owner = await User.findOne({
    googleId,
  });

  if (owner && owner._id.toString() !== user._id.toString()) {
    throw new Error("GOOGLE_ACCOUNT_IN_USE");
  }

  user.googleId = googleId;

  if ((!user.fullName || user.fullName === "Google User") && fullName) {
    user.fullName = fullName.trim();
  }

  await user.save();

  return serializeUser(user);
};

const sanitizeProfilePhone = (value) => normalizeVietnamPhone(value);

export const updateUserProfile = async ({ userId, fullName, phone }) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (!user.isActive) {
    throw new Error("ACCOUNT_NOT_ACTIVE");
  }

  if (typeof fullName === "undefined" && typeof phone === "undefined") {
    throw new Error("PROFILE_FIELDS_REQUIRED");
  }

  if (typeof fullName !== "undefined") {
    if (typeof fullName !== "string") {
      throw new Error("FULL_NAME_INVALID");
    }

    const normalizedFullName = fullName.trim();

    if (normalizedFullName.length < 2 || normalizedFullName.length > 150) {
      throw new Error("FULL_NAME_INVALID");
    }

    user.fullName = normalizedFullName;
  }

  if (typeof phone !== "undefined") {
    if (typeof phone !== "string") {
      throw new Error("PHONE_INVALID");
    }

    const normalizedPhone = sanitizeProfilePhone(phone);

    if (normalizedPhone && !PROFILE_PHONE_REGEX.test(normalizedPhone)) {
      throw new Error("PHONE_INVALID");
    }

    if (normalizedPhone) {
      const phoneOwner = await User.findOne({
        phone: normalizedPhone,
        _id: { $ne: user._id },
      });

      if (phoneOwner) {
        throw new Error("PHONE_EXISTS");
      }
    }

    user.phone = normalizedPhone;
  }

  await user.save();

  return serializeUser(user);
};

export { serializeUser };
