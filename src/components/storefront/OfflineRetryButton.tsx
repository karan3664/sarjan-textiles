"use client";

export function OfflineRetryButton() {
  return (
    <button
      type="button"
      className="sarjan-offline-page__btn sarjan-offline-page__btn--primary"
      onClick={() => window.location.reload()}
    >
      Try again
    </button>
  );
}
