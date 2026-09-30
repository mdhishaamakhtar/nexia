import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { formatDate } from "@/shared/lib/dates";
import DatePicker from "./DatePicker";

function Harness({ initial = "", max }: { initial?: string; max?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <DatePicker label="Birthday" value={value} onChange={setValue} max={max} hint="Optional" />
      <output>{value || "none"}</output>
      <button type="button">elsewhere</button>
    </>
  );
}

const trigger = () => screen.getByRole("button", { name: /^Birthday/ });
const day = (iso: string) => screen.getByRole("button", { name: formatDate(iso, "long")! });

describe("DatePicker", () => {
  beforeEach(() => {
    // Pin "today" so the grids are the same on any day the suite runs.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 1, 12));
  });
  afterEach(() => vi.useRealTimers());

  test("with nothing chosen, opens on the years, since a birthday is decades back", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(trigger()).toHaveTextContent("Pick a date");

    await user.click(trigger());
    const years = screen.getByRole("listbox", { name: "Year" });
    expect(within(years).getByRole("option", { name: "2026" })).toHaveFocus();

    await user.click(within(years).getByRole("option", { name: "1996" }));
    await user.click(screen.getByRole("option", { name: "Mar" }));
    await user.click(day("1996-03-16"));

    expect(screen.getByRole("status")).toHaveTextContent("1996-03-16");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveTextContent(formatDate("1996-03-16", "long")!);
    expect(trigger()).toHaveFocus();
  });

  test("with a date, opens on its month with that day focused and marked", async () => {
    const user = userEvent.setup();
    render(<Harness initial="1996-03-16" />);
    await user.click(trigger());
    expect(screen.getByRole("grid", { name: "March 1996" })).toBeInTheDocument();
    expect(day("1996-03-16")).toHaveFocus();
    expect(day("1996-03-16").parentElement).toHaveAttribute("aria-selected", "true");
  });

  test("the day grid follows the date-picker keyboard pattern", async () => {
    const user = userEvent.setup();
    render(<Harness initial="1996-03-16" />);
    await user.click(trigger());

    await user.keyboard("{ArrowRight}");
    expect(day("1996-03-17")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(day("1996-03-24")).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowLeft}");
    expect(day("1996-03-16")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(day("1996-03-11")).toHaveFocus(); // the Monday of that week
    await user.keyboard("{End}");
    expect(day("1996-03-17")).toHaveFocus();
    await user.keyboard("{PageDown}");
    expect(day("1996-04-17")).toHaveFocus();
    await user.keyboard("{Shift>}{PageUp}{/Shift}");
    expect(day("1995-04-17")).toHaveFocus();
    await user.keyboard("{PageUp}");
    expect(day("1995-03-17")).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("1995-03-17");
  });

  test("the arrows page months, and the heading switches to years and back", async () => {
    const user = userEvent.setup();
    render(<Harness initial="1996-03-16" />);
    await user.click(trigger());

    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("grid", { name: "April 1996" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("grid", { name: "February 1996" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "February 1996" }));
    expect(screen.getByRole("listbox", { name: "Year" })).toBeInTheDocument();
    // Escape steps back to the days before it closes anything.
    await user.keyboard("{Escape}");
    expect(screen.getByRole("grid")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  test("years and months can be chosen by keyboard", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(trigger());
    // Years run newest first, four to a row: down is four years back, right one.
    await user.keyboard("{ArrowDown}{ArrowRight}");
    expect(screen.getByRole("option", { name: "2021" })).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowLeft}");
    expect(screen.getByRole("option", { name: "2026" })).toHaveFocus();
    await user.keyboard("{Enter}");

    // Months, three to a row, open on the month in focus.
    expect(screen.getByRole("option", { name: "Oct" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Previous year" }));
    expect(screen.getByRole("button", { name: "2025" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next year" }));
    screen.getByRole("option", { name: "Oct" }).focus();
    await user.keyboard("{ArrowLeft}{ArrowUp}{ArrowDown}{ArrowRight}{ArrowLeft}");
    expect(screen.getByRole("option", { name: "Sep" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("grid", { name: "September 2026" })).toBeInTheDocument();
  });

  test("days after `max` can't be picked, and the calendar starts no later than it", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-09-20" max="2026-09-25" />);
    await user.click(trigger());
    expect(day("2026-09-26")).toBeDisabled();
    await user.click(day("2026-09-26"));
    expect(screen.getByRole("status")).toHaveTextContent("2026-09-20");
    await user.click(day("2026-09-25"));
    expect(screen.getByRole("status")).toHaveTextContent("2026-09-25");
  });

  test("a chosen date can be cleared, and a click outside closes the calendar", async () => {
    const user = userEvent.setup();
    render(<Harness initial="1996-03-16" />);
    await user.click(screen.getByRole("button", { name: "Clear birthday" }));
    expect(screen.getByRole("status")).toHaveTextContent("none");
    expect(trigger()).toHaveFocus();

    await user.click(trigger());
    expect(screen.getByRole("dialog", { name: "Choose birthday" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "elsewhere" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(trigger());
    await user.click(trigger());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
