import type { LucideIcon } from "lucide-react";
import { List, PenLine, Search, Sparkles, UserPlus, UserRound, Wrench } from "lucide-react";
import type { ToolUIPart, DynamicToolUIPart } from "ai";
import {
  getProfileToolOutputSchema,
  profileListToolOutputSchema,
  ragSearchOutputSchema,
  toolErrorOutputSchema,
  writeProfileToolOutputSchema,
  type ProfileOutput,
} from "@nexia/shared";

export type ToolPart = ToolUIPart | DynamicToolUIPart;

interface ToolMeta {
  /** Verb shown while the tool is running, e.g. "Searching memories". */
  active: string;
  /** Verb shown once the tool has produced output, e.g. "Searched memories". */
  done: string;
  icon: LucideIcon;
  /** Write tools trigger a profiles cache invalidation and render a result link. */
  isWrite: boolean;
}

const TOOL_META: Record<string, ToolMeta> = {
  ragSearch: {
    active: "Searching memories",
    done: "Searched memories",
    icon: Sparkles,
    isWrite: false,
  },
  searchProfiles: {
    active: "Searching profiles",
    done: "Searched profiles",
    icon: Search,
    isWrite: false,
  },
  getProfile: {
    active: "Looking up a profile",
    done: "Found a profile",
    icon: UserRound,
    isWrite: false,
  },
  listProfiles: { active: "Listing profiles", done: "Listed profiles", icon: List, isWrite: false },
  createProfile: { active: "Creating profile", done: "Created", icon: UserPlus, isWrite: true },
  updateProfile: { active: "Updating profile", done: "Updated", icon: PenLine, isWrite: true },
};

export function toolMetaFor(name: string): ToolMeta {
  return TOOL_META[name] ?? { active: `Running ${name}`, done: name, icon: Wrench, isWrite: false };
}

export const WRITE_TOOL_NAMES = Object.entries(TOOL_META)
  .filter(([, m]) => m.isWrite)
  .map(([name]) => name);

/** Resolves a tool part's tool name whether it is a typed or dynamic tool part. */
export function toolNameOf(part: ToolPart): string {
  return part.type === "dynamic-tool" ? part.toolName : part.type.slice("tool-".length);
}

export function isToolPart(part: { type: string }): part is ToolPart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

export interface WriteResult {
  id: number;
  fullName: string;
}

/**
 * Tool outputs are validated against the shared `@nexia/shared` contract rather
 * than sniffed for field names, so backend and frontend stay in lock-step. Every
 * parse is a `safeParse`, so an unexpected shape degrades to "no rich UI" instead
 * of throwing.
 */

/** Extracts a create/update result, if the output matches the write contract. */
export function extractWriteResult(output: unknown): WriteResult | null {
  const parsed = writeProfileToolOutputSchema.safeParse(output);
  return parsed.success ? { id: parsed.data.id, fullName: parsed.data.full_name } : null;
}

/** Tools return `{ error }` for soft failures; surface that text when present. */
export function extractToolError(output: unknown): string | null {
  const parsed = toolErrorOutputSchema.safeParse(output);
  return parsed.success ? parsed.data.error : null;
}

/** Pulls the profiles a read tool returned, per the tool's output contract. */
export function extractProfilesFromOutput(toolName: string, output: unknown): ProfileOutput[] {
  switch (toolName) {
    case "ragSearch": {
      const parsed = ragSearchOutputSchema.safeParse(output);
      return parsed.success ? parsed.data : [];
    }
    case "getProfile": {
      const parsed = getProfileToolOutputSchema.safeParse(output);
      return parsed.success && "id" in parsed.data ? [parsed.data] : [];
    }
    case "searchProfiles":
    case "listProfiles": {
      const parsed = profileListToolOutputSchema.safeParse(output);
      return parsed.success ? parsed.data.profiles : [];
    }
    default:
      return [];
  }
}
