import { cmsSeoMetadata } from "@/lib/page-seo";

export async function generateMetadata() {
  return cmsSeoMetadata("terms");
}

export { default } from "@/app/term-of-use/page";
