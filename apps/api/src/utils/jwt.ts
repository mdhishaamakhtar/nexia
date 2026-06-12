import { SignJWT, jwtVerify } from "jose";
import type { Config } from "../config/config";

export interface JWTClaims {
  user_id: number;
  iat: number;
  exp: number;
}

function getSecret(cfg: Config): Uint8Array {
  return new TextEncoder().encode(cfg.server.jwt_secret);
}

export async function generateToken(userId: number, cfg: Config): Promise<string> {
  const expiryMinutes = cfg.server.jwt_expiry_minutes > 0 ? cfg.server.jwt_expiry_minutes : 24 * 60;
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ user_id: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + expiryMinutes * 60)
    .sign(getSecret(cfg));
}

export async function validateToken(
  token: string,
  cfg: Config,
): Promise<JWTClaims> {
  const { payload } = await jwtVerify(token, getSecret(cfg));
  return payload as unknown as JWTClaims;
}
