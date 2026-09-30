import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import Select from "./Select";

const OPTIONS = [
  { value: "friend", label: "Friend" },
  { value: "family", label: "Family" },
  { value: "colleague", label: "Colleague" },
  { value: "classmate", label: "Classmate" },
] as const;

type Value = (typeof OPTIONS)[number]["value"];

function Harness({ onBlur, error }: { onBlur?: () => void; error?: string }) {
  const [value, setValue] = useState<Value>("friend");
  return (
    <>
      <Select
        label="Relationship"
        value={value}
        onChange={setValue}
        options={OPTIONS}
        onBlur={onBlur}
        error={error}
        hint="How you know them"
      />
      <output>{value}</output>
      <button type="button">elsewhere</button>
    </>
  );
}

const trigger = () => screen.getByRole("combobox", { name: /Relationship/ });

describe("Select", () => {
  test("is labelled, describes itself and shows the current choice", () => {
    render(<Harness error="Pick one" />);
    expect(trigger()).toHaveTextContent("Friend");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveAccessibleDescription(/Pick one/);
  });

  test("opens on click, and a click on an option picks it and closes", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(trigger());
    expect(screen.getByRole("listbox")).toHaveFocus();
    expect(screen.getByRole("option", { name: "Friend" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("option", { name: "Colleague" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("colleague");
    expect(trigger()).toHaveFocus();
  });

  test("works from the keyboard: arrows, Home, End, typeahead, Enter", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    trigger().focus();
    await user.keyboard("{ArrowDown}");
    const list = screen.getByRole("listbox");
    const active = () => document.getElementById(list.getAttribute("aria-activedescendant")!);

    expect(active()).toHaveTextContent("Friend");
    await user.keyboard("{ArrowDown}");
    expect(active()).toHaveTextContent("Family");
    await user.keyboard("{End}");
    expect(active()).toHaveTextContent("Classmate");
    await user.keyboard("{Home}");
    expect(active()).toHaveTextContent("Friend");
    await user.keyboard("{ArrowUp}");
    expect(active()).toHaveTextContent("Friend");
    // Typing a letter cycles through the options that start with it.
    await user.keyboard("c");
    expect(active()).toHaveTextContent("Colleague");
    await user.keyboard("c");
    expect(active()).toHaveTextContent("Classmate");

    await user.keyboard("{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("classmate");
  });

  test("Escape and Tab close without choosing", async () => {
    const onBlur = vi.fn();
    const user = userEvent.setup();
    render(<Harness onBlur={onBlur} />);
    await user.click(trigger());
    await user.keyboard("{ArrowDown}{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("friend");

    await user.click(trigger());
    await user.keyboard("{Tab}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onBlur).toHaveBeenCalledTimes(2);
  });

  test("a click anywhere else closes it", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "elsewhere" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  test("typing on the closed control changes the value, as a native select does", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    trigger().focus();
    await user.keyboard("f");
    expect(screen.getByRole("status")).toHaveTextContent("family");
    await user.keyboard(" ");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  test("works unlabelled in a filter bar, and can be disabled", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Select aria-label="Show" value="friend" onChange={() => {}} options={OPTIONS} />
    );
    expect(screen.getByRole("combobox", { name: "Show" })).toBeInTheDocument();

    rerender(
      <Select aria-label="Show" value="friend" onChange={() => {}} options={OPTIONS} disabled />
    );
    await user.click(screen.getByRole("combobox", { name: "Show" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
