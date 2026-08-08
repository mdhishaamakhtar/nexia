import { describe, test, expect, afterEach } from "vitest";
import { createLogger } from "./logger";
import { configSchema, type Config } from "../config/config";

function cfg(mode: "debug" | "release" | "test"): Config {
  return configSchema.parse({
    server: { jwt_secret: "test-secret", mode },
    db: { host: "h", user: "u", password: "p", name: "n" },
    ai: {},
    email: {},
  });
}

const originalLevel = process.env.LOG_LEVEL;

afterEach(() => {
  if (originalLevel === undefined) delete process.env.LOG_LEVEL;
  else process.env.LOG_LEVEL = originalLevel;
});

describe("createLogger", () => {
  test("defaults to debug level in debug mode", () => {
    delete process.env.LOG_LEVEL;
    expect(createLogger(cfg("debug")).level).toBe("debug");
  });

  test("defaults to info level outside debug mode", () => {
    delete process.env.LOG_LEVEL;
    expect(createLogger(cfg("release")).level).toBe("info");
    expect(createLogger(cfg("test")).level).toBe("info");
  });

  test("lets LOG_LEVEL override the mode default", () => {
    process.env.LOG_LEVEL = "warn";
    expect(createLogger(cfg("debug")).level).toBe("warn");
  });

  test("formats the level as a label rather than a number", () => {
    const logger = createLogger(cfg("test"));
    // pino's default is a numeric level; this config maps it back to a name so
    // log aggregators show "info" instead of 30.
    expect(logger.levels.labels[30]).toBe("info");
  });
});
