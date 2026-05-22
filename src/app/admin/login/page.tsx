"use client";

import { FormEvent, useState } from "react";
import { AdminGlobalLoader } from "@/components/admin/AdminGlobalLoader";

export default function AdminLoginPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Login failed");
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.assign(next?.startsWith("/admin") ? next : "/admin");
  };

  return (
    <>
      <AdminGlobalLoader />
      <main className="sarjan-admin-login">
        <form className="sarjan-admin-login-card" onSubmit={submit}>
          <img
            src="/sarjan-assets/sarjan-logo-icon.png"
            alt="Sarjan Textiles"
          />
          <h3>Admin Login</h3>
          <p>Protected Sarjan Textiles operating system.</p>
          <input
            name="email"
            type="email"
            placeholder="Admin email"
            defaultValue="admin@sarjantextiles.com"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
          />
          <p className="sarjan-admin-login-hint text-caption-1 text-secondary">
            Local: use the password from{" "}
            <code className="text-1">ADMIN_PASSWORD</code> in{" "}
            <code className="text-1">.env.local</code>. If unset, default is{" "}
            <code className="text-1">admin123</code>.
          </p>
          {message ? (
            <div className="sarjan-admin-login-error">{message}</div>
          ) : null}
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </main>
    </>
  );
}
