import { Hono, type MiddlewareHandler } from "hono";
import {
  signupRequestSchema,
  loginRequestSchema,
  forgotPasswordRequestSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  verifyEmailRequestSchema,
} from "@nexia/shared";
import type { AuthService } from "../services/auth-service";
import type { Config } from "../config/config";
import type { AppEnv } from "../middleware/auth";
import { parseJsonBody, parseOrThrow } from "../utils/validation";
import { endSession, startSession } from "../utils/session";

/**
 * Public authentication routes. `limit` is applied to each of them — and only
 * to them, so the session check the web app makes on every page load never
 * spends the budget that protects passwords.
 */
export function createAuthController(
  authService: AuthService,
  config: Config,
  limit: MiddlewareHandler
) {
  const app = new Hono();

  app.post("/signup", limit, async (c) => {
    const { email, password } = await parseJsonBody(c, signupRequestSchema);
    await authService.signup(email, password);
    return c.json(
      { message: "Check your email for a link to finish setting up your account." },
      201
    );
  });

  app.post("/login", limit, async (c) => {
    const { email, password } = await parseJsonBody(c, loginRequestSchema);
    const userId = await authService.login(email, password);
    const token = await startSession(c, userId, config);
    return c.json({ token });
  });

  app.get("/verify-email", limit, async (c) => {
    const { token } = parseOrThrow(verifyEmailRequestSchema, { token: c.req.query("token") });
    await authService.verifyEmail(token);
    return c.json({ message: "Email verified" });
  });

  app.post("/resend-verification", limit, async (c) => {
    const { email } = await parseJsonBody(c, resendVerificationRequestSchema);
    await authService.resendVerification(email);
    return c.json({ message: "If that account needs verifying, a new link is on its way." });
  });

  app.post("/forgot-password", limit, async (c) => {
    const { email } = await parseJsonBody(c, forgotPasswordRequestSchema);
    await authService.forgotPassword(email);
    return c.json({ message: "If that email has an account, a reset link is on its way." });
  });

  app.post("/reset-password", limit, async (c) => {
    const { token, new_password } = await parseJsonBody(c, resetPasswordRequestSchema);
    await authService.resetPassword(token, new_password);
    return c.json({ message: "Password updated" });
  });

  return app;
}

/** Session routes behind the auth and CSRF middleware. */
export function createSessionController(config: Config) {
  const app = new Hono<AppEnv>();

  app.get("/me", (c) => c.json({ authenticated: true, user_id: c.get("userId") }));

  app.post("/logout", (c) => {
    endSession(c, config);
    return c.json({ message: "Signed out" });
  });

  return app;
}
