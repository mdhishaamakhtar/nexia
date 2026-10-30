import { createGoogle } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import type { Config } from "../config/config";

export function createChatModel(cfg: Config): LanguageModel | null {
  if (!cfg.ai.gemini_api_key) return null;

  return createGoogle({ apiKey: cfg.ai.gemini_api_key }).chat(cfg.ai.chat_model);
}
