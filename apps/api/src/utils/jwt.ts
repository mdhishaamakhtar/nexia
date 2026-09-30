import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import type { Config } from "../config/config";

const jwtClaimsSchema = z.object({
  user_id: z.number(),
  iat: z.number(),
  exp: z.number(),
});

export type JWTClaims = z.infer<typeof jwtClaimsSchema>;

function getSecret(cfg: Config): Uint8Array {
  return new TextEncoder().encode(cfg.server.jwt_secret);
}

export async function generateToken(userId: number, cfg: Config): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ user_id: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + cfg.server.jwt_expiry_minutes * 60)
    .sign(getSecret(cfg));
}

export async function validateToken(token: string, cfg: Config): Promise<JWTClaims> {
  // Pinning the algorithm means a token can only ever be checked the way it
  // was meant to be signed.
  const { payload } = await jwtVerify(token, getSecret(cfg), { algorithms: ["HS256"] });
  return jwtClaimsSchema.parse(payload);
}
