import Link from "next/link";
import { Heart, Search, ShoppingBag, UserRound } from "lucide-react";
import { navigation, siteSettings } from "@/data/mock";

export function Header() {
  return (
    <>
      <div className="sarjan-topbar">
        <div className="container d-flex justify-content-between gap-3">
          <span>{siteSettings.footerNote}</span>
          <span>{siteSettings.ordersEmail}</span>
        </div>
      </div>
      <header className="sarjan-header">
        <div className="container d-flex align-items-center justify-content-between gap-4 py-2">
          <Link href="/" aria-label={siteSettings.brandName}>
            <img className="sarjan-logo" src={siteSettings.logo} alt={siteSettings.brandName} />
          </Link>
          <nav className="sarjan-nav d-none d-lg-flex align-items-center gap-4">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="d-flex align-items-center gap-3">
            <button className="btn p-1" data-bs-toggle="modal" data-bs-target="#searchModal" aria-label="Search">
              <Search size={21} />
            </button>
            <Link className="btn p-1" href="/wishlist" aria-label="Wishlist">
              <Heart size={21} />
            </Link>
            <Link className="btn p-1" href="/login" aria-label="Login">
              <UserRound size={21} />
            </Link>
            <button className="btn p-1 position-relative" data-bs-toggle="modal" data-bs-target="#cartModal" aria-label="Cart">
              <ShoppingBag size={21} />
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark">2</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
