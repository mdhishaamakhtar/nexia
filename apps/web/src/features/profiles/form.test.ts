import { describe, expect, test } from "vitest";
import { makeFullProfile } from "@test/fixtures";
import { profileFormSchema, toFormValues, toProfilePayload, withItem } from "./form";
import { tapeFor, tiltFor } from "./identity";
import { FIELD_LABELS, PROFILE_SECTIONS } from "./sections";

describe("list items", () => {
  test("are trimmed and never repeated, ignoring case", () => {
    expect(withItem(["Night owl"], "  chai person ")).toEqual(["Night owl", "chai person"]);
    expect(withItem(["Night owl"], "night OWL")).toEqual(["Night owl"]);
    expect(withItem(["Night owl"], "   ")).toEqual(["Night owl"]);
  });
});

describe("form values", () => {
  test("start empty for a new person", () => {
    const values = toFormValues();
    expect(values.full_name).toBe("");
    expect(values.relationship_type).toBe("Friend");
    expect(values.birthday).toBe("");
    expect(values.associated_song).toEqual({ name: "", artist: "" });
    expect(Object.values(values.drafts).every((d) => d === "")).toBe(true);
  });

  test("round-trip a saved profile unchanged", () => {
    const profile = makeFullProfile();
    const payload = toProfilePayload(toFormValues(profile));
    expect(payload).toMatchObject({
      full_name: profile.full_name,
      birthday: profile.birthday,
      tags: profile.tags,
      top_songs: profile.top_songs,
      associated_song: profile.associated_song,
    });
  });
});

describe("saving", () => {
  test("keeps what was typed in an add box but never added", () => {
    const values = toFormValues(makeFullProfile({ tags: ["night owl"], top_songs: [] }));
    values.drafts.tags = "  chai person ";
    values.drafts.song_name = "Holocene";
    values.drafts.song_artist = " Bon Iver ";

    const payload = toProfilePayload(values);
    expect(payload.tags).toEqual(["night owl", "chai person"]);
    expect(payload.top_songs).toEqual([{ name: "Holocene", artist: "Bon Iver" }]);
  });

  test("sends a missing birthday and an empty song as nothing", () => {
    const payload = toProfilePayload(toFormValues());
    expect(payload.birthday).toBeNull();
    expect(payload.associated_song).toBeNull();
  });
});

describe("validation", () => {
  const valid = () => ({ ...toFormValues(), full_name: "Asha" });

  test("accepts a filled-in form", () => {
    expect(profileFormSchema.safeParse(valid()).success).toBe(true);
  });

  test("wants a song's name before its artist", () => {
    const result = profileFormSchema.safeParse({
      ...valid(),
      associated_song: { name: "", artist: "Coldplay" },
      drafts: { ...valid().drafts, song_artist: "Bon Iver" },
    });
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["associated_song.name", "drafts.song_name"]));
  });

  test("uses the API's own limits", () => {
    const result = profileFormSchema.safeParse({ ...valid(), bio: "x".repeat(10_000) });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0]!.message).toMatch(/Keep this under/);
  });
});

describe("identity", () => {
  test("a person's tape and tilt depend only on their id", () => {
    expect(tapeFor(3)).toEqual(tapeFor(3));
    expect(tapeFor(-3)).toEqual(tapeFor(3));
    expect(tapeFor(0)).not.toEqual(tapeFor(1));
    expect(tiltFor(8)).toBe(tiltFor(13));
  });
});

describe("sections", () => {
  test("every field lives in exactly one section and has a label", () => {
    const fields = PROFILE_SECTIONS.flatMap((s) => s.fields);
    expect(new Set(fields).size).toBe(fields.length);
    for (const field of fields) expect(FIELD_LABELS[field]).toBeTruthy();
  });
});
