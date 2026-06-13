import type { LucideIcon } from "lucide-react";
import { List, PenLine, Search, Sparkles, UserPlus, UserRound, Wrench } from "lucide-react";
import type { ToolUIPart, DynamicToolUIPart } from "ai";

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

/** Extracts {id, full_name} from a create/update tool output, if present. */
export function extractWriteResult(output: unknown): WriteResult | null {
  if (output && typeof output === "object" && "id" in output && "full_name" in output) {
    const o = output as { id: unknown; full_name: unknown };
    if (typeof o.id === "number" && typeof o.full_name === "string") {
      return { id: o.id, fullName: o.full_name };
    }
  }
  return null;
}

/** Tools return `{ error }` for soft failures; surface that text when present. */
export function extractToolError(output: unknown): string | null {
  if (output && typeof output === "object" && "error" in output) {
    const e = (output as { error: unknown }).error;
    if (typeof e === "string") return e;
  }
  return null;
}
