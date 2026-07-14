import { verifyToken } from "../lib/token.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "./errorHandler.js";

// Reads the JWT from the httpOnly cookie, verifies it, then loads the user fresh
// from the DB (so a deactivated account is rejected even with a still-valid token)
// and attaches a minimal req.user for downstream handlers.
export async function authenticate(req, _res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) throw new HttpError(401, "Not authenticated");

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new HttpError(401, "Not authenticated");

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(new HttpError(401, "Not authenticated")); // invalid or expired token
  }
}

// Role gate — allow only the listed roles, else 403. Used in Phase 3.
export const authorize =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : next(new HttpError(403, "You do not have permission to do this"));
