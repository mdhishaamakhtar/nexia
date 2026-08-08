import { randomBytes } from "node:crypto";
import type { Config } from "../config/config";
import type { Logger } from "../logging/logger";
import { generateToken as generateJWT } from "../utils/jwt";
import {
  errValidation,
  errEmailConflict,
  errAccountNotFound,
  errUnauthorized,
  errEmailNotVerified,
  errNotFound,
} from "./errors";

const RESET_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
const VERIFY_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export interface UserRepo {
  create(user: {
    email: string;
    password: string;
    emailVerified: boolean;
  }): Promise<{ id: number; email: string }>;
  findByEmail(
    email: string
  ): Promise<{ id: number; email: string; password: string; emailVerified: boolean } | null>;
  findById(id: number): Promise<{ id: number } | null>;
  updatePassword(userId: number, hashedPassword: string): Promise<void>;
  updateEmailVerified(userId: number): Promise<void>;
}

export interface PasswordResetRepo {
  create(token: { userId: number; token: string; expiresAt: Date }): Promise<{ id: number }>;
  findByToken(
    token: string
  ): Promise<{ id: number; userId: number; token: string; expiresAt: Date; used: boolean } | null>;
  markAsUsed(id: number): Promise<void>;
}

export interface EmailVerificationRepo {
  create(token: { userId: number; token: string; expiresAt: Date }): Promise<{ id: number }>;
  findByToken(
    token: string
  ): Promise<{ id: number; userId: number; token: string; expiresAt: Date; used: boolean } | null>;
  markAsUsed(id: number): Promise<void>;
}

export interface EmailSender {
  sendVerificationEmail(toEmail: string, token: string): Promise<void>;
  sendPasswordResetEmail(toEmail: string, token: string): Promise<void>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hashed: string): Promise<boolean>;
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export class AuthService {
  constructor(
    private repo: UserRepo,
    private resetRepo: PasswordResetRepo,
    private verifyRepo: EmailVerificationRepo,
    private emailSvc: EmailSender,
    private hasher: PasswordHasher,
    private config: Config,
    private logger: Logger
  ) {}

  async signup(email: string, password: string): Promise<void> {
    if (!validateEmail(email)) {
      throw errValidation("invalid email");
    }
    if (password.length < 6) {
      throw errValidation("password too short");
    }

    const existing = await this.repo.findByEmail(email);

    if (existing) {
      throw errEmailConflict();
    }

    const hashedPassword = await this.hasher.hash(password);
    const newUser = await this.repo.create({
      email,
      password: hashedPassword,
      emailVerified: false,
    });

    const tokenStr = generateToken();
    await this.verifyRepo.create({
      userId: newUser.id,
      token: tokenStr,
      expiresAt: new Date(Date.now() + VERIFY_TOKEN_EXPIRY),
    });

    try {
      await this.emailSvc.sendVerificationEmail(email, tokenStr);
    } catch (sendErr) {
      this.logger.warn(
        { email, userId: newUser.id, err: String(sendErr) },
        "failed to send verification email"
      );
    }
  }

  async login(email: string, password: string): Promise<string> {
    const user = await this.repo.findByEmail(email);
    if (!user) {
      throw errAccountNotFound();
    }

    const valid = await this.hasher.verify(password, user.password);
    if (!valid) {
      throw errUnauthorized();
    }

    if (!user.emailVerified) {
      throw errEmailNotVerified();
    }

    return generateJWT(user.id, this.config);
  }

  async verifyEmail(token: string): Promise<void> {
    const record = await this.verifyRepo.findByToken(token);

    if (!record) {
      throw errNotFound();
    }

    if (record.used || new Date() > record.expiresAt) {
      throw errNotFound();
    }

    await this.repo.updateEmailVerified(record.userId);
    await this.verifyRepo.markAsUsed(record.id);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.repo.findByEmail(email);

    if (!user) {
      return;
    }

    const tokenStr = generateToken();
    await this.resetRepo.create({
      userId: user.id,
      token: tokenStr,
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY),
    });

    try {
      await this.emailSvc.sendPasswordResetEmail(email, tokenStr);
    } catch (sendErr) {
      this.logger.warn(
        { email, userId: user.id, err: String(sendErr) },
        "failed to send password reset email"
      );
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (newPassword.length < 6) {
      throw errValidation("password too short");
    }

    const record = await this.resetRepo.findByToken(token);

    if (!record) {
      throw errNotFound();
    }

    if (record.used || new Date() > record.expiresAt) {
      throw errNotFound();
    }

    const hashed = await this.hasher.hash(newPassword);
    await this.repo.updatePassword(record.userId, hashed);
    await this.resetRepo.markAsUsed(record.id);
  }
}
