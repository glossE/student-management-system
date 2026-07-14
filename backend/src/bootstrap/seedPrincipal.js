import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";

// Runs on every startup. Creates the initial PRINCIPAL from env vars if it does
// not already exist, so a fresh production database is immediately usable.
// Idempotent: if the account exists, it is left untouched (password not reset).
export async function ensurePrincipal() {
  const email = process.env.PRINCIPAL_EMAIL?.toLowerCase().trim();
  const password = process.env.PRINCIPAL_PASSWORD;
  if (!email || !password) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  await prisma.user.create({
    data: { name: "Principal", email, passwordHash: await hashPassword(password), role: "PRINCIPAL" },
  });
  console.log(`Seeded initial principal account: ${email}`);
}
