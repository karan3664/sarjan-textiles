"use client";

import { useStorefrontTheme } from "./StorefrontThemeProvider";
import type { ThemePreference } from "@/lib/storefront-theme";

const OPTIONS: Array<{
  value: ThemePreference;
  label: string;
}> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function ThemeGlyph({ preference }: { preference: ThemePreference }) {
  if (preference === "light") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle
          cx="12"
          cy="12"
          r="4.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (preference === "dark") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M20 14.5A7.5 7.5 0 0 1 9.5 4 6.5 6.5 0 1 0 20 14.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9 18.5h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ThemeToggle({
  className = "",
  variant = "select",
}: {
  className?: string;
  /** `select` for menus; `icon` cycles system → light → dark. */
  variant?: "select" | "icon";
}) {
  const { preference, resolvedTheme, setPreference } = useStorefrontTheme();

  if (variant === "icon") {
    const nextIndex =
      (OPTIONS.findIndex((option) => option.value === preference) + 1) %
      OPTIONS.length;
    const next = OPTIONS[nextIndex];
    const current = OPTIONS.find((option) => option.value === preference)!;

    return (
      <button
        type="button"
        className={`sarjan-theme-toggle sarjan-theme-toggle--icon ${className}`.trim()}
        onClick={() => setPreference(next.value)}
        aria-label={`Theme: ${current.label}. Switch to ${next.label}.`}
        title={`${current.label} theme`}
        data-resolved-theme={resolvedTheme}
      >
        <ThemeGlyph preference={preference} />
      </button>
    );
  }

  return (
    <label
      className={`sarjan-theme-select-wrap ${className}`.trim()}
      aria-label="Color theme"
    >
      <select
        className="form-select form-select-sm sarjan-theme-select"
        value={preference}
        onChange={(event) =>
          setPreference(event.target.value as ThemePreference)
        }
        data-resolved-theme={resolvedTheme}
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
