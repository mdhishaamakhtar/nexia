import type { ProfileOutput, Song } from "@nexia/shared";
import { BRAND, PERSON_PALETTE, type PersonColor } from "@nexia/shared/brand";
import type { jsPDF } from "jspdf";
import { markDataUrl } from "@/shared/brand/mark";
import { ageOn, formatDate } from "@/shared/lib/dates";
import { identityFor } from "./identity";
import { PROFILE_SECTIONS, type ProfileSectionId } from "./sections";
import { shapeSvg } from "./shapes";

/**
 * A profile as a PDF, laid out like the profile page: a block of the person's
 * colour with their shape, name and who they are, then one rounded panel per
 * kind of thing, in a tint of the same colour. Panels pair up side by side the
 * way they do on screen, and a field nobody filled in leaves no gap.
 *
 * Everything is measured before it is drawn. A panel is a list of rows, each
 * one line of text or one small block, so a panel that will not fit on what is
 * left of a page can be split between rows and carried on to the next.
 */

type Pdf = jsPDF;
type Rgb = [number, number, number];

/** One person colour in its four steps, as RGB. */
interface PersonRgb {
  mid: Rgb;
  soft: Rgb;
  tint: Rgb;
  ink: Rgb;
  /** The frosted white of a chip sitting on `soft`. */
  chip: Rgb;
}

interface Ctx {
  pdf: Pdf;
  /** Left edge and width of the content column. */
  x: number;
  width: number;
  top: number;
  bottom: number;
  y: number;
  /** The brand mark as a PNG data URL, for each page's footer. */
  mark: string;
  person: PersonRgb;
}

/** One line or one small block inside a panel. `y` is its top edge. */
interface Row {
  height: number;
  draw: (x: number, y: number, width: number) => void;
  /** Space or a rule between items: dropped at the top or bottom of a split. */
  spacer?: boolean;
}

interface Panel {
  title: string;
  /** How much of a row it wants, as on the page: 56 / 44 / 50 per cent. */
  share: number;
  /** Filled with the person's colour itself rather than its tint. */
  solid?: boolean;
  rows: (width: number) => Row[];
}

const WIDE = 0.56;
const NARROW = 0.44;
const HALF = 0.5;

const PAGE_MARGIN = 36;
const GAP = 10;
const PANEL_PAD = 18;
const PANEL_RADIUS = 18;
const TITLE_HEIGHT = 12;
const TITLE_GAP = 12;
const FOOTER_MARK = 14;

/** jsPDF takes colours as three numbers; the palette is written as hex. */
function rgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const colors = {
  ink: rgb(BRAND.ink),
  text: rgb(BRAND.ink2),
};

function personRgb(color: PersonColor): PersonRgb {
  const swatch = PERSON_PALETTE[color];
  const soft = rgb(swatch.soft);
  return {
    mid: rgb(swatch.base),
    soft,
    tint: rgb(swatch.tint),
    ink: rgb(swatch.ink),
    // `.chip-on-color` is white at 72% over the card colour.
    chip: soft.map((channel) => Math.round(255 * 0.72 + channel * 0.28)) as Rgb,
  };
}

function hasText(value?: string | null): value is string {
  return Boolean(value?.trim());
}

function safeFilename(value: string) {
  const normalized = value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return normalized || "profile";
}

function setFill(pdf: Pdf, color: Rgb) {
  pdf.setFillColor(color[0], color[1], color[2]);
}

function setDraw(pdf: Pdf, color: Rgb) {
  pdf.setDrawColor(color[0], color[1], color[2]);
}

function setText(pdf: Pdf, color: Rgb) {
  pdf.setTextColor(color[0], color[1], color[2]);
}

function setFont(pdf: Pdf, size: number, style: "normal" | "bold" = "normal") {
  pdf.setFont("Alan Sans", style);
  pdf.setFontSize(size);
}

function wrap(pdf: Pdf, text: string, width: number, size: number, style?: "normal" | "bold") {
  setFont(pdf, size, style);
  return pdf.splitTextToSize(text, width) as string[];
}

