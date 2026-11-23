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
 * "Nexia" in Alan Sans Bold, outlined at 100px with -0.02em tracking and its
 * baseline at y = 0; ink spans x 6.7–254.7 and y -71.5–1.2, caps 68 high.
 * Outlined from `public/fonts/AlanSans-Bold.ttf`, so the file never depends on
 * the font being installed where it is shown.
 */
const WORDMARK_PATH = [
  "M6.7 0V-57.1Q6.7 -62.9 9.6 -65.9Q12.4 -68.9 17 -68.9Q20.4 -68.9 23.2 -67.2",
  "Q26 -65.4 28.8 -61.3L59.2 -17L52.2 -16.5V-68H67.7V0H51.7L16.2 -51.1L22.2 -51.7V0Z",
  "M102.8 1.2Q89.5 1.2 82.5 -5.4Q75.5 -12 75.5 -24Q75.5 -32.3 78.8 -38.4",
  "Q82.1 -44.5 88.2 -47.9Q94.2 -51.2 102.3 -51.2Q109.6 -51.2 114.6 -48.8",
  "Q119.6 -46.3 122.2 -42.3Q124.8 -38.3 124.8 -33.6Q124.8 -29.1 122.6 -26.1",
  "Q120.3 -23.1 116.4 -21.5Q112.5 -19.9 107.6 -19.6Q102.6 -19.2 97.1 -19.9",
  "Q91.6 -20.6 86.2 -22.2V-31.2Q91.4 -29.9 95.7 -29.4Q99.9 -28.9 103.1 -29.3",
  "Q106.2 -29.7 107.9 -31Q109.6 -32.3 109.6 -34.5Q109.6 -36.9 107.7 -38.6",
  "Q105.7 -40.3 102.1 -40.3Q98.9 -40.3 96.4 -38.7Q93.8 -37 92.3 -33.5",
  "Q90.8 -30.1 90.8 -24.7Q90.8 -19.7 92.3 -16.4Q93.8 -13.1 96.9 -11.6Q100 -10 105.2 -10",
  "Q109.9 -10 114.4 -11.1Q118.8 -12.1 122.9 -14.1V-3.7Q119.3 -1.6 114.2 -0.2",
  "Q109 1.2 102.8 1.2ZM126.8 -50H143.3L155 -31.2H150.8L162.5 -50H178.5L160.4 -21",
  "L160.5 -28.6L178.4 0H161.8L150.5 -18.4H154.4L143 0H126.9L144.8 -28.6L145 -21ZM183.8 0",
  "V-50.3Q191.3 -48.5 198.8 -50.3V0ZM191.3 -56Q186.9 -56 184.7 -58.2",
  "Q182.5 -60.3 182.5 -63.8Q182.5 -67.2 184.7 -69.3Q186.9 -71.5 191.3 -71.5",
  "Q195.6 -71.5 197.8 -69.3Q200.1 -67.2 200.1 -63.8Q200.1 -60.3 197.8 -58.2",
  "Q195.6 -56 191.3 -56ZM254.7 0H239.5Q238.8 -1.4 238.5 -4.1Q238.1 -6.8 238.1 -10.4",
  "L237.6 -13.3V-33.5Q237.6 -36.6 235.7 -37.8Q233.7 -39 230.3 -39Q226.8 -39 224.5 -38.2",
  "Q222.2 -37.3 220.5 -36.2Q218.8 -35 217.2 -34.2Q215.7 -33.4 213.6 -33.4",
  "Q210.7 -33.4 209 -35Q207.3 -36.5 207.3 -39.2Q207.3 -41.1 208.2 -42.9",
  "Q209.1 -44.6 211.3 -46.1Q217.6 -51.2 230.2 -51.2Q237.6 -51.2 242.6 -49.3",
  "Q247.6 -47.4 250.1 -43.1Q252.6 -38.7 252.6 -31.4V-16.3Q252.6 -10.8 253.2 -6.8",
  "Q253.8 -2.7 254.7 0ZM222 1.2Q214.5 1.2 210.2 -2.8Q205.9 -6.8 205.9 -13.4",
  "Q205.9 -19.6 209.9 -23.2Q213.9 -26.7 221.7 -27.9L231.9 -29.5Q235.3 -30.1 236.5 -30.9",
  "Q237.6 -31.7 237.6 -33.4V-23.5Q237 -23 236.1 -22.6Q235.1 -22.1 233 -21.6L227.9 -20.6",
  "Q225.2 -20.1 223.6 -18.9Q221.9 -17.6 221.9 -15Q221.9 -12.4 223.6 -10.9",
  "Q225.2 -9.5 228 -9.5Q230.7 -9.5 232.9 -10.8Q235 -12.1 236.3 -14.5",
  "Q237.6 -16.9 237.6 -20L239.4 -10.6Q237.2 -4.7 232.6 -1.8Q228 1.2 222 1.2Z",
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
 * cropped box scaled to 64 high; the caps are half that, centred on the
 * flower's centre.
 */
function wordmarkSvg(): string {
  const [vx, vy, vw] = MARK.viewBox.split(" ").map(Number) as [number, number, number];
  const markScale = 64 / vw;
  const textScale = 32 / 68;
  const x = 64 + 14 - 6.7 * textScale;
  // Caps 32 tall, centred on the mark's 64: the baseline sits at 48.
  const baseline = 48;
  const width = Math.ceil(78 + (254.7 - 6.7) * textScale + 2);
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
