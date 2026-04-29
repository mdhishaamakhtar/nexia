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

const colors = {
  page: [255, 247, 237] as Rgb,
  paper: [255, 252, 247] as Rgb,
  fill: [255, 241, 224] as Rgb,
  fillSoft: [255, 250, 244] as Rgb,
  ink: [31, 41, 55] as Rgb,
  text: [55, 65, 81] as Rgb,
  muted: [107, 114, 128] as Rgb,
  line: [236, 221, 203] as Rgb,
  peach: [253, 186, 116] as Rgb,
  lavender: [196, 181, 253] as Rgb,
  blue: [147, 197, 253] as Rgb,
  purple: [91, 33, 182] as Rgb,
};

const sectionAccents: Rgb[] = [colors.lavender, colors.peach, colors.blue, colors.lavender];

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
  return date.toLocaleDateString(undefined, options);
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
  pdf.setFont("helvetica", style);
  pdf.setFontSize(size);
}

function splitText(ctx: PdfContext, text: string, width: number, size: number) {
  setFont(ctx.pdf, size);
  return ctx.pdf.splitTextToSize(text, width) as string[];
}

function drawPageBackground(ctx: PdfContext) {
  const { pdf, pageWidth, pageHeight } = ctx;

  setFill(pdf, colors.page);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  setDraw(pdf, colors.line);
  pdf.setLineWidth(0.25);

  for (let x = 0; x <= pageWidth; x += 18) {
    pdf.line(x, 0, x, pageHeight);
  }

  for (let y = 0; y <= pageHeight; y += 18) {
    pdf.line(0, y, pageWidth, y);
  }
}

function ensureSpace(ctx: PdfContext, neededHeight: number) {
  if (ctx.y + neededHeight <= ctx.bottomY) return;

  ctx.pdf.addPage();
  drawPageBackground(ctx);
  ctx.y = ctx.topY;
}

function drawWashi(ctx: PdfContext, x: number, y: number, width: number, color: Rgb) {
  const { pdf } = ctx;
  setFill(pdf, color);
  pdf.roundedRect(x, y, width, 12, 4, 4, "F");
}

function drawLabel(ctx: PdfContext, label: string, x: number, y: number) {
  const { pdf } = ctx;
  setText(pdf, colors.muted);
  setFont(pdf, 7, "bold");
  pdf.text(label.toUpperCase(), x, y);
}

function drawValue(ctx: PdfContext, value: string, x: number, y: number, width: number) {
  const { pdf } = ctx;
  const lines = splitText(ctx, value, width, 9.5);
  setText(pdf, colors.ink);
  setFont(pdf, 9.5, "bold");
  pdf.text(lines, x, y);
  return lines.length * 12;
}

function measureField(ctx: PdfContext, field: FieldItem, width: number) {
  return 14 + splitText(ctx, field.value, width, 9.5).length * 12;
}

function drawFieldGrid(ctx: PdfContext, fields: FieldItem[]) {
  if (fields.length === 0) return;

  const gap = 20;
  const columnWidth = (ctx.pageWidth - ctx.marginX * 2 - gap) / 2;

  for (let index = 0; index < fields.length; index += 2) {
    const row = fields.slice(index, index + 2);
    const rowHeight = Math.max(...row.map((field) => measureField(ctx, field, columnWidth)));
    ensureSpace(ctx, rowHeight + 10);

    row.forEach((field, rowIndex) => {
      const x = ctx.marginX + rowIndex * (columnWidth + gap);
      drawLabel(ctx, field.label, x, ctx.y);
      drawValue(ctx, field.value, x, ctx.y + 13, columnWidth);
    });

    ctx.y += rowHeight + 10;
  }
}

function measurePills(ctx: PdfContext, items: string[], width: number) {
  const lineHeight = 18;
  let currentX = 0;
  let rows = 1;

  setFont(ctx.pdf, 8.5, "bold");

  items.forEach((item) => {
    const pillWidth = Math.min(ctx.pdf.getTextWidth(item) + 18, width);
    if (currentX > 0 && currentX + pillWidth > width) {
      rows += 1;
      currentX = 0;
    }
    currentX += pillWidth + 6;
  });

  return rows * lineHeight;
}

function drawPills(ctx: PdfContext, items: string[]) {
  if (items.length === 0) return;

  const xStart = ctx.marginX;
  const maxWidth = ctx.pageWidth - ctx.marginX * 2;
  const height = measurePills(ctx, items, maxWidth);
  ensureSpace(ctx, height + 8);

  let x = xStart;
  let y = ctx.y;

  setFont(ctx.pdf, 8.5, "bold");

  items.forEach((item) => {
    const width = Math.min(ctx.pdf.getTextWidth(item) + 18, maxWidth);
    if (x > xStart && x + width > xStart + maxWidth) {
      x = xStart;
      y += 18;
    }

    setFill(ctx.pdf, colors.fillSoft);
    ctx.pdf.roundedRect(x, y - 10, width, 14, 7, 7, "F");
    setText(ctx.pdf, colors.muted);
    setFont(ctx.pdf, 8.5, "bold");
    ctx.pdf.text(item, x + 9, y);
    x += width + 6;
  });

  ctx.y += height + 8;
}

