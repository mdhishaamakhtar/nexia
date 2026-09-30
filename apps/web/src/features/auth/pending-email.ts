/**
 * The address someone just signed up with, kept for this tab only, so the
 * "check your email" page can offer to resend without asking for it again.
 * sessionStorage, not the URL: an address never goes in a query string.
 */
const KEY = "nexia:pending-email";

export function rememberPendingEmail(email: string): void {
  try {
    sessionStorage.setItem(KEY, email);
  } catch {
    // Storage can be unavailable (private mode); the form just starts empty.
  }
}

export function pendingEmail(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Only same-site paths are followed after sign-in, never another site. A path
 * must start with one "/" and not "//" or "/\": browsers read a backslash
 * there as a slash, so "/\evil.com" is a link to evil.com.
 */
export function safeNext(next: string | null): string {
  return next && /^\/(?![/\\])/.test(next) ? next : "/profiles";
}
