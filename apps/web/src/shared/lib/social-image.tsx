import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND, PERSON_PALETTE } from "@nexia/shared/brand";
import { BRAND_COLORS, markSvg } from "@/shared/brand/mark";

export const socialImageSize = {
  width: 1200,
  height: 630,
} as const;

export const socialImageAlt = "Nexia: capture the people who matter most";

const siteDomain = "nexia.hishaam.dev";

/*
 * The same vendored font files the PDF export serves from /fonts, read from
 * disk here. Next's file tracer can only follow a path it can read statically,
 * so this stays one literal directory rather than anything resolved at runtime
 * (a package root or a candidate list), which makes it trace the whole tree.
 */
const FONT_DIR = join(process.cwd(), "public/fonts");

function loadFont(filename: string): Promise<Buffer> {
  return readFile(join(FONT_DIR, filename));
}

// This renders outside the page, so it cannot read CSS variables. The card is
// butter, the colour and shape profile id 1 gets (identity.ts).
const C = {
  ...BRAND_COLORS,
  text2: BRAND.ink2,
  butterSoft: PERSON_PALETTE.butter.soft,
  butterInk: PERSON_PALETTE.butter.ink,
  chip: "rgba(255, 255, 255, 0.72)",
};

function svgSrc(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// One of the landing page's sample people, so the preview shows the product.
// One card, not a stack: at link-preview size a second card is just clutter.
const CARD = {
  initial: "A",
  name: "Alex Chen",
  meta: "Friend · he/him",
  chips: ["Gemini", "coffee-lover"],
};

function Card() {
  return (
    <div
      style={{
        position: "absolute",
        left: 760,
        top: 135,
        width: 344,
        height: 360,
        display: "flex",
        flexDirection: "column",
        padding: 34,
        borderRadius: 44,
        background: C.butterSoft,
        color: C.butterInk,
      }}
    >
      <div
        style={{
          width: 104,
          height: 104,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 34,
          background: C.butter,
          fontSize: 50,
          fontWeight: 700,
        }}
      >
        {CARD.initial}
      </div>
      <div style={{ display: "flex", flexGrow: 1 }} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          {CARD.name}
        </div>
        <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700 }}>{CARD.meta}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
          {CARD.chips.map((chip) => (
            <div
              key={chip}
              style={{
                display: "flex",
                padding: "7px 16px",
                borderRadius: 999,
                background: C.chip,
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export async function createSocialImage() {
  const [regular, bold] = await Promise.all([
    loadFont("AlanSans-Regular.ttf"),
    loadFont("AlanSans-Bold.ttf"),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: C.page,
        fontFamily: "Alan Sans",
        color: C.ink,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 680,
          padding: "80px 0 76px 96px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
          <img src={svgSrc(markSvg())} width={52} height={52} alt="" />
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.025em" }}>Nexia</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: "-0.035em",
              marginLeft: -3,
            }}
          >
            <div>Capture the people</div>
            <div>who matter most.</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 24,
              lineHeight: 1.5,
              color: C.text2,
            }}
          >
            <div>Their songs, their quirks, the stories.</div>
            <div>Keep them in one slambook, then just ask.</div>
          </div>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: C.inkMuted }}>{siteDomain}</div>
      </div>

      <Card />
    </div>,
    {
      ...socialImageSize,
      fonts: [
        { name: "Alan Sans", data: regular, style: "normal", weight: 400 },
        { name: "Alan Sans", data: bold, style: "normal", weight: 700 },
      ],
    }
  );
}
