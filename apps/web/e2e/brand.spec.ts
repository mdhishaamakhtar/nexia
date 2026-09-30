import { expect, test } from "@playwright/test";

// What a browser, a phone's home screen and a link preview ask for.
const ASSETS: Array<[string, RegExp]> = [
  ["/favicon.ico", /image\/(x-icon|vnd\.microsoft\.icon)/],
  ["/icon.svg", /image\/svg\+xml/],
  ["/apple-icon.png", /image\/png/],
  ["/manifest.webmanifest", /application\/manifest\+json/],
  ["/opengraph-image", /image\/png/],
  ["/twitter-image", /image\/png/],
];

for (const [path, type] of ASSETS) {
  test(`serves ${path}`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(type);
    expect((await response.body()).byteLength).toBeGreaterThan(100);
  });
}

test("the manifest's icons are all there", async ({ request }) => {
  const manifest = (await (await request.get("/manifest.webmanifest")).json()) as {
    icons: Array<{ src: string }>;
  };
  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).status(), icon.src).toBe(200);
  }
});
