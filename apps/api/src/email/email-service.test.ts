import { describe, test, expect, vi, afterEach } from "vitest";
import pino from "pino";
import { EmailService } from "./email-service";
import { configSchema, type Config } from "../config/config";
import { ErrorKind, ServiceError } from "../services/errors";

const logger = pino({ level: "silent" });

function cfg(email: Record<string, unknown>): Config {
  return configSchema.parse({
    server: { jwt_secret: "s" },
    db: { host: "h", user: "u", password: "p", name: "n" },
    ai: {},
    email,
  });
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function stubFetch(impl: () => Promise<Response>) {
  const spy = vi.fn((_url: string, _init: RequestInit) => impl());
  globalThis.fetch = spy as unknown as typeof fetch;
  return spy;
}

describe("when no API key is configured", () => {
  test("skips sending rather than failing", async () => {
    const spy = stubFetch(async () => new Response("{}", { status: 200 }));
    const svc = new EmailService(cfg({ resend_api_key: "" }), logger);

    await svc.sendVerificationEmail("someone@example.com", "tok");
    await svc.sendPasswordResetEmail("someone@example.com", "tok");

    // Email is optional infrastructure; without a key the app still works.
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("when the API key is configured", () => {
  test("posts a verification email with the token in the link", async () => {
    const spy = stubFetch(async () => new Response("{}", { status: 200 }));
    const svc = new EmailService(
      cfg({ resend_api_key: "re_test", app_base_url: "https://nexia.test" }),
      logger
    );

    await svc.sendVerificationEmail("someone@example.com", "tok en/+");

    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");

    const body = JSON.parse(String(init.body)) as { to: string[]; subject: string; html: string };
    expect(body.to).toEqual(["someone@example.com"]);
    expect(body.subject).toContain("Verify");
    // The token must survive as a URL-safe value.
    expect(body.html).toContain(`token=${encodeURIComponent("tok en/+")}`);
  });

  test("posts a reset email carrying the raw token", async () => {
    const spy = stubFetch(async () => new Response("{}", { status: 200 }));
    const svc = new EmailService(cfg({ resend_api_key: "re_test" }), logger);

    await svc.sendPasswordResetEmail("someone@example.com", "raw-token-value");

    const [, init] = spy.mock.calls[0]! as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { html: string };
    expect(body.html).toContain("raw-token-value");
  });

  test("gives up after a bounded timeout", async () => {
    const spy = stubFetch(async () => new Response("{}", { status: 200 }));
    const svc = new EmailService(cfg({ resend_api_key: "re_test" }), logger);

    await svc.sendVerificationEmail("someone@example.com", "tok");

    // Without a signal a hung provider would hold the signup request open.
    const [, init] = spy.mock.calls[0]! as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  test("reports a rejected send as email-unavailable", async () => {
    stubFetch(async () => new Response("invalid recipient", { status: 422 }));
    const svc = new EmailService(cfg({ resend_api_key: "re_test" }), logger);

    await expect(svc.sendVerificationEmail("bad@example.com", "tok")).rejects.toMatchObject({
      kind: ErrorKind.EmailUnavailable,
    });
  });

  test("includes the provider's status and body in the error", async () => {
    stubFetch(async () => new Response("domain not verified", { status: 403 }));
    const svc = new EmailService(cfg({ resend_api_key: "re_test" }), logger);

    try {
      await svc.sendPasswordResetEmail("bad@example.com", "tok");
      expect.unreachable();
    } catch (err) {
      const message = (err as ServiceError).message;
      expect(message).toContain("403");
      expect(message).toContain("domain not verified");
      // Wrapped once, not twice.
      expect(message.match(/resend: send/g)).toHaveLength(1);
    }
  });

  test("reports a transport failure as email-unavailable", async () => {
    stubFetch(async () => {
      throw new TypeError("fetch failed");
    });
    const svc = new EmailService(cfg({ resend_api_key: "re_test" }), logger);

    try {
      await svc.sendVerificationEmail("someone@example.com", "tok");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ServiceError);
      expect((err as ServiceError).message).toContain("fetch failed");
    }
  });

  test("handles a thrown non-Error value", async () => {
    stubFetch(async () => {
      throw "socket closed";
    });
    const svc = new EmailService(cfg({ resend_api_key: "re_test" }), logger);

    await expect(svc.sendVerificationEmail("someone@example.com", "tok")).rejects.toMatchObject({
      kind: ErrorKind.EmailUnavailable,
    });
  });
});
