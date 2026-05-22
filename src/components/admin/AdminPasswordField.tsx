"use client";

import { useId, useState } from "react";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
  required?: boolean;
  disabled?: boolean;
};

export function AdminPasswordField({
  id: idProp,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  required,
  disabled,
}: Props) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [visible, setVisible] = useState(false);

  return (
    <fieldset className="sarjan-admin-account-field sarjan-admin-password-field">
      <label className="body-title-2 d-block mb-1" htmlFor={id}>
        {label}
      </label>
      <div className="sarjan-admin-password-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className="form-control"
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          minLength={minLength}
          required={required}
          disabled={disabled}
        />
        <button
          type="button"
          className={`sarjan-admin-password-toggle${visible ? " is-visible" : ""}`}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible((v) => !v)}
        >
          <i className="icon-eye-hide-line" aria-hidden />
        </button>
      </div>
    </fieldset>
  );
}
