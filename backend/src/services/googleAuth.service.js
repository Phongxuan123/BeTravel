import { OAuth2Client } from "google-auth-library";

export const verifyGoogleCredential = async (credential) => {
  if (!credential || typeof credential !== "string") {
    throw new Error("GOOGLE_CREDENTIAL_MISSING");
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID_MISSING");
  }

  const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  let ticket;

  try {
    ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch {
    throw new Error("GOOGLE_CREDENTIAL_INVALID");
  }

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error("GOOGLE_CREDENTIAL_INVALID");
  }

  const { sub, email, email_verified, name, given_name, family_name, picture, iss, aud, exp } =
    payload;

  if (!sub || !email) {
    throw new Error("GOOGLE_CREDENTIAL_INVALID");
  }

  if (!email_verified) {
    throw new Error("GOOGLE_EMAIL_NOT_VERIFIED");
  }

  if (iss !== "https://accounts.google.com" && iss !== "accounts.google.com") {
    throw new Error("GOOGLE_CREDENTIAL_INVALID");
  }

  if (aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CREDENTIAL_INVALID");
  }

  if (typeof exp !== "number" || exp * 1000 <= Date.now()) {
    throw new Error("GOOGLE_CREDENTIAL_EXPIRED");
  }

  return {
    googleId: sub,
    email: email.trim().toLowerCase(),
    emailVerified: true,
    fullName:
      name?.trim() || [given_name, family_name].filter(Boolean).join(" ").trim() || "Google User",
    picture: picture || "",
  };
};
