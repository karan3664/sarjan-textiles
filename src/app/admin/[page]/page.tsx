import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { ExactTemplatePage } from "@/components/shared/ExactTemplatePage";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return fs
    .readdirSync(path.join(process.cwd(), "reference", "admin-modave"))
    .filter((file) => file.endsWith(".html") && file !== "index.html")
    .map((file) => ({ page: file.replace(/\.html$/, "") }));
}

export default async function AdminSubPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const file = `${page}.html`;
  const filePath = path.join(process.cwd(), "reference", "admin-modave", file);
  if (!fs.existsSync(filePath)) notFound();
  return <ExactTemplatePage kind="admin" file={file} />;
}
