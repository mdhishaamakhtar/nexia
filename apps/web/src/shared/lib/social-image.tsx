import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND_COLORS, markSvg } from "@/shared/brand/mark";

export const socialImageSize = {
  width: 1200,
  height: 630,
} as const;

export const socialImageAlt = "Nexia: capture the people who matter most";

const siteDomain = "nexia.hishaam.dev";

/*
 * The same vendored Nunito files the PDF export serves from /fonts, read from
 * disk here. Next's file tracer can only follow a path it can read statically,
 * so this stays one literal directory rather than anything resolved at runtime
 * (a package root or a candidate list), which makes it trace the whole tree.
 */
const FONT_DIR = join(process.cwd(), "public/fonts");

function loadFont(filename: string): Promise<Buffer> {
  return readFile(join(FONT_DIR, filename));
}

// The app's tokens (globals.css), as literals: this renders outside the page.
const C = {
  ...BRAND_COLORS,
  text2: "#57534e",
  border: "rgba(120, 98, 74, 0.24)",
  lavender: "#c4b5fd",
  lavenderInk: "#5b21b6",
  lavenderBg: "rgba(196, 181, 253, 0.22)",
  lavenderBorder: "rgba(91, 33, 182, 0.22)",
  peachSoft: "#ffedd5",
  peachLine: "rgba(124, 45, 18, 0.24)",
  peachInk: "#7c2d12",
};

function svgSrc(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** The washi strip, notched at both ends like `.washi-tape`. */
function tapeSrc(color: string): string {
  return svgSrc(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 26"><polygon points="5,0 95,0 100,13 95,26 5,26 0,13" fill="${color}"/></svg>`
  );
}

/** Lucide's "music" glyph, in the song well's ink. */
const musicSrc = svgSrc(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${C.peachInk}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`
);

// One of the landing page's sample people, so the preview shows the product.
// One card, not a stack: at link-preview size a second card is just clutter.
const CARD = {
  initial: "A",
  name: "Alex Chen",
  meta: "Gemini · Friend",
  tags: ["coffee-lover", "bookworm"],
  song: { name: "Yellow", artist: "Coldplay" },
};

const CARD_WIDTH = 330;

function Card() {
  return (
    <div
      style={{
        position: "absolute",
        left: 774,
        top: 176,
        width: CARD_WIDTH,
        display: "flex",
        flexDirection: "column",
        gap: 22,
        padding: "36px 32px 32px",
        borderRadius: 28,
        background: C.paper,
        border: `1.5px solid ${C.border}`,
        transform: "rotate(-2.5deg)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
      <img
        src={tapeSrc(C.tape)}
        width={104}
        height={26}
        alt=""
        style={{
          position: "absolute",
          top: -13,
          left: (CARD_WIDTH - 104) / 2,
          transform: "rotate(-2deg)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 16,
            background: C.lavender,
            color: C.lavenderInk,
            fontSize: 26,
            fontWeight: 800,
            transform: "rotate(-3deg)",
          }}
        >
          {CARD.initial}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 23, fontWeight: 700, color: C.ink }}>{CARD.name}</div>
          <div style={{ fontSize: 16, color: C.inkMuted }}>{CARD.meta}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {CARD.tags.map((tag) => (
          <div
            key={tag}
            style={{
              display: "flex",
              padding: "5px 13px",
              borderRadius: 999,
              background: C.lavenderBg,
              border: `1px solid ${C.lavenderBorder}`,
              color: C.lavenderInk,
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            #{tag}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 16px",
          borderRadius: 16,
          background: C.peachSoft,
          border: `1px solid ${C.peachLine}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
        <img src={musicSrc} width={20} height={20} alt="" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{CARD.song.name}</div>
          <div style={{ fontSize: 14, color: C.text2 }}>{CARD.song.artist}</div>
        </div>
      </div>
    </div>
  );
}

export async function createSocialImage() {
  const [regular, bold, extraBold] = await Promise.all([
    loadFont("Nunito-Regular.ttf"),
    loadFont("Nunito-Bold.ttf"),
    loadFont("Nunito-ExtraBold.ttf"),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: C.page,
        fontFamily: "Nunito",
        color: C.ink,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 700,
          padding: "80px 0 76px 96px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
          <img src={svgSrc(markSvg())} width={48} height={48} alt="" />
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.025em" }}>Nexia</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 58,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginLeft: -3,
            }}
          >
            <div>Capture the people</div>
            <div style={{ color: C.inkMuted }}>who matter most.</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 23,
              lineHeight: 1.55,
              color: C.text2,
            }}
          >
            <div>Their songs, their quirks, the stories.</div>
            <div>Keep them in one slambook, then just ask.</div>
          </div>
        </div>

        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: C.inkMuted,
          }}
        >
          {siteDomain}
        </div>
      </div>

      <Card />
    </div>,
    {
      ...socialImageSize,
      fonts: [
        { name: "Nunito", data: regular, style: "normal", weight: 400 },
        { name: "Nunito", data: bold, style: "normal", weight: 700 },
        { name: "Nunito", data: extraBold, style: "normal", weight: 800 },
      ],
    }
  );
}
