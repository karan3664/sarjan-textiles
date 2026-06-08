"use client";

import { useEffect, useState } from "react";

type Unit = { label: string; value: string };

const PLACEHOLDER: Unit[] = [
  { label: "days", value: "--" },
  { label: "hours", value: "--" },
  { label: "minutes", value: "--" },
  { label: "seconds", value: "--" },
];

function pad2(value: number) {
  return String(Math.max(0, value)).padStart(2, "0");
}

function heroUnitsUntil(targetMs: number, now: number): Unit[] | null {
  const diff = targetMs - now;
  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    { label: days === 1 ? "day" : "days", value: pad2(days) },
    { label: hours === 1 ? "hour" : "hours", value: pad2(hours) },
    { label: minutes === 1 ? "minute" : "minutes", value: pad2(minutes) },
    { label: seconds === 1 ? "second" : "seconds", value: pad2(seconds) },
  ];
}

export function LaunchCountdown({ launchAtMs }: { launchAtMs: number }) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    setMounted(true);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (launchAtMs - now <= 0) {
      window.location.replace("/");
    }
  }, [launchAtMs, now, mounted]);

  const units = mounted ? heroUnitsUntil(launchAtMs, now) : PLACEHOLDER;

  if (mounted && !units) {
    return (
      <div className="sarjan-launch-countdown sarjan-launch-countdown--live">
        <p className="sarjan-launch-countdown__live">
          We&apos;re live — opening your wholesale catalog…
        </p>
      </div>
    );
  }

  const displayUnits = units ?? PLACEHOLDER;

  return (
    <div
      className={`sarjan-launch-countdown${mounted ? "" : " is-pending"}`}
      aria-live="polite"
    >
      {displayUnits.map((unit, index) => (
        <div className="sarjan-launch-countdown__unit" key={unit.label}>
          {index > 0 ? (
            <span className="sarjan-launch-countdown__divider" aria-hidden>
              |
            </span>
          ) : null}
          <div className="sarjan-launch-countdown__cell">
            <span className="sarjan-launch-countdown__value">{unit.value}</span>
            <span className="sarjan-launch-countdown__label">{unit.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
