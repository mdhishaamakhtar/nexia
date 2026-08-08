import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import type { ProfileOutput } from "@nexia/shared";
import { profileEmbeddings, profiles } from "../../src/db/schema";
import { createHarness, type Harness } from "../helpers/harness";
import { bearerAuth, call, errorCode, profileInput, seedUser } from "../helpers/factories";
import { mockChatModel, type MockStep } from "../helpers/model";
import { waitFor } from "../helpers/wait";

/** Shared harness for the cases that never reach the model. */
let plain: Harness;

beforeAll(() => {
  plain = createHarness({ withQueue: true });
});
afterAll(async () => {
  await plain.close();
});

function userMessage(text: string) {
  return { id: "m1", role: "user", parts: [{ type: "text", text }] };
}

async function chat(h: Harness, headers: Record<string, string>, text: string) {
  const res = await h.app.request("/api/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ messages: [userMessage(text)] }),
  });
  return { status: res.status, body: await res.text() };
}

/** A harness whose model is scripted with the given turns. */
function scripted(steps: MockStep[]) {
  const model = mockChatModel(steps);
  const h = createHarness({ chatModel: model.model, withQueue: true });
  return { h, model };
}

describe("POST /chat guards", () => {
  test("requires authentication", async () => {
    const res = await call(plain.app, "POST", "/api/v1/chat", {
      body: { messages: [userMessage("hi")] },
    });
    expect(res.status).toBe(401);
  });

  test("rejects an empty messages array", async () => {
    const user = await seedUser(plain);
    const res = await call(plain.app, "POST", "/api/v1/chat", {
      headers: await bearerAuth(plain, user.id),
      body: { messages: [] },
    });
    expect(res.status).toBe(400);
    expect(errorCode(res)).toBe("VALIDATION_ERROR");
  });

  test("rejects a body with no messages field", async () => {
    const user = await seedUser(plain);
    const res = await call(plain.app, "POST", "/api/v1/chat", {
      headers: await bearerAuth(plain, user.id),
      body: {},
    });
    expect(res.status).toBe(400);
  });

  test("rejects a malformed JSON body", async () => {
    const user = await seedUser(plain);
    const res = await plain.app.request("/api/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await bearerAuth(plain, user.id)) },
      body: "{oops",
    });
    expect(res.status).toBe(400);
  });

  test("reports 503 when no chat model is configured", async () => {
    const user = await seedUser(plain);
    const res = await chat(plain, await bearerAuth(plain, user.id), "hello");
    expect(res.status).toBe(503);
    expect(res.body).toContain("AI_UNAVAILABLE");
  });
});

describe("chat streaming", () => {
  test("streams a plain text answer", async () => {
    const { h } = scripted([{ text: "Hello from Nexia." }]);
    try {
      const user = await seedUser(h);
      const res = await chat(h, await bearerAuth(h, user.id), "hi");

      expect(res.status).toBe(200);
      expect(res.body).toContain("Hello from Nexia.");
    } finally {
      await h.close();
    }
  });
});

