import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { makeFullProfile, makeProfile } from "@test/fixtures";
import ProfileSheet from "./ProfileSheet";

describe("ProfileSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 1, 12));
  });
  afterEach(() => vi.useRealTimers());

  test("shows every section that has something in it", () => {
    render(<ProfileSheet profile={makeFullProfile()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Asha Kumar" })).toBeInTheDocument();
    expect(screen.getByText("she/her")).toBeInTheDocument();
    expect(screen.getAllByText("Pisces").length).toBeGreaterThan(0);
    expect(screen.getByText(/30 years old/)).toBeInTheDocument();
    for (const title of ["Overview", "Favorites & interests", "Lifestyle", "Deep dive"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByText("#night owl")).toBeInTheDocument();
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

  test("with only a name, says there's nothing else yet", () => {
    render(<ProfileSheet profile={makeProfile()} />);
    expect(screen.getByText(/Nothing else written down yet/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Overview" })).not.toBeInTheDocument();
  });
});
