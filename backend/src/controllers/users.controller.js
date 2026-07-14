import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { logActivity } from "../services/activityLog.js";
import { createUserSchema } from "../validation/user.schema.js";
import { formatZodError } from "../validation/student.schema.js";
import { HttpError } from "../middleware/errorHandler.js";

// Never expose passwordHash to the client.
function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  };
}

export async function listUsers(_req, res) {
  const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
  res.json(users.map(publicUser));
}

export async function createUser(req, res) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(422, "Validation failed", formatZodError(parsed.error));
  }
  const { name, email, password, role } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new HttpError(409, "A user with this email already exists");

  const passwordHash = await hashPassword(password); // hash before the transaction

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { name, email, passwordHash, role } });
    await logActivity(tx, {
      entityType: "User",
      action: "CREATE",
      entityId: created.id,
      details: { email, role },
      actor: req.user,
    });
    return created;
  });

  res.status(201).json(publicUser(user));
}

export async function setUserActive(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const isActive = Boolean(req.body?.isActive);

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new HttpError(404, "User not found");
  // Guard against a principal accidentally locking themselves out.
  if (target.id === req.user.id) throw new HttpError(400, "You cannot change your own status");

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id }, data: { isActive } });
    await logActivity(tx, {
      entityType: "User",
      action: "UPDATE",
      entityId: id,
      details: { isActive },
      actor: req.user,
    });
    return updated;
  });

  res.json(publicUser(user));
}
