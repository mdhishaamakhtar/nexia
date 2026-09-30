/**
 * Renders every static brand asset from `src/shared/brand/mark.ts`:
 *
 *   src/app/icon.svg              the favicon browsers prefer
 *   src/app/favicon.ico           16/32/48px, for everything else
 *   src/app/apple-icon.png        iOS home screen
 *   public/icons/*.png            the web manifest's icons, and the mark for emails
 *   ../../docs/brand/*.svg        the mark and wordmark, for the README and elsewhere
 *
 * Run it after changing the mark: `npm run brand -w web`. Pass the URL of a
 * running web app to also save its social preview for the README:
 * `npm run brand -w web -- http://localhost:3000`.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { BRAND_COLORS, MARK, markShapes, markSvg } from "../src/shared/brand/mark.ts";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..");
const BRAND_DIR = join(WEB, "../../docs/brand");

/**
 * "Nexia" in Nunito ExtraBold, outlined at 100px with -0.02em tracking and
 * its baseline at y = 0; ink spans x 7.1–255.1 and y -73.2–1.1.
 */
const WORDMARK_PATH = [
  "M14.3 0.9Q10.8 0.9 8.95 -1.05Q7.1 -3 7.1 -6.6V-63.6Q7.1 -67.4 8.95 -69.4",
  "Q10.8 -71.4 13.9 -71.4Q16.6 -71.4 18.05 -70.35Q19.5 -69.3 21.4 -66.9L56.5 -22.2H53.8V-64",
  "Q53.8 -67.5 55.65 -69.45Q57.5 -71.4 61 -71.4Q64.5 -71.4 66.35 -69.45Q68.2 -67.5 68.2 -64",
  "V-6.3Q68.2 -3 66.5 -1.05Q64.8 0.9 61.9 0.9Q59.1 0.9 57.45 -0.2Q55.8 -1.3 53.9 -3.7",
  "L18.9 -48.4H21.5V-6.6Q21.5 -3 19.7 -1.05Q17.9 0.9 14.3 0.9ZM104.6 1.1",
  "Q95.9 1.1 89.65 -2.05Q83.4 -5.2 80.05 -10.95Q76.7 -16.7 76.7 -24.5",
  "Q76.7 -32.1 79.9 -37.85Q83.1 -43.6 88.85 -46.85Q94.6 -50.1 101.9 -50.1",
  "Q107.2 -50.1 111.5 -48.35Q115.8 -46.6 118.9 -43.35Q122 -40.1 123.6 -35.45",
  "Q125.2 -30.8 125.2 -25.1Q125.2 -23.2 124 -22.25Q122.8 -21.3 120.5 -21.3H89.1V-29.1H114.3",
  "L112.7 -27.7Q112.7 -31.8 111.5 -34.55Q110.3 -37.3 108.05 -38.7Q105.8 -40.1 102.5 -40.1",
  "Q98.8 -40.1 96.2 -38.4Q93.6 -36.7 92.2 -33.5Q90.8 -30.3 90.8 -25.8V-25",
  "Q90.8 -17.4 94.35 -13.8Q97.9 -10.2 104.9 -10.2Q107.3 -10.2 110.4 -10.8",
  "Q113.5 -11.4 116.2 -12.7Q118.5 -13.8 120.3 -13.45Q122.1 -13.1 123.1 -11.8",
  "Q124.1 -10.5 124.25 -8.8Q124.4 -7.1 123.5 -5.45Q122.6 -3.8 120.5 -2.7",
  "Q117.1 -0.8 112.85 0.15Q108.6 1.1 104.6 1.1ZM137.2 0.7Q134.4 0.7 132.7 -0.85",
  "Q131 -2.4 130.95 -4.8Q130.9 -7.2 132.9 -9.7L148.4 -28.7V-21.9L134 -39.5",
  "Q131.9 -42.1 132 -44.5Q132.1 -46.9 133.8 -48.4Q135.5 -49.9 138.3 -49.9",
  "Q141 -49.9 142.8 -49Q144.6 -48.1 146.2 -46L156.9 -32.3H151.6L162.3 -46",
  "Q164 -48.1 165.8 -49Q167.6 -49.9 170.2 -49.9Q173 -49.9 174.7 -48.35",
  "Q176.4 -46.8 176.45 -44.4Q176.5 -42 174.4 -39.5L160 -21.9V-28.7L175.6 -9.7",
  "Q177.7 -7.3 177.6 -4.9Q177.5 -2.5 175.75 -0.9Q174 0.7 171.2 0.7Q168.5 0.7 166.75 -0.25",
  "Q165 -1.2 163.3 -3.2L151.6 -18.1H156.7L145 -3.2Q143.4 -1.3 141.65 -0.3",
  "Q139.9 0.7 137.2 0.7ZM193.5 0.8Q189.8 0.8 187.85 -1.35Q185.9 -3.5 185.9 -7.4V-41.6",
  "Q185.9 -45.6 187.85 -47.75Q189.8 -49.9 193.5 -49.9Q197.1 -49.9 199.05 -47.75",
  "Q201 -45.6 201 -41.6V-7.4Q201 -3.5 199.1 -1.35Q197.2 0.8 193.5 0.8ZM193.5 -58.1",
  "Q189.3 -58.1 187.05 -60.05Q184.8 -62 184.8 -65.6Q184.8 -69.3 187.05 -71.25",
  "Q189.3 -73.2 193.5 -73.2Q197.7 -73.2 199.9 -71.25Q202.1 -69.3 202.1 -65.6",
  "Q202.1 -62 199.9 -60.05Q197.7 -58.1 193.5 -58.1ZM227.3 1.1Q221.9 1.1 217.6 -1",
  "Q213.3 -3.1 210.9 -6.7Q208.5 -10.3 208.5 -14.8Q208.5 -20.2 211.3 -23.35",
  "Q214.1 -26.5 220.4 -27.85Q226.7 -29.2 237.1 -29.2H242.4V-21.4H237.2",
  "Q232.1 -21.4 228.95 -20.85Q225.8 -20.3 224.45 -19Q223.1 -17.7 223.1 -15.4",
  "Q223.1 -12.6 225.05 -10.8Q227 -9 230.7 -9Q233.6 -9 235.85 -10.35",
  "Q238.1 -11.7 239.4 -14.05Q240.7 -16.4 240.7 -19.4V-30.9Q240.7 -35.3 238.7 -37.15",
  "Q236.7 -39 231.9 -39Q229.2 -39 226.05 -38.35Q222.9 -37.7 219.1 -36.2",
  "Q216.9 -35.2 215.2 -35.75Q213.5 -36.3 212.6 -37.75Q211.7 -39.2 211.7 -40.95",
  "Q211.7 -42.7 212.7 -44.35Q213.7 -46 216 -46.8Q220.7 -48.7 224.85 -49.4",
  "Q229 -50.1 232.5 -50.1Q240.2 -50.1 245.15 -47.85Q250.1 -45.6 252.6 -40.95",
  "Q255.1 -36.3 255.1 -29V-6.8Q255.1 -3.1 253.3 -1.1Q251.5 0.9 248.1 0.9",
  "Q244.7 0.9 242.85 -1.1Q241 -3.1 241 -6.8V-10.5L241.7 -9.9Q241.1 -6.5 239.15 -4.05",
  "Q237.2 -1.6 234.2 -0.25Q231.2 1.1 227.3 1.1Z",
].join("");

