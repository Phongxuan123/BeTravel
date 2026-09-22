import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

/*
 * Cau hinh ESLint cho backend (JavaScript ESM, Node 20+).
 * `eslint-config-prettier` dat cuoi cung de tat moi rule dinh dang
 * dang xung dot voi Prettier -- dinh dang do Prettier lo, khong phai ESLint.
 */
export default [
  {
    ignores: ["node_modules/**", "coverage/**"],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        // Middleware loi cua Express bat buoc co 4 tham so, `next` co the khong dung den.
        { argsIgnorePattern: "^_|^next$", varsIgnorePattern: "^_" },
      ],
      "no-console": "off",
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  prettier,
];
