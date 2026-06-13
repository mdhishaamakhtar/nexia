import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactCompiler from "eslint-plugin-react-compiler";

const WEB_FILES = ["apps/web/**/*.{ts,tsx}"];

/** Scopes a set of flat configs (e.g. Next's) to the web app only. */
const scopeTo = (configs, files) => configs.map((c) => ({ ...c, files }));

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "apps/web/.next/**",
    "apps/web/next-env.d.ts",
    // Vendored shadcn/ai-elements primitives — not ours to lint.
    "apps/web/src/components/ai-elements/**",
    "apps/web/src/components/ui/**",
    "apps/api/drizzle/**",
    // Legacy Go backend (kept only as porting reference).
    "backend/**",
    // Tooling / docs / vendored skill bundles — not application source.
    ".agents/**",
    ".claude/**",
    "docs/**",
  ]),

  // Base TypeScript rules for every workspace.
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
    plugins: { prettier: prettierPlugin },
    rules: {
      "prettier/prettier": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },

  // Next.js + React Compiler rules, scoped to the web app.
  ...scopeTo([...nextVitals, ...nextTs], WEB_FILES),
  {
    files: WEB_FILES,
    plugins: { "react-compiler": reactCompiler },
    rules: {
      "react-compiler/react-compiler": "error",
      // App Router only — there is no pages/ directory.
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  prettier,
]);
