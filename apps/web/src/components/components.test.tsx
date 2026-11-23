import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { ZODIAC_SIGNS } from "@nexia/shared";
import BackButton from "@/components/atoms/BackButton";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import Logo, { LogoMark } from "@/components/atoms/Logo";
import SearchField from "@/components/atoms/SearchField";
import Textarea from "@/components/atoms/Textarea";
import Tooltip from "@/components/atoms/Tooltip";
import AuthCard, { AuthLink, AuthNotice } from "@/components/layout/AuthCard";
import PageShell from "@/components/layout/PageShell";
import CardProfilePreview from "@/components/molecules/CardProfilePreview";
import Navbar from "@/components/molecules/Navbar";
import Avatar, { Shape } from "@/features/profiles/components/Avatar";
import SheetSection from "@/features/profiles/components/SheetSection";
import ZodiacIcon from "@/features/profiles/components/ZodiacIcon";
import { PROFILE_SECTIONS } from "@/features/profiles/sections";
import { AppQueryProvider } from "@/shared/providers/query-provider";
import { makeSummary } from "@test/fixtures";

const signOut = vi.fn();
let pathname = "/profiles";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ signOut }) }));

describe("Button", () => {
  test("is a real button by default, and never submits by accident", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  test("while loading it is busy and can't be pressed again", () => {
    render(
      <Button isLoading variant="destructive" size="lg">
        Delete
      </Button>
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  test("with an href it is a link that looks the same", () => {
    render(
      <Button href="/profiles" variant="secondary" size="sm">
        Back to your slambook
      </Button>
    );
    expect(screen.getByRole("link", { name: "Back to your slambook" })).toHaveAttribute(
      "href",
      "/profiles"
    );
  });
});

describe("fields", () => {
  test("label, hint, error and required are all wired for assistive tech", () => {
    const ref = createRef<HTMLInputElement>();
    const { rerender } = render(
      <Input ref={ref} label="Full name" required hint="As they'd say it" />
    );
    const input = screen.getByRole("textbox", { name: /Full name/ });
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveAccessibleDescription("As they'd say it");
    expect(ref.current).toBe(input);

    rerender(<Input ref={ref} label="Full name" required error="Add their name" />);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Add their name");
  });

  test("a textarea gets the same treatment", () => {
    render(<Textarea label="Bio" error="Too long" />);
    const box = screen.getByRole("textbox", { name: "Bio" });
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAccessibleDescription("Too long");
  });

  test("search clears from its own button or with Escape", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<SearchField value="" onChange={onChange} label="Search" />);
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "Search" }), "a");
    expect(onChange).toHaveBeenCalledWith("a");

    rerender(<SearchField value="asha" onChange={onChange} label="Search" />);
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(screen.getByRole("searchbox")).toHaveFocus();

    onChange.mockClear();
    await user.keyboard("{Escape}");
    expect(onChange).toHaveBeenCalledWith("");
  });
});

