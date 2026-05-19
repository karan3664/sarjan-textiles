"use client";

import { useEffect, useState } from "react";

export function AdminAccountClient() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/account", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        email: string;
        name: string;
        role: string;
      };
      setEmail(data.email);
      setName(data.name);
      setRole(data.role);
    })();
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "profile", name: name.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg({ type: "err", text: data.error ?? "Could not save profile." });
        return;
      }
      setMsg({ type: "ok", text: "Display name updated. Session refreshed." });
      queueMicrotask(() => {
        window.dispatchEvent(new Event("sarjan-admin-session-updated"));
      });
    } catch {
      setMsg({ type: "err", text: "Network error." });
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirmPassword) {
      setMsg({
        type: "err",
        text: "New password and confirmation do not match.",
      });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "password",
          currentPassword,
          newPassword,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg({
          type: "err",
          text: data.error ?? "Could not change password.",
        });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMsg({
        type: "ok",
        text: "Password updated. Keep this tab secure.",
      });
      queueMicrotask(() => {
        window.dispatchEvent(new Event("sarjan-admin-session-updated"));
      });
    } catch {
      setMsg({ type: "err", text: "Network error." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="row g-4 sarjan-admin-account-page">
      <div className="col-12 col-lg-6">
        <div className="wg-box">
          <h5 className="mb-3">Profile</h5>
          <p className="text-caption-1 text-muted mb-3">
            Signed in as <strong>{email}</strong>
            {role ? (
              <>
                {" "}
                · role: <strong>{role.replaceAll("_", " ")}</strong>
              </>
            ) : null}
          </p>
          <form onSubmit={saveProfile} className="d-grid gap-3">
            <fieldset className="sarjan-admin-account-field">
              <label
                className="body-title-2 d-block mb-1"
                htmlFor="admin-display-name"
              >
                Display name
              </label>
              <input
                id="admin-display-name"
                className="form-control"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                required
                disabled={busy}
              />
            </fieldset>
            <button
              type="submit"
              className="tf-button style-1 w-100"
              disabled={busy}
            >
              Save name
            </button>
          </form>
        </div>
      </div>
      <div className="col-12 col-lg-6">
        <div className="wg-box">
          <h5 className="mb-3">Change password</h5>
          <p className="text-caption-1 text-muted mb-3">
            After changing password, your session stays signed in on this
            browser. On serverless hosts, password overrides are stored in{" "}
            <code>data/admin-profile-overrides.json</code> (gitignored).
          </p>
          <form onSubmit={savePassword} className="d-grid gap-3">
            <fieldset className="sarjan-admin-account-field">
              <label
                className="body-title-2 d-block mb-1"
                htmlFor="admin-current-password"
              >
                Current password
              </label>
              <input
                id="admin-current-password"
                type="password"
                className="form-control"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={busy}
              />
            </fieldset>
            <fieldset className="sarjan-admin-account-field">
              <label
                className="body-title-2 d-block mb-1"
                htmlFor="admin-new-password"
              >
                New password
              </label>
              <input
                id="admin-new-password"
                type="password"
                className="form-control"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
                disabled={busy}
              />
            </fieldset>
            <fieldset className="sarjan-admin-account-field">
              <label
                className="body-title-2 d-block mb-1"
                htmlFor="admin-confirm-password"
              >
                Confirm new password
              </label>
              <input
                id="admin-confirm-password"
                type="password"
                className="form-control"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
                disabled={busy}
              />
            </fieldset>
            <button
              type="submit"
              className="tf-button style-1 w-100"
              disabled={busy}
            >
              Update password
            </button>
          </form>
        </div>
      </div>
      {msg ? (
        <div className="col-12">
          <div
            className={`alert ${msg.type === "ok" ? "alert-success" : "alert-danger"} mb-0`}
            role="status"
          >
            {msg.text}
          </div>
        </div>
      ) : null}
    </div>
  );
}
