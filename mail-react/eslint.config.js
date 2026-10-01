import js from "@eslint/js";
import tseslint from "typescript-eslint";
export default [
  { ignores: ["public/tinymce/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        FileReader: "readonly",
        URLSearchParams: "readonly",
        HTMLElement: "readonly",
        File: "readonly",
        alert: "readonly",
        confirm: "readonly",
        indexedDB: "readonly",
        location: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];
