import { ExactTemplatePage } from "@/components/shared/ExactTemplatePage";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <ExactTemplatePage kind="admin" file="index.html" />;
}
