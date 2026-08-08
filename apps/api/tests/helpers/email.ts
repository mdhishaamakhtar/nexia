import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export interface SentEmail {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

/**
 * Captures what Resend would have received. Intercepting at the network layer
 * (rather than substituting a fake EmailService) means the real EmailService —
 * its URL, headers, payload shape and error handling — is what gets exercised.
 */
export const sentEmails: SentEmail[] = [];

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const okHandler = http.post(RESEND_ENDPOINT, async ({ request }) => {
  sentEmails.push((await request.json()) as SentEmail);
  return HttpResponse.json({ id: "test-email-id" });
});

export const mswServer = setupServer(okHandler);

export function resetEmails(): void {
  sentEmails.length = 0;
  mswServer.resetHandlers(okHandler);
}

/** Makes the next Resend call fail, to exercise the send-failure paths. */
export function failNextEmail(status = 422, body = "invalid recipient"): void {
  mswServer.use(
    http.post(RESEND_ENDPOINT, () => new HttpResponse(body, { status }), { once: true })
  );
}

/** Makes the Resend call reject at the transport layer, as a DNS/TLS error would. */
export function errorOnEmail(): void {
  mswServer.use(http.post(RESEND_ENDPOINT, () => HttpResponse.error()));
}

export function lastEmail(): SentEmail | undefined {
  return sentEmails.at(-1);
}

/** Pulls the token out of a verification link in a captured email body. */
export function tokenFromEmail(email: SentEmail | undefined): string {
  const match = email?.html.match(/token=([A-Za-z0-9%._-]+)/);
  if (!match?.[1]) throw new Error("no token found in email body");
  return decodeURIComponent(match[1]);
}
