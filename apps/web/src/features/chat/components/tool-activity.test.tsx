import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { makeProfile, makeSummary } from "@test/fixtures";
import type { ToolPart } from "@/features/chat/lib/tool-meta";
import { ToolActivity } from "./tool-activity";

function part(type: string, state: string, extra: Record<string, unknown> = {}): ToolPart {
  return { type, toolCallId: "call-1", state, input: {}, ...extra } as unknown as ToolPart;
}

function show(p: ToolPart) {
  const onApproval = vi.fn();
  render(<ToolActivity part={p} onApproval={onApproval} />);
  return onApproval;
}

describe("a write the agent proposes", () => {
  const input = {
    full_name: "Zoë",
    relationship_type: "Family",
    birthday: "1988-11-02",
    tags: ["baker", "cousin"],
    quotes: [],
    top_songs: [{ name: "Yellow", artist: "Coldplay" }, { name: "Holocene" }],
    associated_song: { name: "Kun Faya Kun", artist: "" },
    pronouns: "",
  };

  test("shows exactly what would be saved and waits for an answer", async () => {
    const user = userEvent.setup();
    const onApproval = show(
      part("tool-createProfile", "approval-requested", { input, approval: { id: "ap-1" } })
    );
    expect(screen.getByText("Add to your slambook")).toBeInTheDocument();
    // As the note's title, and again in the Name row.
    expect(screen.getAllByText("Zoë")).toHaveLength(2);
    expect(screen.getByText("baker, cousin")).toBeInTheDocument();
    expect(screen.getByText("(cleared)")).toBeInTheDocument(); // quotes: []
    expect(screen.getByText(/1\. Yellow by Coldplay\s+2\. Holocene/)).toBeInTheDocument();
    expect(screen.getByText("Kun Faya Kun")).toBeInTheDocument();
    expect(screen.queryByText("Pronouns")).not.toBeInTheDocument(); // empty, so not shown

    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Not now" }));
    expect(onApproval.mock.calls).toEqual([
      ["ap-1", true],
      ["ap-1", false],
    ]);
  });

  test("an update names who changes, and says when a birthday is cleared", () => {
    show(
      part("tool-updateProfile", "approval-requested", {
        input: { id: 4, profile: { full_name: "Zoë", birthday: null } },
        approval: { id: "ap-2" },
      })
    );
    expect(screen.getByText("Update a profile")).toBeInTheDocument();
    expect(screen.getByText("Change Zoë")).toBeInTheDocument();
    expect(screen.getByText("(cleared)")).toBeInTheDocument();
  });

  test("an update without a name, while the details still stream in", () => {
    show(part("tool-updateProfile", "input-streaming", { input: { id: 4, profile: {} } }));
    expect(screen.getByText("Save these changes")).toBeInTheDocument();
    expect(screen.getByText("Getting the details ready…")).toBeInTheDocument();
  });

  test("once approved it says it is saving; once declined, that it wasn't", () => {
    const { unmount } = render(
      <ToolActivity
        part={part("tool-createProfile", "approval-responded", {
          input: {},
          approval: { id: "a", approved: true },
        })}
        onApproval={() => {}}
      />
    );
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    expect(screen.getByText("New profile")).toBeInTheDocument();
    unmount();

    show(
      part("tool-createProfile", "approval-responded", { approval: { id: "a", approved: false } })
    );
    expect(screen.getByText("Not saved")).toBeInTheDocument();
  });

  test("a saved write links to the person; a refused or failed one says so", () => {
    const profile = makeProfile({ id: 4, full_name: "Zoë" });
    const { unmount } = render(
      <ToolActivity
        part={part("tool-updateProfile", "output-available", {
          output: { id: 4, full_name: "Zoë", profile },
        })}
        onApproval={() => {}}
      />
    );
    expect(screen.getByRole("link", { name: /Updated Zoë/ })).toHaveAttribute(
      "href",
      "/profiles/4"
    );
    unmount();

    const denied = render(
      <ToolActivity part={part("tool-createProfile", "output-denied")} onApproval={() => {}} />
    );
    expect(screen.getByText("Not saved")).toBeInTheDocument();
    denied.unmount();

    const failed = render(
      <ToolActivity part={part("tool-createProfile", "output-error")} onApproval={() => {}} />
    );
    expect(screen.getByText("That couldn't be saved.")).toBeInTheDocument();
    failed.unmount();

    show(part("tool-createProfile", "output-available", { output: { unexpected: true } }));
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("a lookup", () => {
  test("says what it is doing while it runs", () => {
    show(part("tool-ragSearch", "input-available"));
    expect(screen.getByText("Searching memories…")).toBeInTheDocument();
  });

  test("reports a failure, hard or soft", () => {
    const { unmount } = render(
      <ToolActivity part={part("tool-getProfile", "output-error")} onApproval={() => {}} />
    );
    expect(screen.getByText("That lookup failed.")).toBeInTheDocument();
    unmount();

    show(part("tool-getProfile", "output-available", { output: { error: "Profile not found" } }));
    expect(screen.getByText("Profile not found")).toBeInTheDocument();
  });

  test("one person is shown as their card", () => {
    show(part("tool-getProfile", "output-available", { output: makeProfile({ id: 9 }) }));
    expect(screen.getByRole("link", { name: /Asha Kumar/ })).toHaveAttribute("href", "/profiles/9");
  });

  test("several are folded away until opened", async () => {
    const user = userEvent.setup();
    const profiles = Array.from({ length: 8 }, (_, i) =>
      makeSummary({
        id: i + 1,
        full_name: `Person ${i + 1}`,
        zodiac_sign: "Leo",
        tags: ["a", "b", "c"],
      })
    );
    show(part("tool-listProfiles", "output-available", { output: { profiles, total: 8 } }));
    const toggle = screen.getByRole("button", { name: /Looked through everyone · 8 people/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("link")).toHaveLength(6);
    expect(screen.getByText("and 2 more")).toBeInTheDocument();
  });

  test("an empty result says so", () => {
    show(part("tool-searchProfiles", "output-available", { output: { profiles: [], total: 0 } }));
    expect(screen.getByText("Searched profiles: nothing found")).toBeInTheDocument();
  });
});
