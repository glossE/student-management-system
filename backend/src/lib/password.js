import bcrypt from "bcryptjs";

// Cost factor: higher = slower to hash = harder to brute-force. 12 is a solid default.
const SALT_ROUNDS = 12;

export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// Compares a login attempt against the stored hash. bcrypt re-hashes the attempt
// with the same salt (embedded in the stored hash) and checks for a match.
export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