describe("agent tools", () => {
  test("listProfiles returns the caller's profiles", async () => {
    const { h, model } = scripted([
      { toolCalls: [{ toolName: "listProfiles", input: { page: 1, limit: 10 } }] },
      { text: "You have one profile." },
    ]);
    try {
      const user = await seedUser(h);
      const headers = await bearerAuth(h, user.id);
      await call(h.app, "POST", "/api/v1/profiles", {
        headers,
        body: profileInput({ full_name: "Listed Person" }),
      });

      const res = await chat(h, headers, "who do I know?");
      expect(res.status).toBe(200);
      expect(res.body).toContain("Listed Person");
      // Two turns: the tool call, then the summary once the result came back.
      expect(model.callCount()).toBe(2);
    } finally {
      await h.close();
    }
  });

  test("searchProfiles filters by name and relationship", async () => {
    const { h } = scripted([
      {
        toolCalls: [
          {
            toolName: "searchProfiles",
            input: { search: "Ada", relationship_type: "Friend", page: 1, limit: 10 },
          },
        ],
      },
      { text: "Found them." },
    ]);
    try {
      const user = await seedUser(h);
      const headers = await bearerAuth(h, user.id);
      await call(h.app, "POST", "/api/v1/profiles", {
        headers,
        body: profileInput({ full_name: "Ada Lovelace", relationship_type: "Friend" }),
      });
      await call(h.app, "POST", "/api/v1/profiles", {
        headers,
        body: profileInput({ full_name: "Bob Other", relationship_type: "Friend" }),
      });

      const res = await chat(h, headers, "find Ada");
      expect(res.body).toContain("Ada Lovelace");
      expect(res.body).not.toContain("Bob Other");
    } finally {
      await h.close();
    }
  });

  test("getProfile returns the full record", async () => {
    // Seeded through `plain` — every harness shares the worker's pool, so the
    // scripted one below sees the same rows.
    const user = await seedUser(plain);
    const headers = await bearerAuth(plain, user.id);
    const created = await call<{ id: number }>(plain.app, "POST", "/api/v1/profiles", {
      headers,
      body: profileInput({ full_name: "Detailed Person", bio: "a distinctive bio" }),
    });

    const { h } = scripted([
      { toolCalls: [{ toolName: "getProfile", input: { id: created.body.id } }] },
      { text: "Here are the details." },
    ]);
    try {
      const res = await chat(h, headers, "tell me about them");
      expect(res.body).toContain("a distinctive bio");
    } finally {
      await h.close();
    }
  });

  test("getProfile reports a missing profile as a tool error, not a crash", async () => {
    const { h } = scripted([
      { toolCalls: [{ toolName: "getProfile", input: { id: 999999 } }] },
      { text: "I could not find that one." },
    ]);
    try {
      const user = await seedUser(h);
      const res = await chat(h, await bearerAuth(h, user.id), "profile 999999?");

      expect(res.status).toBe(200);
      expect(res.body).toContain("Profile not found.");
      expect(res.body).toContain("I could not find that one.");
    } finally {
      await h.close();
    }
  });

  test("getProfile cannot reach another user's profile", async () => {
    const owner = await seedUser(plain, { email: "agent-owner@example.com" });
    const created = await call<{ id: number }>(plain.app, "POST", "/api/v1/profiles", {
      headers: await bearerAuth(plain, owner.id),
      body: profileInput({ full_name: "Private Person" }),
    });

    const { h } = scripted([
      { toolCalls: [{ toolName: "getProfile", input: { id: created.body.id } }] },
      { text: "Nothing found." },
    ]);
    try {
      const intruder = await seedUser(h, { email: "agent-intruder@example.com" });
      const res = await chat(h, await bearerAuth(h, intruder.id), "show me profile 1");

      expect(res.body).not.toContain("Private Person");
      expect(res.body).toContain("Profile not found.");
    } finally {
      await h.close();
    }
  });

  test("createProfile writes a real row scoped to the caller", async () => {
    const { h } = scripted([
      {
        toolCalls: [
          {
            toolName: "createProfile",
            input: {
              full_name: "Agent Created",
              relationship_type: "Colleague",
              birthday: "1990-04-01",
            },
          },
        ],
      },
      { text: "Created." },
    ]);
    try {
      const user = await seedUser(h);
      const res = await chat(h, await bearerAuth(h, user.id), "add a colleague");
      expect(res.status).toBe(200);

      const [row] = await h.db.select().from(profiles).where(eq(profiles.userId, user.id));
      expect(row).toBeDefined();
      expect(row!.fullName).toBe("Agent Created");
      // The zodiac is derived by the service, on this path as on every other.
      expect(row!.zodiacSign).toBe("Aries");
    } finally {
      await h.close();
    }
  });

  test("createProfile through the agent also queues an embedding", async () => {
    const { h } = scripted([
      {
        toolCalls: [
          {
            toolName: "createProfile",
            input: { full_name: "Queued By Agent", relationship_type: "Friend" },
          },
        ],
      },
      { text: "Done." },
    ]);
    try {
      const user = await seedUser(h);
      await chat(h, await bearerAuth(h, user.id), "add a friend");

      await waitFor(
        async () => {
          const [row] = await h.db.select().from(profileEmbeddings);
          return row ?? null;
        },
        { what: "the agent-created profile's embedding" }
      );
    } finally {
      await h.close();
    }
  });

  test("updateProfile keeps merge semantics, changing only what it is sent", async () => {
    const user = await seedUser(plain, { email: "agent-update@example.com" });
    const headers = await bearerAuth(plain, user.id);
    const created = await call<{ id: number }>(plain.app, "POST", "/api/v1/profiles", {
      headers,
      body: profileInput({
        full_name: "Original Name",
        bio: "a bio worth keeping",
        tags: [{ tag: "keep-me" }],
      }),
    });

    const { h } = scripted([
      {
        toolCalls: [
          {
            toolName: "updateProfile",
            input: { id: created.body.id, profile: { full_name: "Renamed By Agent" } },
          },
        ],
      },
      { text: "Renamed." },
    ]);
    try {
      await chat(h, headers, "rename them");

      const got = await call<ProfileOutput>(h.app, "GET", `/api/v1/profiles/${created.body.id}`, {
        headers,
      });
      expect(got.body.full_name).toBe("Renamed By Agent");
      // The agent sends partial updates; untouched fields must survive.
      expect(got.body.bio).toBe("a bio worth keeping");
      expect(got.body.tags.map((t) => t.tag)).toEqual(["keep-me"]);
    } finally {
      await h.close();
    }
  });

  test("ragSearch returns semantically ranked matches", async () => {
    const { h } = scripted([
      { toolCalls: [{ toolName: "ragSearch", input: { query: "climbing granite", limit: 5 } }] },
      { text: "Your climber friend." },
    ]);
    try {
      const user = await seedUser(h);
      const headers = await bearerAuth(h, user.id);

      const climber = await call<{ id: number }>(h.app, "POST", "/api/v1/profiles", {
        headers,
        body: profileInput({ full_name: "Climber Friend", bio: "loves climbing granite" }),
      });
      await call(h.app, "POST", "/api/v1/profiles", {
        headers,
        body: profileInput({ full_name: "Baker Friend", bio: "loves sourdough" }),
      });

      await waitFor(
        async () => {
          const rows = await h.db.select().from(profileEmbeddings);
          return rows.length === 2 ? rows : null;
        },
        { what: "both embeddings" }
      );

      const res = await chat(h, headers, "who likes climbing?");
      expect(res.body).toContain("Climber Friend");
      // The id must be a number in the tool payload, not a bigint string.
      expect(res.body).toContain(`"profile_id":${climber.body.id}`);
    } finally {
      await h.close();
    }
  });

  test("ragSearch degrades to a helpful error when embeddings are unavailable", async () => {
    const model = mockChatModel([
      { toolCalls: [{ toolName: "ragSearch", input: { query: "anything", limit: 5 } }] },
      { text: "Semantic search is off." },
    ]);
    const h = createHarness({ chatModel: model.model, withEmbeddings: false });
    try {
      const user = await seedUser(h);
      const res = await chat(h, await bearerAuth(h, user.id), "who likes climbing?");

      expect(res.status).toBe(200);
      expect(res.body).toContain("Semantic search is unavailable");
    } finally {
      await h.close();
    }
  });
});
