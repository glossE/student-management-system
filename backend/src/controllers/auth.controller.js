import { prisma } from "../lib/prisma.js";
import { verifyPassword } from "../lib/password.js";
import { signToken } from "../lib/token.js";
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

export async function logout(req, res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  await logAuthEvent(prisma, { userId: req.user.id, email: req.user.email, event: "LOGOUT", req });
  res.json({ message: "Logged out" });
}

export async function me(req, res) {
  res.json(req.user); // authenticate middleware already loaded the current user
}
