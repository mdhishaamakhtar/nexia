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
