import { describe, test, expect } from "vitest";
import { parseRedisURL } from "../queue/producer";
import { ErrorKind } from "../services/errors";

describe("parseRedisURL", () => {
  test("parses full redis:// URL", () => {
    const result = parseRedisURL("redis://localhost:6379/0");
    expect(result.host).toBe("localhost");
    expect(result.port).toBe(6379);
  });

  test("parses rediss:// URL", () => {
    const result = parseRedisURL("rediss://secure.example.com:6380");
    expect(result.host).toBe("secure.example.com");
    expect(result.port).toBe(6380);
  });

  test("parses bare host:port", () => {
    const result = parseRedisURL("127.0.0.1:6379");
    expect(result.host).toBe("127.0.0.1");
    expect(result.port).toBe(6379);
  });

  test("defaults port to 6379", () => {
    const result = parseRedisURL("localhost");
    expect(result.host).toBe("localhost");
    expect(result.port).toBe(6379);
  });

  test("extracts a password from a URL that carries one", () => {
    const result = parseRedisURL("redis://default:s3cret@redis.example.com:6380");
    expect(result.host).toBe("redis.example.com");
    expect(result.port).toBe(6380);
    expect(result.password).toBe("s3cret");
  });

  test("leaves the password undefined when the URL has none", () => {
    expect(parseRedisURL("redis://redis.example.com:6379").password).toBeUndefined();
  });

  test("falls back to 127.0.0.1 when a URL omits the host", () => {
    // redis: is not a "special" scheme, so an empty authority parses rather
    // than throwing, and the host comes back as "".
    const result = parseRedisURL("redis:///0");
    expect(result.host).toBe("127.0.0.1");
  });

  test("throws on a malformed URL rather than guessing", () => {
    // createApp catches this and disables the queue; silently defaulting to
    // localhost would instead look like a working queue that connects nowhere.
    expect(() => parseRedisURL("redis://:6379")).toThrow();
  });

  test("falls back to the default port when a URL omits it", () => {
    expect(parseRedisURL("redis://redis.example.com").port).toBe(6379);
  });

  test("falls back to 127.0.0.1 for an empty bare value", () => {
    const result = parseRedisURL("");
    expect(result.host).toBe("127.0.0.1");
    expect(result.port).toBe(6379);
  });

  test("ignores a non-numeric port in a bare value", () => {
    expect(parseRedisURL("localhost:not-a-port").port).toBe(6379);
  });
});

describe("ErrorKind values", () => {
  test("ErrorKind has not_found", () => {
    expect(ErrorKind.NotFound).toBe("not_found");
  });

  test("ErrorKind has validation", () => {
    expect(ErrorKind.Validation).toBe("validation");
  });

  test("ErrorKind has unauthorized", () => {
    expect(ErrorKind.Unauthorized).toBe("unauthorized");
  });
});
