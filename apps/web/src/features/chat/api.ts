import { DefaultChatTransport } from "ai";

function getCookie(name: string): string | null {
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

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

export function createChatTransport() {
  return new DefaultChatTransport({
    api: `${backendUrl}/api/v1/chat`,
    credentials: "include",
    headers: (): Record<string, string> => {
      const csrfToken = getCookie("nexia_csrf");
      return csrfToken ? { "X-CSRF-Token": csrfToken } : {};
    },
  });
}
