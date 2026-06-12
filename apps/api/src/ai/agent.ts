import { streamText, stepCountIs } from "ai";
import type { LanguageModel } from "ai";
import type { ProfileService } from "../services/profile-service";
import type { EmbeddingRepository } from "../repositories/embedding";
import type { EmbeddingGenerator } from "./embeddings";
import { buildAgentTools } from "./tools";
import { AGENT_RULES } from "./system-prompt";
import { errAIUnavailable } from "../services/errors";

export class ChatAgent {
  constructor(
    private model: LanguageModel | null,
    private profileService: ProfileService,
    private embeddingRepo: EmbeddingRepository | null,
    private embeddingGenerator: EmbeddingGenerator | null,
  ) {}

  async respond(params: {
    userId: number;
    messages: Array<{ role: string; content: string }>;
  }) {
    if (!this.model) {
      throw errAIUnavailable();
    }

    const tools = buildAgentTools({
      userId: params.userId,
      profileService: this.profileService,
      embeddingRepo: this.embeddingRepo,
      embeddingGenerator: this.embeddingGenerator,
    });

    const result = streamText({
      model: this.model,
      system: AGENT_RULES,
      messages: params.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      tools,
      stopWhen: stepCountIs(10),
    });

    return result;
  }
}
