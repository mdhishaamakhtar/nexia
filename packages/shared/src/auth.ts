import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Addresses are stored and compared lower-cased and trimmed. A phone keyboard
 * that capitalises the first letter must not produce a second account, or make
 * sign-in fail for the first one.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }).max(255));

/**
 * The rule for choosing a password. Sign-in deliberately does not apply it, so
 * accounts created under an older, shorter minimum can still sign in.
 */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`);

/** Reset and verification links carry 32 random bytes as hex. */
export const emailTokenSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{64}$/, "This link is incomplete. Open it straight from the email.");

export const signupRequestSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
});

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(PASSWORD_MAX_LENGTH),
});

export const forgotPasswordRequestSchema = z.object({
  email: emailSchema,
});

export const resendVerificationRequestSchema = z.object({
  email: emailSchema,
});

export const verifyEmailRequestSchema = z.object({
  token: emailTokenSchema,
});

export const resetPasswordRequestSchema = z.object({
  token: emailTokenSchema,
  new_password: newPasswordSchema,
});

export const authSessionSchema = z.object({
  authenticated: z.boolean(),
  user_id: z.number(),
});

export type AuthSession = z.infer<typeof authSessionSchema>;
