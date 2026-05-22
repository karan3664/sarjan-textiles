"use client";

import { useEffect, useRef } from "react";

/** Official Instagram embed when Graph API / scrape returns no posts. */
export function InstagramProfileEmbed({ profileUrl }: { profileUrl: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.innerHTML = "";

    const block = document.createElement("blockquote");
    block.className = "instagram-media";
    block.setAttribute("data-instgrm-permalink", profileUrl);
    block.setAttribute("data-instgrm-version", "14");
    block.style.background = "#fff";
    block.style.border = "0";
    block.style.margin = "0 auto";
    block.style.maxWidth = "100%";
    block.style.minWidth = "280px";
    block.style.width = "100%";

    const link = document.createElement("a");
    link.href = profileUrl;
    link.rel = "noopener noreferrer";
    link.target = "_blank";
    link.textContent = "View @sarjantextiles on Instagram";
    block.appendChild(link);
    host.appendChild(block);

    const scriptId = "sarjan-instagram-embed-js";
    const run = () => {
      const instgrm = (
        window as Window & { instgrm?: { Embeds?: { process: () => void } } }
      ).instgrm;
      instgrm?.Embeds?.process();
    };

    if (document.getElementById(scriptId)) {
      run();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = "https://www.instagram.com/embed.js";
    script.onload = run;
    document.body.appendChild(script);

    return () => {
      host.innerHTML = "";
    };
  }, [profileUrl]);

  return (
    <div
      ref={hostRef}
      className="sarjan-instagram-embed-fallback"
      style={{ minHeight: 320 }}
    />
  );
}
