import "@/styles/admin.css";
/* CMS editor, HTML toolbar, home banner builder — rules live in storefront.css */
import "@/styles/storefront.css";
import "@/styles/emoji-picker.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
