import { Header } from "./Header";
import { Footer } from "./Footer";
import { StorefrontModals } from "./StorefrontModals";

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="sarjan-page">
      <Header />
      {children}
      <Footer />
      <StorefrontModals />
    </div>
  );
}