function drawSectionTitle(
  ctx: PdfContext,
  title: string,
  accent: Rgb,
  minimumFollowingHeight = 64
) {
  ensureSpace(ctx, 34 + minimumFollowingHeight);
  drawWashi(ctx, ctx.marginX + 18, ctx.y - 9, 52, accent);
  drawLabel(ctx, title, ctx.marginX, ctx.y + 18);
  ctx.y += 34;
}

function drawSoftBox(ctx: PdfContext, height: number, accent?: Rgb) {
  const width = ctx.pageWidth - ctx.marginX * 2;
  ensureSpace(ctx, height);

  setFill(ctx.pdf, accent ?? colors.paper);
  ctx.pdf.roundedRect(ctx.marginX, ctx.y, width, height - 8, 14, 14, "F");
  return { x: ctx.marginX + 16, y: ctx.y + 20, width: width - 32 };
}

function drawParagraphBox(
  ctx: PdfContext,
  label: string,
  value: string,
  options: { italic?: boolean; accent?: Rgb } = {}
) {
  if (!hasText(value)) return;

  const width = ctx.pageWidth - ctx.marginX * 2 - 32;
  const lines = splitText(ctx, value.trim(), width, 10.5);
  const height = 44 + lines.length * 14;
  const box = drawSoftBox(ctx, height, options.accent);

  drawLabel(ctx, label, box.x, box.y - 3);
  setText(ctx.pdf, colors.ink);
  setFont(ctx.pdf, 10.5, options.italic ? "italic" : "normal");
  ctx.pdf.text(lines, box.x, box.y + 15);
  ctx.y += height + 6;
}

function drawSongBox(ctx: PdfContext, label: string, name?: string | null, artist?: string | null) {
  if (!hasText(name) && !hasText(artist)) return;

  const lines = compactStrings([name, artist]);
  const height = 42 + lines.length * 13;
  const box = drawSoftBox(ctx, height);

  drawLabel(ctx, label, box.x, box.y - 3);
  if (hasText(name)) {
    setText(ctx.pdf, colors.ink);
    setFont(ctx.pdf, 10, "bold");
    ctx.pdf.text(name!.trim(), box.x, box.y + 15);
  }
  if (hasText(artist)) {
    setText(ctx.pdf, colors.text);
    setFont(ctx.pdf, 9, "normal");
    ctx.pdf.text(artist!.trim(), box.x, box.y + (hasText(name) ? 29 : 15));
  }

  ctx.y += height + 6;
}

function drawNumberedSongs(
  ctx: PdfContext,
  songs: Array<{ name?: string | null; artist?: string | null }>
) {
  if (songs.length === 0) return;

  drawLabel(ctx, "Top Songs", ctx.marginX, ctx.y);
  ctx.y += 14;

  songs.forEach((song, index) => {
    const nameLines = hasText(song.name) ? splitText(ctx, song.name!.trim(), 390, 9.5) : [];
    const artistLines = hasText(song.artist) ? splitText(ctx, song.artist!.trim(), 390, 8.5) : [];
    const rowHeight = Math.max(34, 16 + nameLines.length * 12 + artistLines.length * 10);
    ensureSpace(ctx, rowHeight + 8);

    setFill(ctx.pdf, colors.paper);
    ctx.pdf.roundedRect(
      ctx.marginX,
      ctx.y,
      ctx.pageWidth - ctx.marginX * 2,
      rowHeight,
      12,
      12,
      "F"
    );

    setFill(ctx.pdf, colors.fill);
    ctx.pdf.circle(ctx.marginX + 18, ctx.y + 17, 10, "F");
    setText(ctx.pdf, colors.muted);
    setFont(ctx.pdf, 8, "bold");
    ctx.pdf.text(String(index + 1), ctx.marginX + 15, ctx.y + 20);

    const textX = ctx.marginX + 38;
    if (nameLines.length > 0) {
      setText(ctx.pdf, colors.ink);
      setFont(ctx.pdf, 9.5, "bold");
      ctx.pdf.text(nameLines, textX, ctx.y + 15);
    }
    if (artistLines.length > 0) {
      setText(ctx.pdf, colors.text);
      setFont(ctx.pdf, 8.5, "normal");
      ctx.pdf.text(artistLines, textX, ctx.y + 15 + Math.max(1, nameLines.length) * 12);
    }

    ctx.y += rowHeight + 8;
  });
}

