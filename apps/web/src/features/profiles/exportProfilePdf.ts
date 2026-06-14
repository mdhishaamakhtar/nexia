import type { jsPDF } from "jspdf";
import type { Profile } from "@/shared/types/profile";

type Pdf = jsPDF;
type Rgb = [number, number, number];

interface PdfContext {
  pdf: Pdf;
  pageWidth: number;
  pageHeight: number;
  marginX: number;
  topY: number;
  bottomY: number;
  y: number;
}

interface FieldItem {
  label: string;
  value: string;
}

interface SectionAccent {
  tape: Rgb;
  ink: Rgb;
  soft: Rgb;
}

const colors = {
  page: [255, 247, 237] as Rgb,
  paper: [255, 253, 248] as Rgb,
  rule: [232, 217, 196] as Rgb,
  border: [214, 198, 173] as Rgb,
  ink: [31, 41, 55] as Rgb,
  text: [55, 65, 81] as Rgb,
  muted: [120, 113, 108] as Rgb,
  peach: [253, 186, 116] as Rgb,
  peachInk: [124, 45, 18] as Rgb,
  peachSoft: [255, 237, 213] as Rgb,
  lavender: [196, 181, 253] as Rgb,
  lavenderInk: [76, 29, 149] as Rgb,
  lavenderSoft: [237, 233, 254] as Rgb,
  blue: [147, 197, 253] as Rgb,
  blueInk: [30, 64, 175] as Rgb,
  blueSoft: [219, 234, 254] as Rgb,
};

const sectionAccents: SectionAccent[] = [
  { tape: colors.lavender, ink: colors.lavenderInk, soft: colors.lavenderSoft },
  { tape: colors.peach, ink: colors.peachInk, soft: colors.peachSoft },
  { tape: colors.blue, ink: colors.blueInk, soft: colors.blueSoft },
  { tape: colors.lavender, ink: colors.lavenderInk, soft: colors.lavenderSoft },
];

// Single source of truth for vertical rhythm. Every block ends at its visual
// bottom (no trailing); gaps live BETWEEN blocks. Same model everywhere.
const space = {
  section: 48, // gap before any section heading (above the heading row)
  postTitle: 20, // gap from the heading baseline to the first block
  block: 24, // gap between sibling blocks within a section
  labelToBody: 16, // inside a labeled block, between label and its body
  fieldRow: 14, // between rows of the field grid
  songRow: 8, // between numbered song rows
  quoteItem: 12, // between consecutive quote bubbles
  pillRow: 22, // between wrapped pill rows (pill rect is 17pt)
  pillHeight: 17,
};

