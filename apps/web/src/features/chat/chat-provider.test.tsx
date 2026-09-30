import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { http, HttpResponse } from "msw";
import { describe, expect, test, vi } from "vitest";
import { profileKeys } from "@/features/profiles/hooks";
import { CSRF_COOKIE_NAME } from "@/shared/api/cookies";
import { makeProfile } from "@test/fixtures";
import { testQueryClient, withQueryClient } from "@test/query";
import { API, mockApi } from "@test/server";
import { ChatProvider, useNexiaChat } from "./chat-provider";

const server = mockApi();

function Chat() {
  const { messages, sendMessage, status, clear } = useNexiaChat();
  return (
    <>
      <button type="button" onClick={() => void sendMessage({ text: "Add Zoë" })}>
        send
      </button>
      <button type="button" onClick={clear}>
        clear
      </button>
      <output>{`${status}:${messages.length}`}</output>
    </>
  );
}

function renderChat() {
  const client = testQueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const Query = withQueryClient(client);
  render(
    <Query>
      <ChatProvider>
        <Chat />
      </ChatProvider>
    </Query>
  );
  return { invalidate, user: userEvent.setup() };
}

/** A reply in the AI SDK's own stream format, as the API sends it. */
function reply(
  write: (
    w: Parameters<Parameters<typeof createUIMessageStream>[0]["execute"]>[0]["writer"]
  ) => void
) {
  return createUIMessageStreamResponse({
    stream: createUIMessageStream({ execute: ({ writer }) => write(writer) }),
  });
}

describe("the conversation", () => {
  test("sends with the CSRF token, and a saved profile refreshes everywhere", async () => {
    document.cookie = `${CSRF_COOKIE_NAME}=tok`;
    let csrf: string | null = null;
    server.use(
      http.post(`${API}/chat`, ({ request }) => {
        csrf = request.headers.get("X-CSRF-Token");
        return reply((writer) => {
          writer.write({ type: "start" });
          writer.write({
            type: "tool-input-available",
            toolCallId: "c1",
            toolName: "createProfile",
            input: { full_name: "Zoë", relationship_type: "Family" },
          });
          writer.write({
            type: "tool-output-available",
            toolCallId: "c1",
            output: { id: 4, full_name: "Zoë", profile: makeProfile({ id: 4, full_name: "Zoë" }) },
          });
          writer.write({ type: "text-start", id: "t" });
          writer.write({ type: "text-delta", id: "t", delta: "Added Zoë." });
          writer.write({ type: "text-end", id: "t" });
          writer.write({ type: "finish" });
        });
      })
    );
    const { invalidate, user } = renderChat();
    await user.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("ready:2"));
    expect(csrf).toBe("tok");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: profileKeys.detail(4) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: profileKeys.lists });

    await user.click(screen.getByRole("button", { name: "clear" }));
    expect(screen.getByRole("status")).toHaveTextContent("ready:0");
  });

  test("a reply that only reads changes nothing", async () => {
    server.use(
      http.post(`${API}/chat`, () =>
        reply((writer) => {
          writer.write({ type: "start" });
          writer.write({
            type: "tool-input-available",
            toolCallId: "c1",
            toolName: "createProfile",
            input: {},
          });
          writer.write({ type: "tool-output-available", toolCallId: "c1", output: { nope: 1 } });
          writer.write({
            type: "tool-input-available",
            toolCallId: "c2",
            toolName: "listProfiles",
            input: {},
          });
          writer.write({
            type: "tool-output-available",
            toolCallId: "c2",
            output: { profiles: [], total: 0 },
          });
          writer.write({ type: "finish" });
        })
      )
    );
    const { invalidate, user } = renderChat();
    await user.click(screen.getByRole("button", { name: "send" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("ready:2"));
    expect(invalidate).not.toHaveBeenCalled();
  });

  test("a lost session ends in an error, not a hang", async () => {
    server.use(http.post(`${API}/chat`, () => new HttpResponse(null, { status: 401 })));
    const { user } = renderChat();
    await user.click(screen.getByRole("button", { name: "send" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/^error/));
  });

  test("is a programming error outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useNexiaChat(), { wrapper: withQueryClient() })).toThrow(
      /within a ChatProvider/
    );
  });
});