async function write(path: string, data: string | Buffer) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
  console.log("wrote", relative(WEB, path));
}

function png(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** An .ico holding PNG images, which every browser since IE Vista reads. */
function ico(images: Array<{ size: number; data: Buffer }>): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

/**
 * The mark with the name set beside it, both outlined. The mark keeps its
 * cropped 57-unit box scaled to 64 high; the caps are half that, centred on
 * the note.
 */
function wordmarkSvg(): string {
  const [vx, vy, vw] = MARK.viewBox.split(" ").map(Number) as [number, number, number];
  const markScale = 64 / vw;
  const textScale = 32 / 72.3;
  const x = 64 + 12 - 7.1 * textScale;
  const baseline = (35 - vy) * markScale + 15.8;
  const width = Math.ceil(76 + (255.1 - 7.1) * textScale + 2);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 64" width="${width * 2}" height="128">`,
    `<g transform="scale(${markScale}) translate(${-vx} ${-vy})">${markShapes()}</g>`,
    `<path transform="translate(${x.toFixed(2)} ${baseline.toFixed(2)}) scale(${textScale.toFixed(4)})" d="${WORDMARK_PATH}" fill="${BRAND_COLORS.ink}"/>`,
    `</svg>`,
  ].join("");
}

const onPage = (scale: number, size: number) =>
  markSvg({ size, background: BRAND_COLORS.page, scale });

await write(join(WEB, "src/app/icon.svg"), markSvg() + "\n");
await write(
  join(WEB, "src/app/favicon.ico"),
  ico(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({ size, data: await png(markSvg({ size })) }))
    )
  )
);
// iOS rounds the corners itself and fills transparency with black.
await write(join(WEB, "src/app/apple-icon.png"), await png(onPage(0.74, 180)));
await write(join(WEB, "public/icons/icon-192.png"), await png(onPage(0.78, 192)));
await write(join(WEB, "public/icons/icon-512.png"), await png(onPage(0.78, 512)));
// Maskable icons are cropped to a circle 80% wide: keep the mark inside it.
await write(join(WEB, "public/icons/icon-maskable-512.png"), await png(onPage(0.6, 512)));
// The bare mark for emails, which cannot show SVG. Shown at 32px, drawn at 3×.
await write(join(WEB, "public/icons/mark-96.png"), await png(markSvg({ size: 96 })));

await write(join(BRAND_DIR, "nexia-mark.svg"), markSvg({ size: 256 }) + "\n");
await write(join(BRAND_DIR, "nexia-wordmark.svg"), wordmarkSvg() + "\n");

const appUrl = process.argv[2];
if (appUrl) {
  const response = await fetch(new URL("/opengraph-image", appUrl));
  if (!response.ok) throw new Error(`social preview: HTTP ${response.status}`);
  await write(
    join(BRAND_DIR, "nexia-social-preview.png"),
    Buffer.from(await response.arrayBuffer())
  );
}
