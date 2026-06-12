import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV2 } from "ai";
import type { Config } from "../config/config";

export function createChatModel(cfg: Config): LanguageModelV2 | null {
  if (!cfg.ai.opencode_api_key) return null;
  const provider = createOpenAICompatible({
    name: "opencode-go",
    baseURL: cfg.ai.opencode_base_url,
    apiKey: cfg.ai.opencode_api_key,
  });
  return provider(cfg.ai.chat_model);
}
