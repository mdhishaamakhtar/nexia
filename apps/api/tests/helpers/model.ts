import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import type {
  LanguageModelV4FinishReason,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
  LanguageModelV4Usage,
} from "@ai-sdk/provider";

const USAGE: LanguageModelV4Usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
};

export interface MockToolCall {
  toolName: string;
  input: unknown;
  toolCallId?: string;
}

/** One model turn: some tool calls, some text, or both. */
export interface MockStep {
  text?: string;
  toolCalls?: MockToolCall[];
}

function partsFor(step: MockStep): LanguageModelV4StreamPart[] {
  const parts: LanguageModelV4StreamPart[] = [
    { type: "stream-start", warnings: [] },
    { type: "response-metadata", id: "resp-1", modelId: "mock-model", timestamp: new Date(0) },
  ];

  (step.toolCalls ?? []).forEach((call, i) => {
    const id = call.toolCallId ?? `call-${i}`;
    const input = JSON.stringify(call.input);
    parts.push({ type: "tool-input-start", id, toolName: call.toolName });
    parts.push({ type: "tool-input-delta", id, delta: input });
    parts.push({ type: "tool-input-end", id });
    parts.push({ type: "tool-call", toolCallId: id, toolName: call.toolName, input });
  });

  if (step.text) {
    parts.push({ type: "text-start", id: "text-1" });
    parts.push({ type: "text-delta", id: "text-1", delta: step.text });
    parts.push({ type: "text-end", id: "text-1" });
  }

  const finishReason: LanguageModelV4FinishReason = {
    unified: step.toolCalls?.length ? "tool-calls" : "stop",
    raw: undefined,
  };
  parts.push({ type: "finish", finishReason, usage: USAGE });

  return parts;
}

export interface MockModelHandle {
  model: MockLanguageModelV4;
  /** The prompt the agent sent on each turn — lets tests assert tool results fed back. */
  prompts: LanguageModelV4Prompt[];
  callCount: () => number;
}

/**
 * A scripted model. Each entry in `steps` is consumed by one `doStream` call, so
 * a two-entry script drives the agent's tool-call turn and then its summarising
 * turn. The last step repeats if the agent keeps going, which keeps a runaway
 * loop from hanging the test.
 */
export function mockChatModel(steps: MockStep[]): MockModelHandle {
  const prompts: LanguageModelV4Prompt[] = [];
  let calls = 0;

  const model = new MockLanguageModelV4({
    doStream: async ({ prompt }) => {
      prompts.push(prompt);
      const step = steps[Math.min(calls, steps.length - 1)] ?? { text: "" };
      calls += 1;
      return {
        stream: simulateReadableStream({
          chunks: partsFor(step),
          initialDelayInMs: 0,
          chunkDelayInMs: 0,
        }),
      };
    },
  });

  return { model, prompts, callCount: () => calls };
}

/** A model whose stream fails, for exercising error propagation. */
export function failingChatModel(message = "model exploded"): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doStream: async () => {
      throw new Error(message);
    },
  });
}
