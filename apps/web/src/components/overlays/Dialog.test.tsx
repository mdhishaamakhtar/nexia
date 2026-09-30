import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import ConfirmDialog from "@/components/molecules/ConfirmDialog";
import QuoteModal from "@/components/molecules/QuoteModal";
import StatusNote from "@/components/molecules/StatusNote";
import Dialog from "./Dialog";

function DialogHarness(props: Partial<React.ComponentProps<typeof Dialog>>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="A note"
        title="Pinned up"
        titleId="dialog-title"
        footer={<button type="button">Last</button>}
        {...props}
      >
        <button type="button">First</button>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  test("takes focus, keeps it inside, and gives it back when closed", async () => {
    const user = userEvent.setup();
    render(<DialogHarness showClose />);
    await user.click(screen.getByRole("button", { name: "Open" }));

    const dialog = screen.getByRole("dialog", { name: "Pinned up" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(document.documentElement).toHaveClass("modal-open");
    // The corner Close comes first in the sheet, so it is where focus lands.
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass("modal-open");
    expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
  });

  test("closes from its close button and from the scrim, but not from inside", async () => {
    const user = userEvent.setup();
    render(<DialogHarness showClose />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("heading", { name: "Pinned up" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("dialog").parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("a dialog that must be answered ignores Escape and the scrim", async () => {
    const user = userEvent.setup();
    render(<DialogHarness dismissible={false} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("dialog").parentElement!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("with nothing focusable, Tab stays put on the sheet", async () => {
    const user = userEvent.setup();
    function Empty() {
      const [open, setOpen] = useState(true);
      return <Dialog open={open} onClose={() => setOpen(false)} titleId="t" title="Only words" />;
    }
    render(<Empty />);
    expect(screen.getByRole("dialog")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("dialog")).toHaveFocus();
  });
});

describe("ConfirmDialog", () => {
  test("asks, starts on Cancel, and reports the answer", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        isOpen
        eyebrow="Delete profile"
        title="Delete Priya?"
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    const dialog = screen.getByRole("alertdialog", { name: "Delete Priya?" });
    expect(dialog).toHaveAccessibleDescription("This can't be undone.");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  test("while confirming, it can't be cancelled", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        isOpen
        title="Leave?"
        description="Changes will be lost."
        tone="primary"
        onConfirm={() => {}}
        onCancel={onCancel}
        isConfirming
      />
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe("QuoteModal", () => {
  test("a quote is their words, signed with their name", () => {
    render(<QuoteModal text="Eat the cake." person="Zoë" onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "Zoë, in their words" });
    expect(dialog).toHaveTextContent("Eat the cake.");
    expect(dialog.querySelector("figcaption")).toHaveTextContent("Zoë");
  });

  test("a memory is yours, shared with them, and long text drops a size", () => {
    const long = "We walked for hours. ".repeat(20);
    render(<QuoteModal text={long} person="Zoë" variant="memory" onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "A memory with Zoë" });
    expect(dialog.querySelector("figcaption")).toBeNull();
    expect(dialog.querySelector("p.text-lg")).not.toBeNull();
  });

  test("stays closed without text", () => {
    render(<QuoteModal text={null} person="Zoë" onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("StatusNote", () => {
  test("pins an empty or error state to the page with its actions", () => {
    render(
      <StatusNote
        eyebrow="Not found"
        title="Nobody here"
        headingLevel="h1"
        actions={<button type="button">Go back</button>}
      >
        They may have been deleted.
      </StatusNote>
    );
    expect(screen.getByRole("heading", { level: 1, name: "Nobody here" })).toBeInTheDocument();
    expect(screen.getByText("They may have been deleted.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go back" })).toBeInTheDocument();
  });
});
