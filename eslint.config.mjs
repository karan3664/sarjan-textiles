import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const sarjanEslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "public/template/**",
      "**/*.min.js",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Vendor Bootstrap/mod template uses plain <img> and public URLs; full
      // next/image migration is a separate visual regression pass.
      "@next/next/no-img-element": "off",
    },
  },
];

export default sarjanEslintConfig;
