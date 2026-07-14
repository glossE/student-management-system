import { z } from "zod";

export const ROLES = ["PRINCIPAL", "ADMIN"];

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  // bcrypt only uses the first 72 bytes, so cap the length there.
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  role: z.enum(ROLES, { errorMap: () => ({ message: "Role must be PRINCIPAL or ADMIN" }) }),
});
