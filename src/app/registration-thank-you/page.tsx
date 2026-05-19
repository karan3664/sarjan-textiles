import type { Metadata } from "next";
import { RegistrationThankYouClient } from "@/components/storefront/RegistrationThankYouClient";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export const metadata: Metadata = {
  title: "Thank you for registering | Sarjan Textiles",
  description:
    "Your Sarjan Textiles wholesale account is pending admin approval. You will receive an email when you can view prices and order.",
  robots: { index: false, follow: true },
};

export default function RegistrationThankYouPage() {
  return (
    <ModaveShell>
      <RegistrationThankYouClient />
    </ModaveShell>
  );
}
