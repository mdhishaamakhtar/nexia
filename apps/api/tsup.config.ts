import { defineConfig } from "tsup";

/**
 * Bundles the API (and the `@nexia/shared` workspace source it imports) into a
 * single ESM file. Bundling is what lets the codebase keep `moduleResolution:
 * "bundler"` and extensionless relative imports — Node's ESM loader would
 * otherwise demand an explicit `.js` on every one of them.
 */
export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm"],
  target: "node24",
  platform: "node",
  outDir: "dist",
  sourcemap: true,
  clean: true,
  noExternal: [/@nexia\/shared/],
});
