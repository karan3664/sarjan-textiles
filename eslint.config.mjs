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
      // Modave/Bootstrap markup uses many plain <a href="/..."> anchors; migrating
      // every internal link to next/link is a separate pass and should not block deploys.
      "@next/next/no-html-link-for-pages": "off",
      // Legacy storefront/admin modules — clean up incrementally; do not block prod deploy.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];

export default sarjanEslintConfig;
