import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default defineConfig([
  globalIgnores([
    ".jj/",
    ".next/",
    "out/",
    "node_modules/",
    ".vscode/",
    "python/",
  ]),
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
    rules: {
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
    },
  },
  pluginReact.configs.flat.recommended,
  {
    files: ["**/*.{js,jsx}"],
    rules: {
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
    },
  },
  eslintConfigPrettier,
]);
