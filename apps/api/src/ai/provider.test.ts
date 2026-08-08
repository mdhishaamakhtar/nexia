import { describe, test, expect } from "vitest";
import { createChatModel } from "./provider";
import { configSchema, type Config } from "../config/config";

function cfg(ai: Record<string, unknown>): Config {
  return configSchema.parse({
    server: { jwt_secret: "test-secret" },
    db: { host: "h", user: "u", password: "p", name: "n" },
    ai,
    email: {},
  });
}

describe("createChatModel", () => {
  test("returns null when no API key is configured", () => {
    // The whole AI surface is optional; without a key the agent must degrade
    // rather than construct a provider that can only fail at request time.
    expect(createChatModel(cfg({ opencode_api_key: "" }))).toBeNull();
  });

  test("builds a model for the configured chat model id", () => {
    const model = createChatModel(
      cfg({
        opencode_api_key: "sk-test",
        opencode_base_url: "https://example.invalid/v1",
        chat_model: "some-model-id",
      })
    );

    expect(model).not.toBeNull();
    expect(model).toHaveProperty("modelId", "some-model-id");
  });
});
