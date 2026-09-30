import { createHash } from "node:crypto";
import {
  convertToModelMessages,
  isStepCount,
  safeValidateUIMessages,
  streamText,
  type LanguageModel,
  type UIMessage,
} from "ai";
import { CHAT_HISTORY_LIMIT } from "@nexia/shared";
import type { ProfileService } from "../services/profile-service";
import type { EmbeddingService } from "../services/embedding-service";
import { buildAgentTools } from "./tools";
import { buildSystemPrompt } from "./system-prompt";
import { errAIUnavailable, errValidation } from "../services/errors";

const MAX_STEPS = 8;
const MAX_OUTPUT_TOKENS = 2000;

export interface ChatAgentDeps {
  model: LanguageModel | null;
  profileService: ProfileService;
  embeddingService: EmbeddingService | null;
  /** Signs approval requests so a client cannot forge an approval. */
  secret: string;
}

export class ChatAgent {
  private approvalSecret: Uint8Array;

  constructor(private deps: ChatAgentDeps) {
    // Derived rather than reused, so the JWT key is never used for anything else.
    this.approvalSecret = createHash("sha256")
      .update(`nexia-tool-approval:${deps.secret}`)
      .digest();
  }

  /**
   * Streams a reply to the conversation. The history comes from the client, so
   * it is validated against the tool schemas first, and only the most recent
   * turns are sent on. `abortSignal` is the request's: when the person closes
   * the tab, the model call and any tool loop stop with it.
   */
  async respond(params: { userId: number; messages: unknown; abortSignal?: AbortSignal }) {
    const { model, profileService, embeddingService } = this.deps;
    if (!model) throw errAIUnavailable();

    const tools = buildAgentTools({ userId: params.userId, profileService, embeddingService });

    const validated = await safeValidateUIMessages<UIMessage>({
      messages: params.messages,
      // The validator's parameter is typed per message schema; the tool set is
      // the same object streamText receives.
      tools: tools as Parameters<typeof safeValidateUIMessages>[0]["tools"],
    });
    if (!validated.success) {
      throw errValidation(`messages: ${validated.error.message}`);
    }

    const recent = validated.data.slice(-CHAT_HISTORY_LIMIT).map(({ id: _id, ...rest }) => rest);
    const modelMessages = await convertToModelMessages(recent, {
      tools,
      ignoreIncompleteToolCalls: true,
    });

    return streamText({
      model,
      instructions: buildSystemPrompt(),
      messages: modelMessages,
      tools,
      stopWhen: isStepCount(MAX_STEPS),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      abortSignal: params.abortSignal,
      experimental_toolApprovalSecret: this.approvalSecret,
    });
  }
}
