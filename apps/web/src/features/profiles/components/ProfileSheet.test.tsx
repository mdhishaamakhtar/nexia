import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { makeFullProfile, makeProfile } from "@test/fixtures";
import { PROFILE_SECTIONS } from "../sections";
import ProfileSheet from "./ProfileSheet";

describe("ProfileSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 1, 12));
  });
  afterEach(() => vi.useRealTimers());

  test("shows a panel for everything that has something in it", () => {
    const { container } = render(<ProfileSheet profile={makeFullProfile()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Asha Kumar" })).toBeInTheDocument();
    expect(screen.getByText("she/her")).toBeInTheDocument();
    expect(screen.getAllByText("Pisces").length).toBeGreaterThan(0);
    expect(screen.getByText(/30 years old/)).toBeInTheDocument();
    // One panel per section, in the order the form uses too.
    expect(
      screen.getAllByRole("region").map((panel) => within(panel).getByRole("heading").textContent)
    ).toEqual(PROFILE_SECTIONS.map((section) => section.title));
    expect(
      within(screen.getByRole("list", { name: "Tags" })).getByText("night owl")
    ).toBeInTheDocument();
    expect(screen.getByText("Kun Faya Kun")).toBeInTheDocument();
    expect(screen.getByLabelText("Number 3")).toBeInTheDocument();
    for (const text of ["Illustrator", "Spirited Away", "The Hobbit", "Anything with strings"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    for (const text of ["animation", "fantasy", "the old library", "vegetarian", "green"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByText("Open a studio by the sea.")).toBeInTheDocument();
    expect(screen.getByText("Allergic to cats.")).toBeInTheDocument();
    // The whole page takes the person's colour.
    expect(container.querySelector("article")).toHaveClass(/^person-/);
  });

  test("puts the page's controls at the top of the coloured block", () => {
    render(
      <ProfileSheet profile={makeFullProfile()} toolbar={<button type="button">Edit</button>} />
    );
    const header = screen.getByRole("heading", { level: 1 }).closest("header")!;
    expect(within(header).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  test("opens a quote as their words and a memory as yours", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<ProfileSheet profile={makeFullProfile()} />);

    await user.click(screen.getByRole("button", { name: /If it scares you/ }));
    expect(screen.getByRole("dialog", { name: "Asha Kumar, in their words" })).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: /monsoon/ }));
    expect(screen.getByRole("dialog", { name: "A memory with Asha Kumar" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("folds a long list of quotes or memories until asked for all of it", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const quotes = ["One", "Two", "Three", "Four", "Five"].map((n) => `Quote number ${n}`);
    render(
      <ProfileSheet
        profile={makeFullProfile({ quotes, favorite_memories: ["Only this one memory"] })}
      />
    );
    const words = screen.getByRole("region", { name: "In their words" });

    expect(within(words).getByText("Quote number Three")).toBeInTheDocument();
    expect(within(words).queryByText("Quote number Four")).not.toBeInTheDocument();
    // A list that already fits has no button.
    expect(
      within(screen.getByRole("region", { name: "Memories together" })).queryByRole("button", {
        name: /Show/,
      })
    ).not.toBeInTheDocument();

    const showAll = within(words).getByRole("button", { name: "Show all 5 quotes" });
    expect(showAll).toHaveAttribute("aria-expanded", "false");
    await user.click(showAll);
    expect(within(words).getByText("Quote number Five")).toBeInTheDocument();

    await user.click(within(words).getByRole("button", { name: "Show fewer" }));
    expect(within(words).queryByText("Quote number Four")).not.toBeInTheDocument();
  });

  test("keeps what they listen to with their songs, even with no songs listed", () => {
    render(<ProfileSheet profile={makeFullProfile({ top_songs: [] })} />);
    expect(
      within(screen.getByRole("region", { name: "On repeat" })).getByText("Anything with strings")
    ).toBeInTheDocument();
  });

  test("with only a name, says there's nothing else yet", () => {
    render(<ProfileSheet profile={makeProfile()} />);
    expect(screen.getByText(/Nothing else written down yet/)).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Tags" })).not.toBeInTheDocument();
  });
});
