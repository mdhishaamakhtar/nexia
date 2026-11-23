import { describe, expect, test } from "vitest";
import { makeFullProfile } from "@test/fixtures";
import { profileFormSchema, toFormValues, toProfilePayload, withItem } from "./form";
import { PERSON_COLORS } from "@nexia/shared/brand";
import { identityFor, PERSON_SHAPES } from "./identity";
import { SHAPE_PARTS, shapeSvg } from "./shapes";
import { FIELD_LABELS, HEADER_FIELDS, PROFILE_SECTIONS } from "./sections";

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
  test("a person's colour and shape depend only on their id", () => {
    expect(identityFor(3)).toEqual(identityFor(3));
    expect(identityFor(-3)).toEqual(identityFor(3));
    expect(identityFor(10)).toEqual({ color: "lilac", shape: "flower", className: "person-lilac" });
  });

  test("an id that isn't a number still gets a colour and a shape", () => {
    expect(identityFor(Number.NaN)).toEqual(identityFor(0));
    expect(identityFor(Number.POSITIVE_INFINITY)).toEqual(identityFor(0));
    expect(identityFor(2.9)).toEqual(identityFor(2));
  });

  test("two people added one after the other share neither colour nor shape", () => {
    for (let id = 0; id < 60; id++) {
      const a = identityFor(id);
      const b = identityFor(id + 1);
      expect(a.color).not.toBe(b.color);
      expect(a.shape).not.toBe(b.shape);
    }
  });

  test("the pairing only repeats after every colour has met every shape", () => {
    const pairs = new Set(
      Array.from({ length: 42 }, (_, id) => `${identityFor(id).color}/${identityFor(id).shape}`)
    );
    expect(pairs.size).toBe(PERSON_COLORS.length * PERSON_SHAPES.length);
    expect(identityFor(42)).toEqual(identityFor(0));
  });
});

describe("shapes", () => {
  test("every shape is drawn, and as an image it is one colour on a 100-unit grid", () => {
    for (const shape of PERSON_SHAPES) {
      expect(SHAPE_PARTS[shape].length).toBeGreaterThan(0);
      const svg = shapeSvg(shape, "#a58cf5");
      expect(svg).toContain('viewBox="0 0 100 100"');
      expect(svg).toContain('<g fill="#a58cf5">');
    }
  });

  test("the diamond is a turned square, and the hexagon's corners are rounded by its stroke", () => {
    expect(shapeSvg("diamond", "#000")).toContain('transform="rotate(45 50 50)"');
    expect(shapeSvg("hexagon", "#ff7fae")).toContain('stroke="#ff7fae" stroke-width="10"');
    expect(shapeSvg("circle", "#000", 64)).toContain('width="64" height="64"');
  });
});

describe("sections", () => {
  test("every field has one home: the header or exactly one section", () => {
    const fields: string[] = [...HEADER_FIELDS, ...PROFILE_SECTIONS.flatMap((s) => s.fields)];
    expect(new Set(fields).size).toBe(fields.length);
    // FIELD_LABELS is typed against every field key, so its keys are all of them.
    expect([...fields].sort()).toEqual(Object.keys(FIELD_LABELS).sort());
  });

  test("the facts come first and the long reads last", () => {
    expect(PROFILE_SECTIONS.map((s) => s.title)).toEqual([
      "Their song",
      "On repeat",
      "Favorites",
      "Day to day",
      "In their words",
      "Memories together",
      "Dreams of",
      "Notes",
    ]);
  });
});
