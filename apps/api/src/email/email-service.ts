import type { Config } from "../config/config";
import type { Logger } from "../logging/logger";
import { errEmailUnavailable } from "../services/errors";
import { passwordResetEmail, verificationEmail, type EmailContent } from "./templates";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Sending sits on the request path of sign-up and password reset, so an
 * unresponsive provider must not hold those requests open indefinitely.
 */
const SEND_TIMEOUT_MS = 10_000;

export class EmailService {
  private fromAddress: string;
  private appBaseURL: string;
  private apiKey: string;
  private logger: Logger;

  constructor(cfg: Config, logger: Logger) {
    this.fromAddress = cfg.email.from_address;
    this.appBaseURL = cfg.email.app_base_url;
    this.apiKey = cfg.email.resend_api_key;
    this.logger = logger.child({ component: "email" });
  }

  async sendVerificationEmail(toEmail: string, token: string): Promise<void> {
    const url = `${this.appBaseURL}/verify-email/confirm?token=${encodeURIComponent(token)}`;
    await this.send(toEmail, verificationEmail(url), "verification", url);
  }

  async sendPasswordResetEmail(toEmail: string, token: string): Promise<void> {
    const url = `${this.appBaseURL}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send(toEmail, passwordResetEmail(url), "password reset", url);
  }

  private async send(
    toEmail: string,
    content: EmailContent,
    kind: string,
    link: string
  ): Promise<void> {
    if (!this.apiKey) {
      // Development without a Resend key: print the link so the flow can still
      // be followed. Never reached in production, where the key is required
      // for email to work at all.
      this.logger.info({ link }, `email disabled; ${kind} link`);
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
          subject: content.subject,
          html: content.html,
          text: content.text,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
    } catch (err) {
      // Transport-level failure: DNS, TLS, timeout, connection reset.
      throw errEmailUnavailable(
        `resend: send ${kind} email: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Checked outside the try so a rejected send is not re-wrapped as though it
    // were a transport error.
    if (!res.ok) {
      const body = await res.text();
      throw errEmailUnavailable(`resend: send ${kind} email: API error ${res.status} ${body}`);
    }

    this.logger.info(`${kind} email sent`);
  }
}
