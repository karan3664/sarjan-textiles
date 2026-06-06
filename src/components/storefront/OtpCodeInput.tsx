"use client";

import { useCallback, useEffect, useId, useRef } from "react";

type OtpCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  focusTrigger?: string | number | boolean;
  label?: string;
  disabled?: boolean;
};

/** Tap-friendly OTP boxes with a real input layered on top (mobile keyboard friendly). */
export function OtpCodeInput({
  value,
  onChange,
  length = 6,
  autoFocus = false,
  focusTrigger,
  label = "Verification code",
  disabled = false,
}: OtpCodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const focusInput = useCallback(() => {
    if (disabled) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
  }, [disabled]);

  useEffect(() => {
    if (disabled) return;
    if (!autoFocus && focusTrigger === undefined) return;
    const timer = window.setTimeout(focusInput, 320);
    return () => window.clearTimeout(timer);
  }, [autoFocus, disabled, focusInput, focusTrigger]);

  return (
    <div className="sarjan-otp-code-field">
      <label htmlFor={id} className="sarjan-visually-hidden">
        {label}
      </label>
      <div
        className="sarjan-otp-code-boxes"
        role="group"
        aria-label={label}
        onPointerDown={(event) => {
          if (disabled) return;
          event.preventDefault();
          focusInput();
        }}
      >
        {Array.from({ length }).map((_, index) => {
          const filled = index < value.length;
          const active = !disabled && index === value.length;
          return (
            <div
              key={index}
              className={[
                "sarjan-otp-code-box",
                filled ? "is-filled" : "",
                active ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden
            >
              {value[index] ?? ""}
            </div>
          );
        })}
        <input
          ref={inputRef}
          id={id}
          className="sarjan-otp-code-input"
          type="tel"
          inputMode="numeric"
          autoComplete="one-time-code"
          enterKeyHint="done"
          maxLength={length}
          value={value}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.value.replace(/\D/g, "").slice(0, length))
          }
        />
      </div>
    </div>
  );
}
