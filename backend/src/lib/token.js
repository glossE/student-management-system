import jwt from "jsonwebtoken";

const EXPIRES_IN = "7d";

// Reads the secret at call time so it's available after dotenv has loaded.
function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set");
  return value;
}

export function signToken(payload) {
  return jwt.sign(payload, secret(), { expiresIn: EXPIRES_IN });
}

// Throws if the token is missing, tampered with, or expired.
export function verifyToken(token) {
  return jwt.verify(token, secret());
}
