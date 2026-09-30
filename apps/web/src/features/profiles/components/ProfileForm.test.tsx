import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeFullProfile } from "@test/fixtures";
import { toFormValues } from "../form";
import ProfileForm from "./ProfileForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function renderForm(initialValues = toFormValues()) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(
    <ProfileForm
      initialValues={initialValues}
      onSubmit={onSubmit}
      isSubmitting={false}
      submitLabel="Save profile"
      cancelHref="/profiles"
    />
  );
  return { onSubmit, user };
}

const save = () => screen.getByRole("button", { name: "Save profile" });

beforeEach(() => push.mockReset());

describe("ProfileForm", () => {
  test("offers nothing to save until something changes", async () => {
    const { user } = renderForm();
    expect(save()).toBeDisabled();
    expect(screen.getByText("Nothing to save yet")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Full name/), "Asha");
    expect(save()).toBeEnabled();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  test("saves every kind of field, including what was typed but never added", async () => {
    const { user, onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/Full name/), "Asha Kumar");
    await user.click(screen.getByRole("combobox", { name: /Relationship/ }));
    await user.click(screen.getByRole("option", { name: "Family" }));

    await user.click(screen.getByRole("button", { name: /^Birthday/ }));
    await user.click(screen.getByRole("option", { name: "1996" }));
    await user.click(screen.getByRole("option", { name: "Mar" }));
    await user.click(screen.getByRole("button", { name: /March 16, 1996|16 March 1996/ }));

    const tags = screen.getByRole("textbox", { name: "Tags" });
    await user.type(tags, "night owl{Enter}");
    await user.type(tags, "NIGHT OWL{Enter}"); // already there, in another case
    await user.type(tags, "temporary{Enter}");
    await user.type(tags, "{Backspace}"); // an empty box takes the last chip back
    expect(screen.queryByText("#temporary")).not.toBeInTheDocument();
    await user.type(tags, "chai person"); // never Entered

    await user.type(screen.getByRole("textbox", { name: "Their song: name" }), "Kun Faya Kun");

    const songName = screen.getByRole("textbox", { name: "Top song name" });
    await user.type(songName, "Yellow");
    await user.type(screen.getByRole("textbox", { name: "Top song artist" }), "Coldplay{Enter}");
    await user.type(songName, "Holocene");
    await user.click(screen.getByRole("button", { name: "Add song" }));
    await user.click(screen.getByRole("button", { name: "Move Holocene up" }));
    await user.type(screen.getByRole("textbox", { name: "Top song name" }), "Liability{Enter}");
    expect(screen.getByText(/That's all 3/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Liability" }));

    const quotes = screen.getByRole("textbox", { name: "Their quotes" });
    await user.type(quotes, "Eat the cake.{Enter}");
    await user.click(screen.getByRole("button", { name: "Add to their quotes" }));
    await user.type(screen.getByRole("textbox", { name: "Movie genres" }), "animation");
    await user.click(screen.getByRole("button", { name: "Add to movie genres" }));
    await user.click(screen.getByRole("button", { name: "Remove animation" }));

    await user.click(save());

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      full_name: "Asha Kumar",
      relationship_type: "Family",
      birthday: "1996-03-16",
      tags: ["night owl", "chai person"],
      associated_song: { name: "Kun Faya Kun", artist: "" },
      top_songs: [
        { name: "Holocene", artist: "" },
        { name: "Yellow", artist: "Coldplay" },
      ],
      quotes: ["Eat the cake."],
      movie_genres: [],
    });
  });

  test("keeps editing a saved profile's lists, and a memory can span lines", async () => {
    const { user, onSubmit } = renderForm(toFormValues(makeFullProfile()));
    const memories = screen.getByRole("textbox", { name: "Favorite memories" });
    await user.type(memories, "First line{Shift>}{Enter}{/Shift}second line{Enter}");
    await user.click(screen.getByRole("button", { name: "Move Yellow down" }));
    await user.click(save());

    const payload = onSubmit.mock.calls[0]![0];
    expect(payload.favorite_memories).toContain("First line\nsecond line");
    expect(payload.top_songs.map((s: { name: string }) => s.name)).toEqual([
      "Holocene",
      "Liability",
      "Yellow",
    ]);
  });

  test("says what's wrong instead of saving", async () => {
    const { user, onSubmit } = renderForm();
    await user.type(screen.getByLabelText(/Full name/), "   ");
    await user.type(screen.getByRole("textbox", { name: "Their song: artist" }), "Coldplay");
    await user.click(save());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Full name/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Add the song's name too")).toBeInTheDocument();
  });

  test("asks before leaving with unsaved changes", async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText(/Full name/), "Asha");
    await user.click(screen.getByRole("link", { name: "Cancel" }));

    const confirm = screen.getByRole("alertdialog", { name: "Leave without saving?" });
    await user.click(within(confirm).getByRole("button", { name: "Keep editing" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("link", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Leave" }));
    expect(push).toHaveBeenCalledWith("/profiles");
  });
});