async function fetchFontBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load font: ${url}`);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const comma = dataUrl.indexOf(",");
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Font read failed"));
    reader.readAsDataURL(blob);
  });
}

/** The app's typeface, as the two static weights vendored in /fonts. */
async function registerAlanSans(pdf: Pdf) {
  const [regular, bold] = await Promise.all([
    fetchFontBase64("/fonts/AlanSans-Regular.ttf"),
    fetchFontBase64("/fonts/AlanSans-Bold.ttf"),
  ]);
  pdf.addFileToVFS("AlanSans-Regular.ttf", regular);
  pdf.addFont("AlanSans-Regular.ttf", "Alan Sans", "normal");
  pdf.addFileToVFS("AlanSans-Bold.ttf", bold);
  pdf.addFont("AlanSans-Bold.ttf", "Alan Sans", "bold");
}

/**
 * An SVG as a PNG: jsPDF cannot place an SVG, so the browser draws it onto a
 * canvas first, at 4× the printed size so it stays sharp when zoomed.
 */
async function rasterize(svgDataUrl: string, sizePt: number): Promise<string> {
  const px = sizePt * 4;
  const image = new Image();
  image.src = svgDataUrl;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  canvas.getContext("2d")?.drawImage(image, 0, 0, px, px);
  return canvas.toDataURL("image/png");
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// === Page ==================================================================

function drawFooter(ctx: Ctx) {
  const { pdf } = ctx;
  const top = ctx.bottom + 14;
  pdf.addImage(ctx.mark, "PNG", ctx.x, top, FOOTER_MARK, FOOTER_MARK);
  setFont(pdf, 9, "bold");
  setText(pdf, colors.ink);
  pdf.text("Nexia", ctx.x + FOOTER_MARK + 6, top + 10.5);
}

function newPage(ctx: Ctx) {
  ctx.pdf.addPage();
  drawFooter(ctx);
  ctx.y = ctx.top;
}

// === Rows ==================================================================

const gap = (height: number): Row => ({ height, spacer: true, draw: () => {} });

/** A hairline in the person's colour between two items in a panel. */
function rule(ctx: Ctx): Row {
  return {
    height: 13,
    spacer: true,
    draw: (x, y, width) => {
      setDraw(ctx.pdf, ctx.person.soft);
      ctx.pdf.setLineWidth(0.9);
      ctx.pdf.line(x, y + 6.5, x + width, y + 6.5);
    },
  };
}

/** Wrapped text, one row per line, so a long passage can break across pages. */
function textRows(
  ctx: Ctx,
  text: string,
  width: number,
  opts: { size: number; leading: number; style?: "normal" | "bold"; color: Rgb; indent?: number }
): Row[] {
  const indent = opts.indent ?? 0;
  return text
    .trim()
    .split("\n")
    .flatMap((paragraph) => wrap(ctx.pdf, paragraph || " ", width - indent, opts.size, opts.style))
    .map((line) => ({
      height: opts.leading,
      draw: (x: number, y: number) => {
        setFont(ctx.pdf, opts.size, opts.style);
        setText(ctx.pdf, opts.color);
        ctx.pdf.text(line, x + indent, y + opts.leading / 2 + opts.size * 0.34);
      },
    }));
}

/** Something they said, as a speech bubble in their colour. */
function bubbleRow(ctx: Ctx, quote: string, width: number): Row {
  const padX = 13;
  const padY = 9;
  const leading = 15;
  const lines = wrap(ctx.pdf, quote.trim(), width - padX * 2, 11.5, "bold");
  const textWidth = Math.max(...lines.map((line) => ctx.pdf.getTextWidth(line)));
  const height = lines.length * leading + padY * 2;
  return {
    height,
    draw: (x, y) => {
      const { pdf } = ctx;
      const bubbleWidth = Math.min(width, textWidth + padX * 2);
      setFill(pdf, ctx.person.soft);
      pdf.roundedRect(x, y, bubbleWidth, height, 12, 12, "F");
      // The bottom-left corner is squared off, as a speech bubble's is.
      pdf.rect(x, y + height - 12, 12, 12, "F");
      pdf.roundedRect(x, y + height - 8, 8, 8, 3, 3, "F");
      setFont(pdf, 11.5, "bold");
      setText(pdf, ctx.person.ink);
      lines.forEach((line, i) => pdf.text(line, x + padX, y + padY + i * leading + 11));
    },
  };
}

/** A label on the left and what you know on the right, as on the page. */
function factRows(ctx: Ctx, label: string, value: string, width: number): Row[] {
  const stacked = width < 250;
  const labelWidth = stacked ? width : 104;
  const valueX = stacked ? 0 : labelWidth + 10;
  const lines = wrap(ctx.pdf, value, width - valueX, 10.5, "bold");
  const leading = 14.5;
  const rows: Row[] = [];
  if (stacked) {
    rows.push({
      height: 13,
      draw: (x, y) => {
        setFont(ctx.pdf, 9.5);
        setText(ctx.pdf, colors.text);
        ctx.pdf.text(label, x, y + 9.5);
      },
    });
  }
  lines.forEach((line, i) =>
    rows.push({
      height: leading,
      draw: (x, y) => {
        if (!stacked && i === 0) {
          setFont(ctx.pdf, 9.5);
          setText(ctx.pdf, colors.text);
          ctx.pdf.text(label, x, y + 10.5);
        }
        setFont(ctx.pdf, 10.5, "bold");
        setText(ctx.pdf, colors.ink);
        ctx.pdf.text(line, x + valueX, y + 10.5);
      },
    })
  );
  return rows;
}

function factsPanel(ctx: Ctx, facts: Array<[string, string]>) {
  return (width: number): Row[] =>
    facts.flatMap(([label, value], i) => [
      ...(i > 0 ? [rule(ctx)] : []),
      ...factRows(ctx, label, value, width),
    ]);
}

/** A ranked song: its number in a dot of their colour, then title and artist. */
function songRow(ctx: Ctx, song: Song, rank: number, width: number): Row {
  const name = wrap(ctx.pdf, song.name, width - 30, 10.5, "bold")[0] ?? "";
  const artist = song.artist ? (wrap(ctx.pdf, song.artist, width - 30, 9.5)[0] ?? "") : "";
  const height = artist ? 28 : 20;
  return {
    height,
    draw: (x, y) => {
      const { pdf } = ctx;
      const cy = y + height / 2;
      setFill(pdf, ctx.person.mid);
      pdf.circle(x + 9, cy, 9, "F");
      setFont(pdf, 9, "bold");
      setText(pdf, ctx.person.ink);
      const digit = String(rank);
      pdf.text(digit, x + 9 - pdf.getTextWidth(digit) / 2, cy + 3.1);
      setFont(pdf, 10.5, "bold");
      setText(pdf, colors.ink);
      pdf.text(name, x + 30, artist ? y + 11.5 : cy + 3.6);
      if (artist) {
        setFont(pdf, 9.5);
        setText(pdf, colors.text);
        pdf.text(artist, x + 30, y + 23.5);
      }
    },
  };
}

// === Panels ================================================================

function contentHeight(rows: Row[]): number {
  return rows.reduce((sum, row) => sum + row.height, 0);
}

function panelHeight(rows: Row[]): number {
  return PANEL_PAD + TITLE_HEIGHT + TITLE_GAP + contentHeight(rows) + PANEL_PAD;
}

function drawPanel(
  ctx: Ctx,
  panel: Panel,
  title: string,
  rows: Row[],
  x: number,
  y: number,
  width: number,
  height: number
) {
  const { pdf } = ctx;
  setFill(pdf, panel.solid ? ctx.person.mid : ctx.person.tint);
  pdf.roundedRect(x, y, width, height, PANEL_RADIUS, PANEL_RADIUS, "F");
  setFont(pdf, 9.5, "bold");
  setText(pdf, ctx.person.ink);
  pdf.text(title, x + PANEL_PAD, y + PANEL_PAD + 9);

  // A solid block sets its words on its bottom edge, as their song does on
  // the page, when a taller neighbour has stretched it.
  const rowsTop = y + PANEL_PAD + TITLE_HEIGHT + TITLE_GAP;
  let rowY = panel.solid
    ? Math.max(rowsTop, y + height - PANEL_PAD - contentHeight(rows))
    : rowsTop;
  for (const row of rows) {
    row.draw(x + PANEL_PAD, rowY, width - PANEL_PAD * 2);
    rowY += row.height;
  }
}

/** One panel across the full width, carried over pages if it has to be. */
function drawSplittable(ctx: Ctx, panel: Panel) {
  let rows = panel.rows(ctx.width - PANEL_PAD * 2);
  let title = panel.title;
  const chrome = panelHeight([]);

  while (rows.length > 0) {
    const available = ctx.bottom - ctx.y - chrome;
    let taken = 0;
    let used = 0;
    while (taken < rows.length && used + rows[taken]!.height <= available) {
      used += rows[taken]!.height;
      taken += 1;
    }
    // Too little room to be worth starting here: begin on a fresh page. A row
    // taller than a whole page is drawn anyway rather than looping forever.
    if (taken === 0 || (taken < rows.length && used < 40)) {
      if (ctx.y > ctx.top) {
        newPage(ctx);
        continue;
      }
      taken = Math.max(taken, 1);
    }
    const segment = rows.slice(0, taken);
    while (segment.at(-1)?.spacer) segment.pop();
    const height = panelHeight(segment);
    drawPanel(ctx, panel, title, segment, ctx.x, ctx.y, ctx.width, height);
    ctx.y += height + GAP;

    rows = rows.slice(taken);
    while (rows[0]?.spacer) rows = rows.slice(1);
    if (rows.length > 0) {
      title = `${panel.title} (continued)`;
      newPage(ctx);
    }
  }
}

/**
 * Lays panels out in rows the way the page does: two that fit side by side
 * share a row at one height, and a panel on its own takes the whole width.
 */
function drawPanels(ctx: Ctx, panels: Panel[]) {
  const pageHeight = ctx.bottom - ctx.top;
  let i = 0;
  while (i < panels.length) {
    const a = panels[i]!;
    const b = panels[i + 1];
    if (b && a.share + b.share <= 1.001) {
      const usable = ctx.width - GAP;
      const widthA = (usable * a.share) / (a.share + b.share);
      const widthB = usable - widthA;
      const rowsA = a.rows(widthA - PANEL_PAD * 2);
      const rowsB = b.rows(widthB - PANEL_PAD * 2);
      const height = Math.max(panelHeight(rowsA), panelHeight(rowsB));
      if (height <= pageHeight) {
        if (ctx.y + height > ctx.bottom) newPage(ctx);
        drawPanel(ctx, a, a.title, rowsA, ctx.x, ctx.y, widthA, height);
        drawPanel(ctx, b, b.title, rowsB, ctx.x + widthA + GAP, ctx.y, widthB, height);
        ctx.y += height + GAP;
        i += 2;
        continue;
      }
    }
    drawSplittable(ctx, a);
    i += 1;
  }
}

// === Header ================================================================

interface Pill {
  text: string;
  width: number;
}

const PILL_HEIGHT = 19;
const PILL_GAP = 5;

/** Tags as rows of pills, each cut short only if it is wider than the block. */
function pillRows(ctx: Ctx, items: string[], width: number): Pill[][] {
  const rows: Pill[][] = [[]];
  let x = 0;
  for (const item of items) {
    const text = wrap(ctx.pdf, item, width - 22, 9.5, "bold")[0] ?? "";
    const pillWidth = ctx.pdf.getTextWidth(text) + 22;
    if (x > 0 && x + pillWidth > width) {
      rows.push([]);
      x = 0;
    }
    rows.at(-1)!.push({ text, width: pillWidth });
    x += pillWidth + PILL_GAP;
  }
  return rows;
}

function drawPillRows(ctx: Ctx, rows: Pill[][], x: number, y: number) {
  const { pdf } = ctx;
  rows.forEach((row, r) => {
    let pillX = x;
    const pillY = y + r * (PILL_HEIGHT + PILL_GAP);
    for (const pill of row) {
      setFill(pdf, ctx.person.chip);
      pdf.roundedRect(pillX, pillY, pill.width, PILL_HEIGHT, 9.5, 9.5, "F");
      setFont(pdf, 9.5, "bold");
      setText(pdf, ctx.person.ink);
      pdf.text(pill.text, pillX + 11, pillY + 12.8);
      pillX += pill.width + PILL_GAP;
    }
  });
}

/** How much of a long bio or tag list the header holds before it gets a panel. */
const HEADER_BIO_LINES = 10;
const HEADER_TAG_ROWS = 3;

/**
 * The block of the person's colour that opens the page: their shape and
 * initial, name, who they are to you, then the bio and tags. Returns what was
 * too long to fit, for a panel of its own.
 */
function drawHeader(
  ctx: Ctx,
  profile: ProfileOutput,
  avatar: string
): { bio: boolean; tags: boolean } {
  const { pdf } = ctx;
  const pad = 26;
  const avatarSize = 66;
  const inner = ctx.width - pad * 2;
  const textX = ctx.x + pad + avatarSize + 18;
  const textWidth = inner - avatarSize - 18;

  const nameLines = wrap(pdf, profile.full_name || "Profile", textWidth, 28, "bold");
  const who = [profile.relationship_type, profile.pronouns, profile.profession]
    .filter(hasText)
    .join("  ·  ");
  const age = ageOn(profile.birthday);
  const born = profile.birthday
    ? [
        `Born ${formatDate(profile.birthday, "long")}`,
        age !== null ? `${age} years old` : null,
        profile.zodiac_sign,
      ]
        .filter(hasText)
        .join("  ·  ")
    : "";
  const metaLines = [who, born].filter(hasText).flatMap((line) => wrap(pdf, line, textWidth, 11));
  const textHeight = nameLines.length * 31 + (metaLines.length ? 5 + metaLines.length * 15.5 : 0);
  const topHeight = Math.max(avatarSize, textHeight);

  const bioLines = hasText(profile.bio) ? wrap(pdf, profile.bio.trim(), inner, 12) : [];
  const bioInHeader = bioLines.length > 0 && bioLines.length <= HEADER_BIO_LINES;
  const tagRows = profile.tags.length ? pillRows(ctx, profile.tags, inner) : [];
  const tagsInHeader = tagRows.length > 0 && tagRows.length <= HEADER_TAG_ROWS;
  const tagsHeight = tagRows.length * (PILL_HEIGHT + PILL_GAP) - PILL_GAP;

  const height =
    pad +
    topHeight +
    (bioInHeader ? 18 + bioLines.length * 17.5 : 0) +
    (tagsInHeader ? 16 + tagsHeight : 0) +
    pad;

  setFill(pdf, ctx.person.soft);
  pdf.roundedRect(ctx.x, ctx.y, ctx.width, height, 24, 24, "F");

  // The shape, then the initial on top of it in the same ink the page uses.
  const top = ctx.y + pad + (topHeight - avatarSize) / 2;
  pdf.addImage(avatar, "PNG", ctx.x + pad, top, avatarSize, avatarSize);
  const initial = profile.full_name.trim().charAt(0).toUpperCase() || "?";
  setFont(pdf, 30, "bold");
  setText(pdf, ctx.person.ink);
  pdf.text(initial, ctx.x + pad + (avatarSize - pdf.getTextWidth(initial)) / 2, top + 43.5);

  let y = ctx.y + pad + (topHeight - textHeight) / 2;
  setFont(pdf, 28, "bold");
  nameLines.forEach((line, i) => pdf.text(line, textX, y + 25 + i * 31));
  y += nameLines.length * 31 + 5;
  setFont(pdf, 11);
  metaLines.forEach((line, i) => pdf.text(line, textX, y + 11 + i * 15.5));

  y = ctx.y + pad + topHeight;
  if (bioInHeader) {
    y += 18;
    setFont(pdf, 12);
    bioLines.forEach((line, i) => pdf.text(line, ctx.x + pad, y + 12 + i * 17.5));
    y += bioLines.length * 17.5;
  }
  if (tagsInHeader) {
    y += 16;
    drawPillRows(ctx, tagRows, ctx.x + pad, y);
  }

  ctx.y += height + GAP;
  return {
    bio: bioLines.length > 0 && !bioInHeader,
    tags: tagRows.length > 0 && !tagsInHeader,
  };
}

// === Entry point ===========================================================

export async function exportProfilePdf(profile: ProfileOutput) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
  const identity = identityFor(profile.id);
  const swatch = PERSON_PALETTE[identity.color];
  const [mark, avatar] = await Promise.all([
    rasterize(markDataUrl({ size: FOOTER_MARK * 4 }), FOOTER_MARK),
    rasterize(svgDataUrl(shapeSvg(identity.shape, swatch.base, 264)), 66),
    registerAlanSans(pdf),
  ]);

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ctx: Ctx = {
    pdf,
    x: PAGE_MARGIN,
    width: pageWidth - PAGE_MARGIN * 2,
    top: PAGE_MARGIN,
    bottom: pageHeight - 52,
    y: PAGE_MARGIN,
    mark,
    person: personRgb(identity.color),
  };

  drawFooter(ctx);
  const overflow = drawHeader(ctx, profile, avatar);

  const body = (size: number, leading: number, style?: "normal" | "bold") => ({
    size,
    leading,
    style,
    color: colors.ink,
  });
  const list = (items: string[]) => items.join(", ");
  const song = profile.associated_song?.name ? profile.associated_song : null;

  const favorites: Array<[string, string]> = [];
  if (hasText(profile.favorite_movie)) favorites.push(["Favorite movie", profile.favorite_movie]);
  if (hasText(profile.favorite_book)) favorites.push(["Favorite book", profile.favorite_book]);
  if (profile.movie_genres.length) favorites.push(["Movie genres", list(profile.movie_genres)]);
  if (profile.book_genres.length) favorites.push(["Book genres", list(profile.book_genres)]);

  const dayToDay: Array<[string, string]> = [];
  if (profile.hangout_places.length) dayToDay.push(["Find them at", list(profile.hangout_places)]);
  if (profile.food_restrictions.length)
    dayToDay.push(["Doesn't eat", list(profile.food_restrictions)]);
  if (profile.political_views.length) dayToDay.push(["Politics", list(profile.political_views)]);

  // A bio or tag list too long for the header spills into panels of its own.
  const panels: Panel[] = [];
  if (overflow.bio)
    panels.push({
      title: "About",
      share: 1,
      rows: (width) => textRows(ctx, profile.bio, width, body(11, 16)),
    });
  if (overflow.tags)
    panels.push({
      title: "Tags",
      share: 1,
      rows: (width) =>
        pillRows(ctx, profile.tags, width).map((row) => ({
          height: PILL_HEIGHT + PILL_GAP,
          draw: (x: number, y: number) => drawPillRows(ctx, [row], x, y),
        })),
    });
  // What each section draws, or null when it has nothing to show. Titles and
  // order come from `PROFILE_SECTIONS`, the same list the page and form follow.
  const sections: Record<ProfileSectionId, Omit<Panel, "title"> | null> = {
    song: song && {
      share: NARROW,
      solid: true,
      rows: (width) => [
        gap(16),
        ...textRows(ctx, song.name, width, {
          size: 22,
          leading: 25,
          style: "bold",
          color: ctx.person.ink,
        }),
        ...(song.artist
          ? [
              gap(3),
              ...textRows(ctx, song.artist, width, {
                size: 11,
                leading: 15,
                color: ctx.person.ink,
              }),
            ]
          : []),
      ],
    },
    repeat:
      profile.top_songs.length || hasText(profile.music_preference)
        ? {
            share: WIDE,
            rows: (width) => [
              ...profile.top_songs.flatMap((item, i) => [
                ...(i > 0 ? [rule(ctx)] : []),
                songRow(ctx, item, i + 1, width),
              ]),
              ...(hasText(profile.music_preference)
                ? [
                    ...(profile.top_songs.length ? [rule(ctx)] : []),
                    ...factsPanel(ctx, [["Listens to", profile.music_preference]])(width),
                  ]
                : []),
            ],
          }
        : null,
    favorites: favorites.length ? { share: WIDE, rows: factsPanel(ctx, favorites) } : null,
    day: dayToDay.length ? { share: NARROW, rows: factsPanel(ctx, dayToDay) } : null,
    words: profile.quotes.length
      ? {
          share: HALF,
          rows: (width) =>
            profile.quotes.flatMap((quote, i) => [
              ...(i > 0 ? [gap(7)] : []),
              bubbleRow(ctx, quote, width),
            ]),
        }
      : null,
    memories: profile.favorite_memories.length
      ? {
          share: HALF,
          rows: (width) =>
            profile.favorite_memories.flatMap((memory, i) => [
              ...(i > 0 ? [rule(ctx)] : []),
              ...textRows(ctx, memory, width, body(10.5, 15.5)),
            ]),
        }
      : null,
    dreams: hasText(profile.long_term_goals)
      ? {
          share: WIDE,
          rows: (width) => textRows(ctx, profile.long_term_goals, width, body(13, 18, "bold")),
        }
      : null,
    notes: hasText(profile.notes)
      ? {
          share: NARROW,
          rows: (width) => textRows(ctx, profile.notes, width, body(10.5, 15.5)),
        }
      : null,
  };
  for (const section of PROFILE_SECTIONS) {
    const panel = sections[section.id];
    if (panel) panels.push({ title: section.title, ...panel });
  }

  if (panels.length === 0) {
    panels.push({
      title: "Nothing else written down yet",
      share: 1,
      rows: (width) =>
        textRows(ctx, "Edit the profile to add what you know about them.", width, {
          size: 10.5,
          leading: 15.5,
          color: colors.text,
        }),
    });
  }

  drawPanels(ctx, panels);
  pdf.save(`${safeFilename(profile.full_name)}-nexia-profile.pdf`);
}
