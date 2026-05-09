import Link from "next/link";
import { navigation, siteSettings } from "@/data/mock";

export function Footer() {
  return (
    <footer className="sarjan-band sarjan-band-soft">
      <div className="container">
        <div className="row g-4 align-items-start">
          <div className="col-lg-5">
            <img className="sarjan-logo mb-3" src={siteSettings.logo} alt={siteSettings.brandName} />
            <p className="sarjan-muted mb-4">{siteSettings.footerNote}</p>
            <div className="d-flex flex-wrap gap-2">
              <span className="sarjan-pill">{siteSettings.email}</span>
              <span className="sarjan-pill">{siteSettings.phone}</span>
            </div>
          </div>
          <div className="col-lg-3">
            <h6 className="fw-bold mb-3">Navigation</h6>
            <div className="d-grid gap-2">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href} className="text-decoration-none text-dark">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="col-lg-4">
            <h6 className="fw-bold mb-3">B2B Workflow</h6>
            <p className="sarjan-muted mb-0">
              Client registration, admin approval, MOQ order placement, dispatch tracking, and {siteSettings.creditTermDays}-day manual cheque collection.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
