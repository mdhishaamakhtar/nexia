import type { LucideIcon } from "lucide-react";
import { List, PenLine, Search, Sparkles, UserPlus, UserRound, Wrench } from "lucide-react";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import {
  WRITE_TOOL_NAMES,
  getProfileToolOutputSchema,
  profileListToolOutputSchema,
  ragSearchOutputSchema,
  toolErrorOutputSchema,
  writeProfileToolOutputSchema,
  type ProfileSummary,
} from "@nexia/shared";

export type ToolPart = ToolUIPart | DynamicToolUIPart;

interface ToolMeta {
  /** Shown while the tool runs, e.g. "Searching memories". */
  active: string;
  /** Shown once it has run, e.g. "Searched memories". */
  done: string;
  icon: LucideIcon;
}

const TOOL_META: Record<string, ToolMeta> = {
  ragSearch: { active: "Searching memories", done: "Searched memories", icon: Sparkles },
  searchProfiles: { active: "Searching profiles", done: "Searched profiles", icon: Search },
  getProfile: { active: "Opening a profile", done: "Opened a profile", icon: UserRound },
  listProfiles: { active: "Looking through everyone", done: "Looked through everyone", icon: List },
  createProfile: { active: "Adding them", done: "Added", icon: UserPlus },
  updateProfile: { active: "Updating them", done: "Updated", icon: PenLine },
};

export function toolMetaFor(name: string): ToolMeta {
  return TOOL_META[name] ?? { active: `Running ${name}`, done: name, icon: Wrench };
}

/** Resolves a tool part's name whether it is a typed or dynamic tool part. */
export function toolNameOf(part: ToolPart): string {
  return part.type === "dynamic-tool" ? part.toolName : part.type.slice("tool-".length);
}

export function isToolPart(part: { type: string }): part is ToolPart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

export function isWriteTool(part: ToolPart): boolean {
  return (WRITE_TOOL_NAMES as readonly string[]).includes(toolNameOf(part));
}

export interface WriteResult {
  id: number;
  fullName: string;
}

/**
 * Tool outputs are validated against the shared `@nexia/shared` contract
 * rather than sniffed for field names. Every parse is a `safeParse`, so an
 * unexpected shape degrades to "no rich UI" instead of throwing.
 */
export function extractWriteResult(output: unknown): WriteResult | null {
  const parsed = writeProfileToolOutputSchema.safeParse(output);
  return parsed.success ? { id: parsed.data.id, fullName: parsed.data.full_name } : null;
}

/** Tools return `{ error }` for soft failures; surface that text when present. */
export function extractToolError(output: unknown): string | null {
  const parsed = toolErrorOutputSchema.safeParse(output);
  return parsed.success ? parsed.data.error : null;
}

/** The profiles a read tool returned, per the tool's output contract. */
export function extractProfilesFromOutput(toolName: string, output: unknown): ProfileSummary[] {
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
