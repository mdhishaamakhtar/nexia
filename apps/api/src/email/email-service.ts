import type { Config } from "../config/config";
import type { Logger } from "../logging/logger";
import { errEmailUnavailable } from "../services/errors";
import { buildVerificationEmailHTML, buildPasswordResetEmailHTML } from "./templates";

export class EmailService {
  private fromAddress: string;
  private appBaseURL: string;
  private enabled: boolean;
  private apiKey: string;
  private logger: Logger;

  constructor(cfg: Config, logger: Logger) {
    this.fromAddress = cfg.email.from_address;
    this.appBaseURL = cfg.email.app_base_url;
    this.apiKey = cfg.email.resend_api_key;
    this.enabled = Boolean(cfg.email.resend_api_key);
    this.logger = logger.child({ component: "email" });
  }

  async sendVerificationEmail(toEmail: string, token: string): Promise<void> {
    const verifyURL = `${this.appBaseURL}/verify-email/confirm?token=${encodeURIComponent(token)}`;

    if (!this.enabled) {
      this.logger.info({ toEmail, verifyURL }, "email send skipped: verification email");
      return;
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: [toEmail],
          subject: "Verify your Nexia email address",
          html: buildVerificationEmailHTML(verifyURL),
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw errEmailUnavailable(`Resend API error: ${res.status} ${body}`);
      }
      this.logger.info({ toEmail }, "verification email sent");
    } catch (err) {
      throw errEmailUnavailable(
        `resend: send verification email: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  async sendPasswordResetEmail(toEmail: string, token: string): Promise<void> {
    const resetURL = `${this.appBaseURL}/reset-password`;

    if (!this.enabled) {
      this.logger.info({ toEmail, resetURL }, "email send skipped: password reset email");
      return;
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: [toEmail],
          subject: "Reset your Nexia password",
          html: buildPasswordResetEmailHTML(token, resetURL),
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw errEmailUnavailable(`Resend API error: ${res.status} ${body}`);
      }
      this.logger.info({ toEmail }, "password reset email sent");
    } catch (err) {
      throw errEmailUnavailable(
        `resend: send password reset email: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