function compactStrings(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
}

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function formatDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (options) {
    return date.toLocaleDateString(undefined, options);
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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

function setFont(pdf: Pdf, size: number, style: "normal" | "bold" | "italic" = "normal") {
  pdf.setFont("Nunito", style);
  pdf.setFontSize(size);
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

async function registerNunito(pdf: Pdf) {
  const [regular, bold, italic] = await Promise.all([
    fetchFontBase64("/fonts/Nunito-Regular.ttf"),
    fetchFontBase64("/fonts/Nunito-Bold.ttf"),
    fetchFontBase64("/fonts/Nunito-Italic.ttf"),
  ]);
  pdf.addFileToVFS("Nunito-Regular.ttf", regular);
  pdf.addFont("Nunito-Regular.ttf", "Nunito", "normal");
  pdf.addFileToVFS("Nunito-Bold.ttf", bold);
  pdf.addFont("Nunito-Bold.ttf", "Nunito", "bold");
  pdf.addFileToVFS("Nunito-Italic.ttf", italic);
  pdf.addFont("Nunito-Italic.ttf", "Nunito", "italic");
}

function splitText(ctx: PdfContext, text: string, width: number, size: number) {
  setFont(ctx.pdf, size);
  return ctx.pdf.splitTextToSize(text, width) as string[];
}

function drawCornerTape(ctx: PdfContext) {
  const { pdf, pageWidth } = ctx;
  setFill(pdf, colors.peach);
  pdf.roundedRect(pageWidth - 104, 28, 46, 11, 3, 3, "F");
  setFill(pdf, colors.lavender);
  pdf.roundedRect(pageWidth - 70, 24, 32, 11, 3, 3, "F");
}

function drawPageBackground(ctx: PdfContext) {
  const { pdf, pageWidth, pageHeight } = ctx;
  setFill(pdf, colors.page);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  drawCornerTape(ctx);
}

function ensureSpace(ctx: PdfContext, neededHeight: number) {
  if (ctx.y + neededHeight <= ctx.bottomY) return;
  ctx.pdf.addPage();
  drawPageBackground(ctx);
  ctx.y = ctx.topY;
}

function drawLabel(
  ctx: PdfContext,
  label: string,
  x: number,
  y: number,
  color: Rgb = colors.muted
) {
  setText(ctx.pdf, color);
  setFont(ctx.pdf, 7.5, "bold");
  ctx.pdf.text(label.toUpperCase(), x, y);
}

// === BLOCK: field grid =====================================================

function measureField(ctx: PdfContext, field: FieldItem, width: number) {
  return 16 + splitText(ctx, field.value, width, 10).length * 13;
}

function drawFieldGrid(ctx: PdfContext, fields: FieldItem[]) {
  if (fields.length === 0) return;
  const gap = 26;
  const columnWidth = (ctx.pageWidth - ctx.marginX * 2 - gap) / 2;

  for (let i = 0; i < fields.length; i += 2) {
    if (i > 0) ctx.y += space.fieldRow;
    const row = fields.slice(i, i + 2);
    const rowHeight = Math.max(...row.map((f) => measureField(ctx, f, columnWidth)));
    ensureSpace(ctx, rowHeight);
    row.forEach((field, ri) => {
      const x = ctx.marginX + ri * (columnWidth + gap);
      drawLabel(ctx, field.label, x, ctx.y);
      const lines = splitText(ctx, field.value, columnWidth, 10);
      setText(ctx.pdf, colors.ink);
      setFont(ctx.pdf, 10, "bold");
      ctx.pdf.text(lines, x, ctx.y + 14);
    });
    ctx.y += rowHeight;
  }
}

// === BLOCK: pills (raw, full-width) ========================================

function measurePillRows(ctx: PdfContext, items: string[], width: number) {
  let currentX = 0;
  let rows = 1;
  setFont(ctx.pdf, 9, "normal");
  items.forEach((item) => {
    const pillWidth = Math.min(ctx.pdf.getTextWidth(item) + 22, width);
    if (currentX > 0 && currentX + pillWidth > width) {
      rows += 1;
      currentX = 0;
    }
    currentX += pillWidth + 6;
  });
  return rows;
}

function drawPills(ctx: PdfContext, items: string[], variant: "neutral" | "tag" = "neutral") {
  if (items.length === 0) return;
  const xStart = ctx.marginX;
  const maxWidth = ctx.pageWidth - ctx.marginX * 2;
  const rows = measurePillRows(ctx, items, maxWidth);
  const totalHeight = (rows - 1) * space.pillRow + space.pillHeight;
  ensureSpace(ctx, totalHeight);

  const palette =
    variant === "tag"
      ? { bg: colors.lavenderSoft, border: colors.lavender, ink: colors.lavenderInk }
      : { bg: colors.paper, border: colors.border, ink: colors.text };

  let x = xStart;
  let y = ctx.y;
  setFont(ctx.pdf, 9, "normal");

  items.forEach((item) => {
    const width = Math.min(ctx.pdf.getTextWidth(item) + 22, maxWidth);
    if (x > xStart && x + width > xStart + maxWidth) {
      x = xStart;
      y += space.pillRow;
    }
    setFill(ctx.pdf, palette.bg);
    setDraw(ctx.pdf, palette.border);
    ctx.pdf.setLineWidth(0.4);
    ctx.pdf.roundedRect(x, y, width, space.pillHeight, 8.5, 8.5, "FD");
    setText(ctx.pdf, palette.ink);
    setFont(ctx.pdf, 9, "normal");
    ctx.pdf.text(item, x + 11, y + 12);
    x += width + 6;
  });

  ctx.y = y + space.pillHeight;
}

// === BLOCK: labeled pill group =============================================

function drawLabeledPillGroup(
  ctx: PdfContext,
  label: string,
  items: string[],
  variant: "neutral" | "tag" = "neutral"
) {
  if (items.length === 0) return;
  drawLabel(ctx, label, ctx.marginX, ctx.y);
  ctx.y += space.labelToBody;
  drawPills(ctx, items, variant);
}

// === BLOCK: associated song card ===========================================

function drawSongCard(
  ctx: PdfContext,
  label: string,
  name?: string | null,
  artist?: string | null
) {
  if (!hasText(name) && !hasText(artist)) return;
  const hasName = hasText(name);
  const hasArtist = hasText(artist);

  const padLeft = 24;
  const padBottom = 20;
  const labelBaseline = 28;
  const nameBaseline = hasName ? 50 : 0;
  const artistBaseline = hasArtist ? (hasName ? 68 : 50) : 0;
  const lastBaseline = Math.max(labelBaseline, nameBaseline, artistBaseline);
  const height = lastBaseline + padBottom;

  ensureSpace(ctx, height);

  setFill(ctx.pdf, colors.paper);
  setDraw(ctx.pdf, colors.border);
  ctx.pdf.setLineWidth(0.5);
  ctx.pdf.roundedRect(ctx.marginX, ctx.y, ctx.pageWidth - ctx.marginX * 2, height, 14, 14, "FD");

  // Peach washi tape pasted on top edge of the card
  setFill(ctx.pdf, colors.peach);
  ctx.pdf.roundedRect(ctx.marginX + padLeft, ctx.y - 5, 60, 11, 3, 3, "F");

  drawLabel(ctx, label, ctx.marginX + padLeft, ctx.y + labelBaseline);
  if (hasName) {
    setText(ctx.pdf, colors.ink);
    setFont(ctx.pdf, 13, "bold");
    ctx.pdf.text(name!.trim(), ctx.marginX + padLeft, ctx.y + nameBaseline);
  }
  if (hasArtist) {
    setText(ctx.pdf, colors.muted);
    setFont(ctx.pdf, 10, "italic");
    ctx.pdf.text(artist!.trim(), ctx.marginX + padLeft, ctx.y + artistBaseline);
  }
  ctx.y += height;
}

// === BLOCK: numbered songs =================================================

function drawNumberedSongs(
  ctx: PdfContext,
  songs: Array<{ name?: string | null; artist?: string | null }>
) {
  if (songs.length === 0) return;
  drawLabel(ctx, "Top Songs", ctx.marginX, ctx.y);
  ctx.y += space.labelToBody;

  const badgeSize = 26;
  const textX = ctx.marginX + badgeSize + 14;
  const textWidth = ctx.pageWidth - textX - ctx.marginX;

  songs.forEach((song, index) => {
    if (index > 0) ctx.y += space.songRow;

    const nameLines = hasText(song.name) ? splitText(ctx, song.name!.trim(), textWidth, 10) : [];
    const artistLines = hasText(song.artist)
      ? splitText(ctx, song.artist!.trim(), textWidth, 9)
      : [];
    const contentHeight = nameLines.length * 13 + artistLines.length * 11;
    const rowHeight = Math.max(badgeSize + 4, contentHeight + 8);
    ensureSpace(ctx, rowHeight);

    const accent = sectionAccents[index % sectionAccents.length]!;
    setFill(ctx.pdf, accent.soft);
    setDraw(ctx.pdf, accent.tape);
    ctx.pdf.setLineWidth(0.4);
    ctx.pdf.roundedRect(ctx.marginX, ctx.y, badgeSize, badgeSize, 8, 8, "FD");
    setText(ctx.pdf, accent.ink);
    setFont(ctx.pdf, 11, "bold");
    const num = String(index + 1);
    const nw = ctx.pdf.getTextWidth(num);
    ctx.pdf.text(num, ctx.marginX + badgeSize / 2 - nw / 2, ctx.y + 18);

    let cursorY = ctx.y + 14;
    if (nameLines.length > 0) {
      setText(ctx.pdf, colors.ink);
      setFont(ctx.pdf, 10, "bold");
      ctx.pdf.text(nameLines, textX, cursorY);
      cursorY += nameLines.length * 13;
    }
    if (artistLines.length > 0) {
      setText(ctx.pdf, colors.muted);
      setFont(ctx.pdf, 9, "italic");
      ctx.pdf.text(artistLines, textX, cursorY);
    }
    ctx.y += rowHeight;
  });
}

// === BLOCK: quote bubble (used standalone and inside a quote list) =========

function drawQuoteBlock(
  ctx: PdfContext,
  value: string,
  options: { tone?: "soft" | "warm" | "cool"; label?: string } = {}
) {
  const tone = options.tone ?? "soft";
  const palette =
    tone === "warm"
      ? { bg: colors.peachSoft, border: colors.peach, ink: colors.peachInk, glyph: colors.peach }
      : tone === "cool"
        ? { bg: colors.blueSoft, border: colors.blue, ink: colors.blueInk, glyph: colors.blue }
        : { bg: colors.paper, border: colors.border, ink: colors.text, glyph: colors.lavender };

  const innerX = ctx.marginX + 44;
  const innerWidth = ctx.pageWidth - ctx.marginX * 2 - 62;
  const lines = splitText(ctx, value, innerWidth, 11);

  const padTop = 22;
  const padBottom = 22;
  const labelSpace = options.label ? 20 : 0;
  const textHeight = lines.length * 14;
  const height = padTop + labelSpace + textHeight + padBottom;

  ensureSpace(ctx, height);

  setFill(ctx.pdf, palette.bg);
  setDraw(ctx.pdf, palette.border);
  ctx.pdf.setLineWidth(0.5);
  ctx.pdf.roundedRect(ctx.marginX, ctx.y, ctx.pageWidth - ctx.marginX * 2, height, 14, 14, "FD");

  setText(ctx.pdf, palette.glyph);
  setFont(ctx.pdf, 36, "bold");
  ctx.pdf.text("“", ctx.marginX + 14, ctx.y + 40);

  let cursorY = ctx.y + padTop;
  if (options.label) {
    drawLabel(ctx, options.label, innerX, cursorY);
    cursorY += labelSpace;
  }

  setText(ctx.pdf, palette.ink);
  setFont(ctx.pdf, 11, "italic");
  ctx.pdf.text(lines, innerX, cursorY + 10);

  ctx.y += height;
}

// === BLOCK: labeled list of quote bubbles ==================================

function drawQuoteList(ctx: PdfContext, label: string, quotes: Array<{ quote: string }>) {
  if (quotes.length === 0) return;
  drawLabel(ctx, label, ctx.marginX, ctx.y);
  ctx.y += space.labelToBody;
  quotes.forEach((q, i) => {
    if (i > 0) ctx.y += space.quoteItem;
    drawQuoteBlock(ctx, q.quote.trim(), { tone: "soft" });
  });
}

// === BLOCK: labeled paragraph ==============================================

function drawParagraph(ctx: PdfContext, label: string, value: string) {
  if (!hasText(value)) return;
  const width = ctx.pageWidth - ctx.marginX * 2;
  const lines = splitText(ctx, value.trim(), width, 10.5);
  const height = space.labelToBody + lines.length * 14;
  ensureSpace(ctx, height);
  drawLabel(ctx, label, ctx.marginX, ctx.y);
  setText(ctx.pdf, colors.text);
  setFont(ctx.pdf, 10.5, "normal");
  ctx.pdf.text(lines, ctx.marginX, ctx.y + space.labelToBody);
  ctx.y += height;
}

// === Section heading + section orchestrator ================================

function drawSectionHeading(ctx: PdfContext, title: string, accent: SectionAccent) {
  setFill(ctx.pdf, accent.tape);
  ctx.pdf.roundedRect(ctx.marginX, ctx.y - 8, 26, 10, 3, 3, "F");
  setText(ctx.pdf, colors.ink);
  setFont(ctx.pdf, 14, "bold");
  ctx.pdf.text(title, ctx.marginX + 34, ctx.y + 2);
  const titleWidth = ctx.pdf.getTextWidth(title);
  setDraw(ctx.pdf, colors.rule);
  ctx.pdf.setLineWidth(0.6);
  const ruleStart = ctx.marginX + 34 + titleWidth + 14;
  const ruleEnd = ctx.pageWidth - ctx.marginX;
  if (ruleEnd > ruleStart) ctx.pdf.line(ruleStart, ctx.y, ruleEnd, ctx.y);
}

function renderSection(
  ctx: PdfContext,
  title: string,
  accent: SectionAccent,
  blocks: Array<(() => void) | null>,
  minimumFollowingHeight = 80
) {
  const present = blocks.filter((b): b is () => void => b !== null);
  if (present.length === 0) return;

  ensureSpace(ctx, 24 + space.postTitle + minimumFollowingHeight);
  if (ctx.y > ctx.topY) ctx.y += space.section;

  drawSectionHeading(ctx, title, accent);
  ctx.y += space.postTitle;

  present.forEach((block, i) => {
    if (i > 0) ctx.y += space.block;
    block();
  });
}

// === Hero block ============================================================

function drawHero(ctx: PdfContext, profile: Profile, birthdayShort: string | null) {
  const { pdf } = ctx;
  const avatarSize = 74;
  const x = ctx.marginX;

  setFill(pdf, colors.lavender);
  pdf.roundedRect(x, ctx.y, avatarSize, avatarSize, 18, 18, "F");
  setText(pdf, colors.lavenderInk);
  setFont(pdf, 36, "bold");
  const initial = profile.full_name?.charAt(0)?.toUpperCase() || "?";
  const initialWidth = pdf.getTextWidth(initial);
  pdf.text(initial, x + (avatarSize - initialWidth) / 2, ctx.y + 50);

  const contentX = x + avatarSize + 24;
  const contentWidth = ctx.pageWidth - contentX - ctx.marginX;
  drawLabel(ctx, "a nexia keepsake", contentX, ctx.y + 14);
  setText(pdf, colors.ink);
  setFont(pdf, 26, "bold");
  const nameLines = splitText(ctx, profile.full_name || "Profile", contentWidth, 26);
  pdf.text(nameLines, contentX, ctx.y + 40);

  const textBottom = ctx.y + 40 + (nameLines.length - 1) * 28;
  const heroBottom = Math.max(ctx.y + avatarSize, textBottom);
  ctx.y = heroBottom + 22;

  const meta = compactStrings([
    profile.pronouns,
    profile.relationship_type,
    birthdayShort,
    profile.zodiac_sign,
  ]);
  if (meta.length > 0) {
    drawPills(ctx, meta);
  }

  if (hasText(profile.bio)) {
    if (meta.length > 0) ctx.y += 14;
    drawQuoteBlock(ctx, profile.bio!.trim(), { tone: "soft" });
  }

  // Closing rule. ctx.y ends AT the rule; renderSection will add space.section
  // above the first section heading, giving a clean break.
  ctx.y += 18;
  setDraw(ctx.pdf, colors.rule);
  ctx.pdf.setLineWidth(0.5);
  ctx.pdf.line(ctx.marginX, ctx.y, ctx.pageWidth - ctx.marginX, ctx.y);
}

// === Helpers ===============================================================

function buildFields(items: Array<[string, string | null | undefined]>): FieldItem[] {
  return items
    .map(([label, value]) => ({ label, value: value?.trim() ?? "" }))
    .filter((field) => field.value.length > 0);
}

// === Entry point ===========================================================

export async function exportProfilePdf(profile: Profile) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
  await registerNunito(pdf);

  const ctx: PdfContext = {
    pdf,
    pageWidth: pdf.internal.pageSize.getWidth(),
    pageHeight: pdf.internal.pageSize.getHeight(),
    marginX: 48,
    topY: 60,
    bottomY: pdf.internal.pageSize.getHeight() - 48,
    y: 60,
  };

  drawPageBackground(ctx);

  const birthdayShort = formatDate(profile.birthday, { month: "long", day: "numeric" });
  const birthdayFull = formatDate(profile.birthday);
  const tags = compactStrings(profile.tags?.map((tag) => tag.tag) ?? []);
  const movieGenres = compactStrings(profile.movie_genres?.map((genre) => genre.genre) ?? []);
  const bookGenres = compactStrings(profile.book_genres?.map((genre) => genre.genre) ?? []);
  const hangoutPlaces = compactStrings(profile.hangout_places?.map((place) => place.place) ?? []);
  const foodRestrictions = compactStrings(
    profile.food_restrictions?.map((restriction) => restriction.restriction) ?? []
  );
  const politicalViews = compactStrings(profile.political_views?.map((view) => view.view) ?? []);
  const quotes = (profile.quotes ?? []).filter((quote) => hasText(quote.quote));
  const favoriteMemories = (profile.favorite_memories ?? [])
    .filter((m) => hasText(m.memory))
    .map((m) => ({ quote: m.memory }));
  const topSongs = (profile.top_songs ?? []).filter(
    (song) => hasText(song.name) || hasText(song.artist)
  );
  const associatedSong = profile.associated_song;
  const hasAssociatedSong = hasText(associatedSong?.name) || hasText(associatedSong?.artist);

  drawHero(ctx, profile, birthdayShort);

  const overviewFields = buildFields([
    ["Profession", profile.profession],
    ["Birthday", birthdayFull],
    ["Zodiac", profile.zodiac_sign],
  ]);

  renderSection(ctx, "Overview", sectionAccents[0]!, [
    overviewFields.length > 0 ? () => drawFieldGrid(ctx, overviewFields) : null,
    tags.length > 0
      ? () =>
          drawLabeledPillGroup(
            ctx,
            "Tags",
            tags.map((tag) => `#${tag}`),
            "tag"
          )
      : null,
  ]);

  const favoriteFields = buildFields([
    ["Favorite Movie", profile.favorite_movie],
    ["Favorite Book", profile.favorite_book],
    ["Music Preference", profile.music_preference],
  ]);

  renderSection(ctx, "Favorites & Interests", sectionAccents[1]!, [
    favoriteFields.length > 0 ? () => drawFieldGrid(ctx, favoriteFields) : null,
    hasAssociatedSong
      ? () => drawSongCard(ctx, "Associated Song", associatedSong?.name, associatedSong?.artist)
      : null,
    topSongs.length > 0 ? () => drawNumberedSongs(ctx, topSongs) : null,
    movieGenres.length > 0 ? () => drawLabeledPillGroup(ctx, "Movie Genres", movieGenres) : null,
    bookGenres.length > 0 ? () => drawLabeledPillGroup(ctx, "Book Genres", bookGenres) : null,
  ]);

  renderSection(ctx, "Lifestyle", sectionAccents[2]!, [
    hangoutPlaces.length > 0
      ? () => drawLabeledPillGroup(ctx, "Hangout Places", hangoutPlaces)
      : null,
    foodRestrictions.length > 0
      ? () => drawLabeledPillGroup(ctx, "Food Restrictions", foodRestrictions)
      : null,
    politicalViews.length > 0
      ? () => drawLabeledPillGroup(ctx, "Political Views", politicalViews)
      : null,
  ]);

  renderSection(ctx, "Deep Dive", sectionAccents[3]!, [
    hasText(profile.long_term_goals)
      ? () => drawParagraph(ctx, "Long-term Goals", profile.long_term_goals!)
      : null,
    favoriteMemories.length > 0
      ? () => drawQuoteList(ctx, "Favorite Memories", favoriteMemories)
      : null,
    hasText(profile.notes) ? () => drawParagraph(ctx, "Additional Notes", profile.notes!) : null,
    quotes.length > 0 ? () => drawQuoteList(ctx, "Their Quotes", quotes) : null,
  ]);

  pdf.save(`${safeFilename(profile.full_name)}-nexia-profile.pdf`);
}
