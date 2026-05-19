"use client";

import { useCallback } from "react";

type Props = {
  shareUrl: string;
  title: string;
  description?: string;
};

export function BlogShareBar({ shareUrl, title, description = "" }: Props) {
  const encU = encodeURIComponent(shareUrl);
  const encT = encodeURIComponent(title);
  const encD = encodeURIComponent(description || title);

  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encU}`;
  const twitter = `https://twitter.com/intent/tweet?url=${encU}&text=${encT}`;
  const pinterest = `https://www.pinterest.com/pin/create/button/?url=${encU}&description=${encD}`;

  const shareNativeOrCopy = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || title,
          url: shareUrl,
        });
        return;
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      window.alert("Post link copied to clipboard.");
    } catch {
      window.prompt("Copy this link:", shareUrl);
    }
  }, [description, shareUrl, title]);

  return (
    <ul className="tf-social-icon style-1">
      <li>
        <a
          href={facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="social-facebook"
          aria-label="Share on Facebook"
        >
          <i className="icon icon-fb" />
        </a>
      </li>
      <li>
        <a
          href={twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="social-twiter"
          aria-label="Share on X"
        >
          <i className="icon icon-x" />
        </a>
      </li>
      <li>
        <a
          href={pinterest}
          target="_blank"
          rel="noopener noreferrer"
          className="social-pinterest"
          aria-label="Share on Pinterest"
        >
          <i className="icon icon-pinterest" />
        </a>
      </li>
      <li>
        <button
          type="button"
          className="social-instagram sarjan-blog-share-native"
          aria-label="Share or copy link"
          onClick={shareNativeOrCopy}
        >
          <i className="icon icon-instagram" />
        </button>
      </li>
    </ul>
  );
}
