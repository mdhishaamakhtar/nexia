import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import type { LanguageModel } from "ai";
import type { ProfileService } from "../services/profile-service";
import type { EmbeddingRepository } from "../repositories/embedding";
import type { EmbeddingGenerator } from "./embeddings";
import { buildAgentTools } from "./tools";
import { buildSystemPrompt } from "./system-prompt";
import { errAIUnavailable } from "../services/errors";

export class ChatAgent {
  constructor(
    private model: LanguageModel | null,
    private profileService: ProfileService,
    private embeddingRepo: EmbeddingRepository | null,
    private embeddingGenerator: EmbeddingGenerator | null
  ) {}

  async respond(params: { userId: number; messages: UIMessage[] }) {
    if (!this.model) {
      throw errAIUnavailable();
    }

    const tools = buildAgentTools({
      userId: params.userId,
      profileService: this.profileService,
      embeddingRepo: this.embeddingRepo,
      embeddingGenerator: this.embeddingGenerator,
    });

    // convertToModelMessages expects Omit<UIMessage, 'id'>
    const uiMessages = params.messages.map(({ id: _id, ...rest }) => rest);
    const modelMessages = await convertToModelMessages(uiMessages, {
      ignoreIncompleteToolCalls: true,
    });

    const result = streamText({
      model: this.model,
      system: buildSystemPrompt(),
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(10),
    });

    return result;
  }
}
