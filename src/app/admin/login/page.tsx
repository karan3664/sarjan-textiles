export const dynamic = "force-dynamic";

const LOGIN_ERRORS: Record<string, string> = {
  invalid: "Invalid admin credentials",
  missing: "Enter email and password",
};

const DEFAULT_EMAIL = "admin@sarjantextiles.com";

const PASSWORD_TOGGLE_SCRIPT = `(function () {
  var btn = document.querySelector("[data-admin-password-toggle]");
  var input = document.getElementById("admin-login-password");
  if (!btn || !input) return;
  var eyeShow = btn.querySelector(".sarjan-admin-login-eye-show");
  var eyeHide = btn.querySelector(".sarjan-admin-login-eye-hide");
  function setVisible(show) {
    input.type = show ? "text" : "password";
    btn.setAttribute("aria-pressed", show ? "true" : "false");
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    if (eyeShow) eyeShow.style.display = show ? "none" : "block";
    if (eyeHide) eyeHide.style.display = show ? "block" : "none";
  }
  btn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    setVisible(input.type === "password");
  });
  btn.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setVisible(input.type === "password");
    }
  });
})();`;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const errorCode = params.error?.trim() ?? "";
  const message = errorCode ? (LOGIN_ERRORS[errorCode] ?? "Login failed") : "";
  const nextPath = params.next?.startsWith("/admin") ? params.next : "";

  return (
    <main className="sarjan-admin-login">
      <form
        className="sarjan-admin-login-card"
        action="/api/admin/auth/login-form"
        method="post"
      >
        {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

        <img src="/sarjan-assets/sarjan-logo-icon.png" alt="Sarjan Textiles" />
        <h3>Admin Login</h3>
        <p>Protected Sarjan Textiles operating system.</p>

        <input
          name="email"
          type="email"
          placeholder="Admin email"
          defaultValue={DEFAULT_EMAIL}
          autoComplete="username"
          required
        />

        <div className="sarjan-admin-login-password">
          <input
            id="admin-login-password"
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            required
          />
          <span
            role="button"
            tabIndex={0}
            className="sarjan-admin-login-password-toggle"
            data-admin-password-toggle
            aria-label="Show password"
            aria-pressed="false"
          >
            <svg
              className="sarjan-admin-login-eye-show"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg
              className="sarjan-admin-login-eye-hide"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              style={{ display: "none" }}
            >
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          </span>
        </div>

        <p className="sarjan-admin-login-hint text-caption-1 text-secondary">
          Local: use <code className="text-1">ADMIN_PASSWORD</code> in{" "}
          <code className="text-1">.env.local</code> (default{" "}
          <code className="text-1">admin123</code>).
        </p>

        {message ? (
          <div
            className="sarjan-admin-login-error"
            role="alert"
            aria-live="assertive"
          >
            {message}
          </div>
        ) : null}

        <button type="submit">Login</button>
      </form>

      <script dangerouslySetInnerHTML={{ __html: PASSWORD_TOGGLE_SCRIPT }} />
    </main>
  );
}
