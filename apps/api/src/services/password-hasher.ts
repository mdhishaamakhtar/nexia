import bcrypt from "bcryptjs";

/**
 * bcrypt at cost 10 — the same algorithm and cost `Bun.password` used before the
 * move to Node, so every password hash already in the database keeps verifying
 * without a migration or a forced reset.
 */
const DEFAULT_COST = 10;

export function createBcryptHasher(cost: number = DEFAULT_COST) {
  return {
    hash(plain: string): Promise<string> {
      return bcrypt.hash(plain, cost);
    },
    verify(plain: string, hashed: string): Promise<boolean> {
      return bcrypt.compare(plain, hashed);
    },
  };
}
