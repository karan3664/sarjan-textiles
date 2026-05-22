import Link from "next/link";
import { unsubscribeByToken } from "@/lib/newsletter-store";

export const dynamic = "force-dynamic";

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const trimmed = token?.trim() ?? "";

  if (!trimmed) {
    return (
      <main className="sarjan-newsletter-unsub">
        <div className="sarjan-newsletter-unsub-card">
          <h1>Unsubscribe</h1>
          <p>
            Invalid link. Use the unsubscribe link from your newsletter email.
          </p>
          <Link href="/">Back to Sarjan Textiles</Link>
        </div>
      </main>
    );
  }

  let email = "";
  let error = "";
  try {
    const subscriber = await unsubscribeByToken(trimmed);
    if (!subscriber) {
      error = "This unsubscribe link is invalid or has already been used.";
    } else {
      email = subscriber.email;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not process unsubscribe.";
  }

  return (
    <main className="sarjan-newsletter-unsub">
      <div className="sarjan-newsletter-unsub-card">
        <h1>{error ? "Unsubscribe" : "You are unsubscribed"}</h1>
        {error ? (
          <p>{error}</p>
        ) : (
          <p>
            <strong>{email}</strong> will no longer receive Sarjan Textiles
            newsletter emails.
          </p>
        )}
        <Link href="/">Back to Sarjan Textiles</Link>
      </div>
    </main>
  );
}