function drawHero(ctx: PdfContext, profile: Profile, birthdayShort: string | null) {
  const { pdf } = ctx;
  const avatarSize = 62;
  const x = ctx.marginX;

  drawWashi(ctx, x + 210, ctx.y - 14, 64, colors.lavender);

  setFill(pdf, colors.lavender);
  pdf.roundedRect(x, ctx.y, avatarSize, avatarSize, 16, 16, "F");
  setText(pdf, colors.ink);
  setFont(pdf, 30, "bold");
  pdf.text(profile.full_name?.charAt(0)?.toUpperCase() || "?", x + 22, ctx.y + 42);

  const contentX = x + avatarSize + 20;
  drawLabel(ctx, "Nexia profile", contentX, ctx.y + 8);

  setText(pdf, colors.ink);
  setFont(pdf, 25, "bold");
  const nameLines = splitText(
    ctx,
    profile.full_name || "Profile",
    ctx.pageWidth - contentX - ctx.marginX,
    25
  );
  pdf.text(nameLines, contentX, ctx.y + 34);

  ctx.y += Math.max(avatarSize, 34 + nameLines.length * 26) + 16;

  const meta = compactStrings([profile.relationship_type, birthdayShort, profile.zodiac_sign]);
  drawPills(ctx, meta);

  if (hasText(profile.bio)) {
    drawParagraphBox(ctx, "Bio", `"${profile.bio.trim()}"`, { italic: true, accent: colors.paper });
  }
}

function buildFields(items: Array<[string, string | null | undefined]>): FieldItem[] {
  return items
    .map(([label, value]) => ({ label, value: value?.trim() ?? "" }))
    .filter((field) => field.value.length > 0);
}

export async function exportProfilePdf(profile: Profile) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });

  const ctx: PdfContext = {
    pdf,
    pageWidth: pdf.internal.pageSize.getWidth(),
    pageHeight: pdf.internal.pageSize.getHeight(),
    marginX: 42,
    topY: 48,
    bottomY: pdf.internal.pageSize.getHeight() - 48,
    y: 48,
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
  const topSongs = (profile.top_songs ?? []).filter(
    (song) => hasText(song.name) || hasText(song.artist)
  );
  const associatedSong = profile.associated_song;

  drawHero(ctx, profile, birthdayShort);

  const overviewFields = buildFields([
    ["Profession", profile.profession],
    ["Birthday", birthdayFull],
    ["Zodiac", profile.zodiac_sign],
  ]);

  if (overviewFields.length > 0 || tags.length > 0) {
    drawSectionTitle(ctx, "Overview", sectionAccents[0]);
    drawFieldGrid(ctx, overviewFields);
    drawPills(
      ctx,
      tags.map((tag) => `#${tag}`)
    );
  }

  const favoriteFields = buildFields([
    ["Favorite Movie", profile.favorite_movie],
    ["Favorite Book", profile.favorite_book],
    ["Music Preference", profile.music_preference],
  ]);

  if (
    favoriteFields.length > 0 ||
    hasText(associatedSong?.name) ||
    hasText(associatedSong?.artist) ||
    topSongs.length > 0 ||
    movieGenres.length > 0 ||
    bookGenres.length > 0
  ) {
    drawSectionTitle(ctx, "Favorites & Interests", sectionAccents[1]);
    drawFieldGrid(ctx, favoriteFields);
    drawSongBox(ctx, "Associated Song", associatedSong?.name, associatedSong?.artist);
    drawNumberedSongs(ctx, topSongs);

    if (movieGenres.length > 0) {
      drawLabel(ctx, "Movie Genres", ctx.marginX, ctx.y);
      ctx.y += 14;
      drawPills(ctx, movieGenres);
    }

    if (bookGenres.length > 0) {
      drawLabel(ctx, "Book Genres", ctx.marginX, ctx.y);
      ctx.y += 14;
      drawPills(ctx, bookGenres);
    }
  }

  if (hangoutPlaces.length > 0 || foodRestrictions.length > 0 || politicalViews.length > 0) {
    drawSectionTitle(ctx, "Lifestyle", sectionAccents[2]);

    if (hangoutPlaces.length > 0) {
      drawLabel(ctx, "Hangout Places", ctx.marginX, ctx.y);
      ctx.y += 14;
      drawPills(ctx, hangoutPlaces);
    }

    if (foodRestrictions.length > 0) {
      drawLabel(ctx, "Food Restrictions", ctx.marginX, ctx.y);
      ctx.y += 14;
      drawPills(ctx, foodRestrictions);
    }

    if (politicalViews.length > 0) {
      drawLabel(ctx, "Political Views", ctx.marginX, ctx.y);
      ctx.y += 14;
      drawPills(ctx, politicalViews);
    }
  }

  if (hasText(profile.long_term_goals) || hasText(profile.favorite_memory) || quotes.length > 0) {
    drawSectionTitle(ctx, "Deep Dive", sectionAccents[3]);
    drawParagraphBox(ctx, "Long-Term Goals", profile.long_term_goals);
    drawParagraphBox(
      ctx,
      "Favorite Memory",
      profile.favorite_memory ? `"${profile.favorite_memory.trim()}"` : "",
      {
        italic: true,
        accent: colors.paper,
      }
    );

    if (quotes.length > 0) {
      drawLabel(ctx, "Their Quotes", ctx.marginX, ctx.y);
      ctx.y += 14;
      quotes.forEach((quote) => {
        drawParagraphBox(ctx, "Quote", `"${quote.quote.trim()}"`, {
          italic: true,
          accent: colors.paper,
        });
      });
    }
  }

  pdf.save(`${safeFilename(profile.full_name)}-nexia-profile.pdf`);
}
