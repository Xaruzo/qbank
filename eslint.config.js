import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
  { ignores: ["dist"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // react-hooks v7 bundles the new compiler-powered rules (refs,
      // set-state-in-effect, purity, ...) into recommended as errors. This
      // codebase predates them, so they start as warnings and should be
      // ratcheted up to errors as the legacy spots get cleaned up.
      ...reactHooks.configs.recommended.rules,
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": "warn",
      // Warn so existing prod logging shows up as tracked debt, not CI breaks.
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // First-adoption ratchet for legacy code; tighten incrementally.
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-useless-assignment": "warn",
      // Empty catch blocks are an intentional storage-fallback pattern in
      // this codebase (localStorage/IndexedDB try/catch everywhere).
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["tests/**/*.js", "vite.config.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
  {
    files: ["public/sw.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: { ...globals.serviceworker },
    },
  },
];