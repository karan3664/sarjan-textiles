import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Launching Soon | Sarjan Textiles",
  description:
    "Sarjan Textiles wholesale B2B platform launches soon. Craft-based garments for modern retail.",
  robots: { index: false, follow: false },
};

export default function LaunchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
