import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import reactCompiler from "eslint-plugin-react-compiler";

const webConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      prettier: prettierPlugin,
      "react-compiler": reactCompiler,
    },
    rules: {
      "prettier/prettier": "error",
      "react-compiler/react-compiler": "error",
    },
  },
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/components/ai-elements/**", "src/components/ui/**"]),
]);

export default webConfig;
