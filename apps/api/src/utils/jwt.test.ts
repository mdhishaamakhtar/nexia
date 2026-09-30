import { describe, test, expect } from "vitest";
import { SignJWT } from "jose";
import { generateToken, validateToken } from "./jwt";
import type { Config } from "../config/config";

const testCfg = { server: { jwt_secret: "test-secret", jwt_expiry_minutes: 1 } } as Config;

describe("jwt", () => {
  test("generate and validate round trip", async () => {
    const token = await generateToken(123, testCfg);
    const claims = await validateToken(token, testCfg);
    expect(claims.user_id).toBe(123);
    expect(claims.exp - claims.iat).toBe(60);
  });

  test("wrong secret rejects token", async () => {
    const token = await generateToken(123, testCfg);
    const wrongCfg = { server: { ...testCfg.server, jwt_secret: "wrong" } } as Config;
    await expect(validateToken(token, wrongCfg)).rejects.toThrow();
  });

  test("a token signed with another algorithm is refused, even with the right key", async () => {
    const key = new TextEncoder().encode(testCfg.server.jwt_secret);
    const token = await new SignJWT({ user_id: 1 })
      .setProtectedHeader({ alg: "HS512" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);
    await expect(validateToken(token, testCfg)).rejects.toThrow();
  });

  test("malformed token rejected", async () => {
    await expect(validateToken("not-a-token", testCfg)).rejects.toThrow();
  });
});
