/** Reads a browser cookie by name, returning null on the server or when absent. */
export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const cookie of document.cookie.split(";")) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

export const CSRF_COOKIE_NAME = "nexia_csrf";

/** Returns the CSRF header for state-changing requests, or an empty object. */
export function csrfHeaders(): Record<string, string> {
  const token = readCookie(CSRF_COOKIE_NAME);
  return token ? { "X-CSRF-Token": token } : {};
}
