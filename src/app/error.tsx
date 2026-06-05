"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container flat-spacing text-center">
      <h1 className="heading mb_16">Something went wrong</h1>
      <p className="text-secondary mb_24">
        Please try again or return to the homepage.
      </p>
      <div className="d-flex justify-content-center gap-3 flex-wrap">
        <button type="button" className="tf-button style-1" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="tf-button btn-line">
          Go home
        </Link>
      </div>
    </div>
  );
}
