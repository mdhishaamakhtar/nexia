import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChatStatus, UIMessage } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ChatComposer } from "./chat-composer";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatHeader } from "./chat-header";
import { ChatMessage } from "./chat-message";

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));

afterEach(() => vi.restoreAllMocks());

function Composer({ status = "ready" as ChatStatus, onSubmit = vi.fn(), onStop = vi.fn() }) {
  const [value, setValue] = useState("");
  return (
    <ChatComposer
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      onStop={onStop}
      status={status}
    />
  );
}

describe("the composer", () => {
  test("Enter sends, Shift+Enter makes a new line, and blank can't be sent", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Composer onSubmit={onSubmit} />);
    const box = screen.getByRole("textbox", { name: "Ask Nexia about your people" });
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    await user.type(box, "   {Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    await user.clear(box);
    await user.type(box, "Who likes jazz?{Shift>}{Enter}{/Shift}and cats{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("Who likes jazz?\nand cats");

    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  test("while a reply comes in, it offers to stop instead", async () => {
    const onStop = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Composer status="submitted" onStop={onStop} />);
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
    rerender(<Composer status="streaming" onStop={onStop} />);
    expect(screen.getByText("Answering…")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Stop the reply" }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  test("on a touch screen, Enter makes a new line and the button sends", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query) =>
        ({
          matches: query === "(pointer: coarse)",
          addEventListener() {},
          removeEventListener() {},
        }) as unknown as MediaQueryList
    );
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Composer onSubmit={onSubmit} />);
    await user.type(screen.getByRole("textbox"), "line one{Enter}line two");
    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).toHaveBeenCalledWith("line one\nline two");
  });
});

describe("the start of a conversation", () => {
  test("offers questions to start with", async () => {
    const onPrompt = vi.fn();
    const user = userEvent.setup();
    render(<ChatEmptyState onPrompt={onPrompt} />);
    await user.click(screen.getByRole("button", { name: "Who's vegetarian?" }));
    expect(onPrompt).toHaveBeenCalledWith("Who's vegetarian?");
  });

  test("the header starts over only when there is something to clear", async () => {
    const onNew = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<ChatHeader onNewConversation={onNew} hasConversation={false} />);
    expect(screen.getByRole("heading", { name: "Ask Nexia" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /new conversation/i })).not.toBeInTheDocument();

    rerender(<ChatHeader onNewConversation={onNew} hasConversation />);
    await user.click(screen.getByRole("button", { name: /new conversation/i }));
    expect(onNew).toHaveBeenCalledOnce();
  });
});

describe("messages", () => {
  const message = (role: UIMessage["role"], parts: UIMessage["parts"]): UIMessage => ({
    id: "m1",
    role,
    parts,
  });

  test("your own words are shown as typed, not as markdown", () => {
    render(
      <ChatMessage
        message={message("user", [{ type: "text", text: "**not bold**" }])}
        onApproval={() => {}}
      />
    );
    expect(screen.getByText("**not bold**")).toBeInTheDocument();
  });

  test("a message with no text shows nothing", () => {
    const { container } = render(
      <ChatMessage message={message("user", [{ type: "text", text: "" }])} onApproval={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  test("a reply renders its markdown and tools, and can be copied", async () => {
    // user-event puts its own clipboard in place; watch that one.
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(
      <ChatMessage
        message={message("assistant", [
          {
            type: "text",
            text: "Asha is **vegetarian**.\n\n| Name | Food |\n| --- | --- |\n| Asha | veg |",
          },
          { type: "tool-ragSearch", toolCallId: "t", state: "input-available", input: {} },
          { type: "reasoning", text: "hidden" },
        ] as UIMessage["parts"])}
        onApproval={() => {}}
      />
    );
    expect(await screen.findByText("vegetarian")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Searching memories…")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Copy reply" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Asha is **vegetarian**."));
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  test("copying quietly does nothing where the clipboard is blocked", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(
      <ChatMessage
        message={message("assistant", [{ type: "text", text: "Hi" }])}
        onApproval={() => {}}
      />
    );
    await user.click(await screen.findByRole("button", { name: "Copy reply" }));
    expect(screen.getByRole("button", { name: "Copy reply" })).toBeInTheDocument();
  });
});
