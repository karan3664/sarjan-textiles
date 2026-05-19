import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  UsersRound,
  FileText,
  Settings,
} from "lucide-react";
import { siteSettings } from "@/data/mock";

const links = [
  { label: "CMS Pages", href: "/admin#cms", icon: FileText },
  { label: "Clients", href: "/admin#clients", icon: UsersRound },
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Orders", href: "/admin#orders", icon: ShoppingCart },
  { label: "Products", href: "/admin#products", icon: Package },
  { label: "Settings", href: "/admin#settings", icon: Settings },
].sort((a, b) =>
  a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
);

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="sarjan-admin-shell">
      <aside className="sarjan-admin-sidebar">
        <Link href="/admin" className="d-block mb-4">
          <img
            className="sarjan-logo"
            src={siteSettings.logo}
            alt={siteSettings.brandName}
          />
        </Link>
        <nav className="d-grid gap-2">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="d-flex align-items-center gap-2 text-dark text-decoration-none fw-bold p-3 rounded border"
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="sarjan-admin-main">{children}</main>
    </div>
  );
}
