import type { Config } from "../config/config";
import type { Logger } from "../logging/logger";
import { errEmailUnavailable } from "../services/errors";
import { buildVerificationEmailHTML, buildPasswordResetEmailHTML } from "./templates";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Signup blocks on this call, so an unresponsive provider must not hold the
 * request open indefinitely.
 */
const SEND_TIMEOUT_MS = 10_000;

interface SendParams {
  toEmail: string;
  subject: string;
  html: string;
  /** Used in log messages and error text, e.g. "verification email". */
  kind: string;
  /** Extra fields for the "skipped" log line when sending is disabled. */
  skipFields?: Record<string, unknown>;
}

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
    await this.send({
      toEmail,
      subject: "Verify your Nexia email address",
      html: buildVerificationEmailHTML(verifyURL),
      kind: "verification email",
      skipFields: { verifyURL },
    });
  }

  async sendPasswordResetEmail(toEmail: string, token: string): Promise<void> {
    const resetURL = `${this.appBaseURL}/reset-password`;
    await this.send({
      toEmail,
      subject: "Reset your Nexia password",
      html: buildPasswordResetEmailHTML(token, resetURL),
      kind: "password reset email",
      skipFields: { resetURL },
    });
  }

  private async send({ toEmail, subject, html, kind, skipFields }: SendParams): Promise<void> {
    if (!this.enabled) {
      // Without a key, log the link so local development can still follow it.
      this.logger.info({ toEmail, ...skipFields }, `email send skipped: ${kind}`);
      return;
    }

    let res: Response;
    try {
      res = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: [toEmail],
          subject,
          html,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
    } catch (err) {
      // Transport-level failure: DNS, TLS, timeout, connection reset.
      throw errEmailUnavailable(
        `resend: send ${kind}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Checked outside the try so a rejected send is not re-wrapped as though it
    // were a transport error.
    if (!res.ok) {
      const body = await res.text();
      throw errEmailUnavailable(`resend: send ${kind}: API error ${res.status} ${body}`);
    }

    this.logger.info({ toEmail }, `${kind} sent`);
  }
}
