import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      // shared constants (icons, easing, nav links) live next to their components
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    // React Three Fiber code mutates three.js objects (materials, uniforms,
    // instance buffers) imperatively inside useFrame/effects — that is the
    // intended R3F pattern, not React state, so the compiler-oriented
    // immutability rule does not apply to the WebGL layer.
    files: ["src/components/canvas/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
]);