describe("small pieces", () => {
  test("a tooltip labels an icon button for sighted users only", () => {
    render(
      <Tooltip label="Edit" side="top">
        <button type="button" aria-label="Edit profile" />
      </Tooltip>
    );
    expect(screen.getByRole("button", { name: "Edit profile" })).toBeInTheDocument();
    expect(screen.getByText("Edit")).toHaveAttribute("aria-hidden", "true");
  });

  test("the back button names itself when it has no label", () => {
    const { rerender } = render(<BackButton href="/profiles" />);
    expect(screen.getByRole("link", { name: "Go back" })).toHaveAttribute("href", "/profiles");
    rerender(<BackButton href="/profiles" label="Back" />);
    expect(screen.getByRole("link", { name: "Back" })).toBeInTheDocument();
  });

  test("a back button on someone's colour can drop to its arrow on a phone and keep its name", () => {
    render(<BackButton href="/profiles" label="Your people" onColor collapse />);
    const link = screen.getByRole("link", { name: "Your people" });
    expect(link).toHaveClass("bg-white/70");
    expect(screen.getByText("Your people")).toHaveClass("sr-only", "sm:not-sr-only");
  });

  test("the logo says Nexia; its mark alone is decoration", () => {
    const { container } = render(
      <>
        <Logo size="lg" />
        <LogoMark size={20} />
      </>
    );
    expect(screen.getByText("Nexia")).toBeInTheDocument();
    const marks = container.querySelectorAll("svg");
    expect(marks).toHaveLength(2);
    marks.forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
      // Four petals and the centre.
      expect(svg.querySelectorAll("circle")).toHaveLength(5);
    });
  });

  test("the page shell and an avatar render as asked", () => {
    const { container } = render(
      <PageShell as="section" width="reading" id="shell">
        <Avatar id={3} name="  zoë" size="lg" />
        <Avatar id={4} name="   " />
      </PageShell>
    );
    expect(container.querySelector("section#shell")).toHaveClass("shell", "shell-reading");
    expect(screen.getByText("Z")).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  test("an avatar is the person's shape in the person's colour, and only decoration", () => {
    const { container } = render(
      <>
        <Avatar id={3} name="Zoë" />
        <Avatar id={10} name="Sana" />
        <Shape id={10} className="h-4 w-4" />
      </>
    );
    const [zoe, sana, bare] = container.querySelectorAll("svg");
    // id 3 → the fourth colour and the fourth shape; id 10 → the fifth and the fourth.
    expect(zoe).toHaveClass("person-sky");
    expect(zoe).toHaveAttribute("data-shape", "flower");
    expect(sana).toHaveClass("person-lilac");
    expect(sana).toHaveAttribute("data-shape", "flower");
    expect(zoe).toHaveAttribute("aria-hidden", "true");
    // The bare shape is the same drawing with no initial in it.
    expect(bare).toHaveClass("person-lilac", "h-4");
    expect(bare!.querySelector("text")).toBeNull();
  });

  test.each([...ZODIAC_SIGNS, "Unknown"])("the %s icon draws", (sign) => {
    const { container } = render(<ZodiacIcon sign={sign} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe("layout", () => {
  test("every signed-out page is one panel under the mark", () => {
    render(
      <AuthCard
        title="Check your email"
        subtitle="Almost there"
        footer={<AuthLink href="/login">Back</AuthLink>}
      >
        <AuthNotice>Something went wrong</AuthNotice>
        <AuthNotice tone="success">Sent</AuthNotice>
      </AuthCard>
    );
    expect(screen.getByRole("link", { name: "Nexia home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("heading", { level: 1, name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText("Almost there")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByRole("status")).toHaveTextContent("Sent");
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/login");
  });

  test("the navbar marks where you are and signs you out", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Navbar />);
    expect(screen.getByRole("link", { name: "Ask Nexia" })).not.toHaveAttribute("aria-current");
    unmount();

    pathname = "/chat";
    render(<Navbar />);
    expect(screen.getByRole("link", { name: "Nexia" })).toHaveAttribute("href", "/profiles");
    expect(screen.getByRole("link", { name: "Ask Nexia" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  test("a profile card shows who they are and a few tags", () => {
    render(
      <CardProfilePreview
        profile={makeSummary({
          id: 5,
          full_name: "Zoë Fernandes",
          pronouns: "she/her",
          zodiac_sign: "Scorpio",
          tags: ["cousin", "baker", "runner", "chess"],
        })}
      />
    );
    const card = screen.getByRole("link", { name: /Zoë Fernandes/ });
    expect(card).toHaveAttribute("href", "/profiles/5");
    expect(card).toHaveTextContent("Scorpio");
    expect(card).toHaveClass("person-pink", "card-person");
    expect(card).toHaveTextContent("+1 more");
    expect(card).not.toHaveTextContent("chess");
  });

  test("a sheet section is a titled region", () => {
    render(
      <SheetSection section={PROFILE_SECTIONS[0]!}>
        <p>inside</p>
      </SheetSection>
    );
    expect(screen.getByRole("region", { name: PROFILE_SECTIONS[0]!.title })).toHaveTextContent(
      "inside"
    );
  });

  test("the app's providers render their children", () => {
    render(
      <AppQueryProvider>
        <p>app</p>
      </AppQueryProvider>
    );
    expect(screen.getByText("app")).toBeInTheDocument();
  });
});
