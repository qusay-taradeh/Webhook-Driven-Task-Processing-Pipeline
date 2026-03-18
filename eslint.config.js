import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginSecurity from "eslint-plugin-security";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,

  pluginSecurity.configs.recommended,

  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Prevents ESLint from failing the CI because of the 'any' type we used
      // for the unpredictable webhook payloads in the worker.ts file
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  {
    ignores: ["dist/", "node_modules/"],
  },
);
