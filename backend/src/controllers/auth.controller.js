import { prisma } from "../lib/prisma.js";
import { verifyPassword } from "../lib/password.js";
import { signToken } from "../lib/token.js";
import { verifyGoogleToken } from "../lib/google.js";
import { logAuthEvent } from "../services/authLog.js";
import { HttpError } from "../middleware/errorHandler.js";

const COOKIE_NAME = "token";

function cookieOptions() {
  return {
    httpOnly: true,                                   // JS can't read it (XSS-safe)
    secure: process.env.NODE_ENV === "production",    // HTTPS-only in prod, off on localhost
    sameSite: "strict",                               // not sent cross-site (CSRF-safe)
    maxAge: 7 * 24 * 60 * 60 * 1000,                  // 7 days, matches the JWT lifetime
  };
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function login(req, res) {
  const email = String(req.body?.email ?? "").toLowerCase().trim();
  const password = String(req.body?.password ?? "");
  if (!email || !password) throw new HttpError(400, "Email and password are required");

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user && user.isActive && (await verifyPassword(password, user.passwordHash));

  if (!ok) {
    await logAuthEvent(prisma, { userId: user?.id, email, event: "LOGIN_FAILED", req });
    // Same generic message whether the email is unknown or the password is wrong,
    // so an attacker can't discover which emails are registered.
    throw new HttpError(401, "Invalid email or password");
  }

  const token = signToken({ sub: user.id, role: user.role, email: user.email });
  res.cookie(COOKIE_NAME, token, cookieOptions());

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logAuthEvent(prisma, { userId: user.id, email: user.email, event: "LOGIN", req });

  res.json(publicUser(user));
}

export async function googleLogin(req, res) {
  const credential = req.body?.credential;
  if (!credential) throw new HttpError(400, "Missing Google credential");
  if (!process.env.GOOGLE_CLIENT_ID) throw new HttpError(503, "Google sign-in is not configured");

  let payload;
  try {
    payload = await verifyGoogleToken(credential); // verifies signature + audience
  } catch {
    throw new HttpError(401, "Invalid Google token");
  }

  const email = String(payload.email ?? "").toLowerCase().trim();
  if (!email || payload.email_verified !== true) {
    throw new HttpError(401, "Google account email is not verified");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // The gate: only a pre-provisioned, active staff account may sign in with Google.
  if (!user || !user.isActive) {
    await logAuthEvent(prisma, { userId: user?.id, email, event: "LOGIN_FAILED", req });
    throw new HttpError(403, "This Google account is not authorized to sign in");
  }

  const token = signToken({ sub: user.id, role: user.role, email: user.email });
  res.cookie(COOKIE_NAME, token, cookieOptions());

  await prisma.user.update({
    where: { id: user.id },
    // Record the Google link on first use so we know which google account maps here.
    data: { lastLoginAt: new Date(), ...(user.googleId ? {} : { googleId: payload.sub }) },
  });
  await logAuthEvent(prisma, { userId: user.id, email: user.email, event: "LOGIN", req });

  res.json(publicUser(user));
}

export async function logout(req, res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  await logAuthEvent(prisma, { userId: req.user.id, email: req.user.email, event: "LOGOUT", req });
  res.json({ message: "Logged out" });
}

export async function me(req, res) {
  res.json(req.user); // authenticate middleware already loaded the current user
}
