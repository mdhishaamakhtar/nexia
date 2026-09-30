import { describe, expect, test } from "vitest";
import type { ToolPart } from "./tool-meta";
import {
  extractProfilesFromOutput,
  extractToolError,
  extractWriteResult,
  isToolPart,
  isWriteTool,
  toolMetaFor,
  toolNameOf,
} from "./tool-meta";
import { makeProfile, makeSummary } from "@test/fixtures";

const part = (type: string, extra: Record<string, unknown> = {}) =>
  ({
    type,
    toolCallId: "1",
    state: "output-available",
    input: {},
    output: null,
    ...extra,
  }) as unknown as ToolPart;

describe("naming", () => {
  test("reads the tool name from typed and dynamic parts", () => {
    expect(toolNameOf(part("tool-ragSearch"))).toBe("ragSearch");
    expect(toolNameOf(part("dynamic-tool", { toolName: "getProfile" }))).toBe("getProfile");
  });

  test("tells tool parts from text", () => {
    expect(isToolPart({ type: "tool-listProfiles" })).toBe(true);
    expect(isToolPart({ type: "dynamic-tool" })).toBe(true);
    expect(isToolPart({ type: "text" })).toBe(false);
  });

  test("knows which tools write", () => {
    expect(isWriteTool(part("tool-createProfile"))).toBe(true);
    expect(isWriteTool(part("tool-updateProfile"))).toBe(true);
    expect(isWriteTool(part("tool-searchProfiles"))).toBe(false);
  });

  test("describes known tools and falls back for others", () => {
    expect(toolMetaFor("ragSearch").active).toBe("Searching memories");
    expect(toolMetaFor("mystery")).toMatchObject({ active: "Running mystery", done: "mystery" });
  });
});

describe("reading outputs", () => {
  const profile = makeProfile({ id: 4, full_name: "Zoë" });

  test("a write reports who it saved", () => {
    expect(extractWriteResult({ id: 4, full_name: "Zoë", profile })).toEqual({
      id: 4,
      fullName: "Zoë",
    });
    expect(extractWriteResult({ nope: true })).toBeNull();
  });

  test("a soft failure carries its message", () => {
    expect(extractToolError({ error: "Profile not found" })).toBe("Profile not found");
    expect(extractToolError(profile)).toBeNull();
  });

  test("each read tool's profiles come out of its own shape", () => {
    expect(extractProfilesFromOutput("ragSearch", [{ ...profile, score: 0.9 }])).toHaveLength(1);
    expect(extractProfilesFromOutput("getProfile", profile)).toHaveLength(1);
    expect(extractProfilesFromOutput("getProfile", { error: "gone" })).toEqual([]);
    const page = { profiles: [makeSummary(), makeSummary({ id: 8 })], total: 2 };
    expect(extractProfilesFromOutput("searchProfiles", page)).toHaveLength(2);
    expect(extractProfilesFromOutput("listProfiles", page)).toHaveLength(2);
    expect(extractProfilesFromOutput("ragSearch", "garbage")).toEqual([]);
    expect(extractProfilesFromOutput("createProfile", page)).toEqual([]);
  });
});
