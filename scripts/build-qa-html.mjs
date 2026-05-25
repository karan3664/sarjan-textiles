#!/usr/bin/env node
/** Builds public/qa-testing-guide.html from docs/QA-TESTING-GUIDE.md */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mdPath = path.join(root, "docs/QA-TESTING-GUIDE.md");
const outPath = path.join(root, "public/qa-testing-guide.html");

const FRONTEND = "https://sarjantextiles.com/";
const ADMIN = "https://sarjantextiles.com/admin/";
const ADMIN_EMAIL = "admin@sarjantextiles.com";
const ADMIN_PASS = "Sarjantex@2024";

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function inline(t) {
  return t
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function mdTableToHtml(lines) {
  const rows = lines.filter((l) => l.includes("|"));
  if (rows.length < 2) return `<pre>${lines.join("\n")}</pre>`;
  const parse = (r) =>
    r
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
  const header = parse(rows[0]);
  const body = rows.slice(2).map(parse);
  let h = "<table><thead><tr>";
  for (const c of header) h += `<th>${inline(c)}</th>`;
  h += "</tr></thead><tbody>";
  for (const row of body) {
    h += "<tr>";
    for (const c of row) h += `<td>${inline(c)}</td>`;
    h += "</tr>";
  }
  return h + "</tbody></table>";
}

function convert(mdText) {
  const lines = mdText.split("\n");
  const out = [];
  let i = 0;
  let inCode = false;
  let codeBuf = [];
  let tableBuf = [];

  const flushTable = () => {
    if (tableBuf.length) {
      out.push(mdTableToHtml(tableBuf));
      tableBuf = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      flushTable();
      if (inCode) {
        out.push(`<pre class="code-block">${codeBuf.join("\n")}</pre>`);
        codeBuf = [];
        inCode = false;
      } else inCode = true;
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line.replace(/</g, "&lt;"));
      i++;
      continue;
    }
    if (line.includes("|") && line.trim().startsWith("|")) {
      tableBuf.push(line);
      i++;
      continue;
    }
    flushTable();

    if (line.startsWith("## ")) {
      out.push(`<h2 id="${slug(line.slice(3).trim())}">${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      out.push(`<h3 id="${slug(line.slice(4).trim())}">${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith("#### ")) {
      out.push(`<h4>${inline(line.slice(5))}</h4>`);
    } else if (line.startsWith("- ")) {
      out.push(`<li>${inline(line.slice(2))}</li>`);
    } else if (/^\d+\.\s/.test(line)) {
      out.push(`<li>${inline(line.replace(/^\d+\.\s/, ""))}</li>`);
    } else if (line.trim() === "---") {
      out.push("<hr />");
    } else if (line.trim() === "") {
      out.push("");
    } else {
      out.push(`<p>${inline(line)}</p>`);
    }
    i++;
  }
  flushTable();
  return out.join("\n").replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
}

const md = fs.readFileSync(mdPath, "utf8");
const body = convert(md.replace(/^# .+\n\n/, ""));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Sarjan Textiles — QA Testing Guide</title>
  <style>
    :root {
      --bg: #0f1419; --surface: #1a2332; --surface2: #243044; --text: #e8edf4; --muted: #9aa8bc;
      --accent: #c45c3e; --accent2: #e8a87c; --green: #3d9a6a; --blue: #4a90d9; --purple: #8b6fd4;
      --yellow: #d4a017; --radius: 12px;
      --font: "Segoe UI", system-ui, -apple-system, sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: var(--font); background: linear-gradient(160deg, #0f1419 0%, #1a1a2e 40%, #16213e 100%); color: var(--text); line-height: 1.55; }
    .hero { background: linear-gradient(135deg, #c45c3e 0%, #8b3a2a 50%, #1a2332 100%); padding: 2.5rem 1.5rem 2rem; text-align: center; border-bottom: 4px solid var(--accent2); }
    .hero h1 { margin: 0 0 0.5rem; font-size: clamp(1.5rem, 4vw, 2.25rem); }
    .hero p { margin: 0; opacity: 0.95; max-width: 640px; margin-inline: auto; }
    .hero-badges { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-top: 1rem; }
    .badge { background: rgba(0,0,0,0.25); padding: 0.35rem 0.85rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
    .launch { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; margin-top: 1.5rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.85rem 1.5rem; border-radius: var(--radius); font-weight: 700; text-decoration: none; font-size: 1rem; transition: transform 0.15s, box-shadow 0.15s; }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.35); }
    .btn-store { background: var(--blue); color: #fff; }
    .btn-admin { background: var(--green); color: #fff; }
    .cred-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; max-width: 1100px; margin: -1.5rem auto 2rem; padding: 0 1rem; position: relative; z-index: 2; }
    .cred-card { background: var(--surface); border: 1px solid var(--surface2); border-radius: var(--radius); padding: 1.25rem; box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
    .cred-card h3 { margin: 0 0 0.75rem; font-size: 1rem; color: var(--accent2); }
    .cred-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.9rem; }
    .cred-label { color: var(--muted); min-width: 5rem; }
    .cred-value { font-family: ui-monospace, monospace; background: var(--surface2); padding: 0.2rem 0.5rem; border-radius: 6px; word-break: break-all; color: var(--accent2); text-decoration: none; }
    a.cred-value:hover { text-decoration: underline; }
    .warn { background: rgba(212, 160, 23, 0.15); border: 1px solid var(--yellow); color: #f5e6b8; padding: 0.75rem 1rem; border-radius: var(--radius); font-size: 0.85rem; margin-top: 0.75rem; }
    .layout { display: grid; grid-template-columns: 260px 1fr; gap: 0; max-width: 1400px; margin: 0 auto; padding: 0 1rem 3rem; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .nav { position: static !important; max-height: none !important; } }
    .nav { position: sticky; top: 1rem; align-self: start; max-height: calc(100vh - 2rem); overflow-y: auto; background: var(--surface); border-radius: var(--radius); padding: 1rem; border: 1px solid var(--surface2); margin-top: 1rem; }
    .nav h4 { margin: 0 0 0.75rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
    .nav a { display: block; color: var(--muted); text-decoration: none; font-size: 0.82rem; padding: 0.35rem 0.5rem; border-radius: 6px; margin-bottom: 2px; }
    .nav a:hover { background: var(--surface2); color: var(--text); }
    .content { background: var(--surface); border-radius: var(--radius); padding: 1.5rem 2rem 2.5rem; margin-top: 1rem; border: 1px solid var(--surface2); min-width: 0; }
    .content h2 { color: var(--accent2); border-bottom: 2px solid var(--accent); padding-bottom: 0.35rem; margin-top: 2rem; font-size: 1.35rem; }
    .content h2:first-child { margin-top: 0; }
    .content h3 { color: #b8d4f0; margin-top: 1.5rem; font-size: 1.1rem; }
    .content table { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin: 1rem 0; display: block; overflow-x: auto; }
    .content th { background: var(--purple); color: #fff; text-align: left; padding: 0.55rem 0.65rem; white-space: nowrap; }
    .content td { border-bottom: 1px solid var(--surface2); padding: 0.5rem 0.65rem; vertical-align: top; }
    .content tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
    .content code { background: var(--surface2); padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.85em; }
    .code-block { background: #0d1117; border: 1px solid var(--surface2); padding: 1rem; border-radius: var(--radius); overflow-x: auto; font-size: 0.8rem; color: #c9d1d9; }
    .content ul { padding-left: 1.25rem; }
    .footer-note { text-align: center; padding: 2rem 1rem; color: var(--muted); font-size: 0.85rem; }
  </style>
</head>
<body>
  <header class="hero" id="top">
    <h1>Sarjan Textiles — QA Testing Guide</h1>
    <p>Complete frontend &amp; admin testing handbook · Version 1.0</p>
    <div class="hero-badges"><span class="badge">B2B Wholesale</span><span class="badge">Confidential — Testers Only</span></div>
    <div class="launch">
      <a class="btn btn-store" href="${FRONTEND}" target="_blank" rel="noopener">Open Frontend</a>
      <a class="btn btn-admin" href="${ADMIN}" target="_blank" rel="noopener">Open Admin Panel</a>
    </div>
  </header>
  <div class="cred-grid">
    <div class="cred-card"><h3>Production URLs</h3>
      <div class="cred-row"><span class="cred-label">Frontend</span><a class="cred-value" href="${FRONTEND}" target="_blank">${FRONTEND}</a></div>
      <div class="cred-row"><span class="cred-label">Admin</span><a class="cred-value" href="${ADMIN}" target="_blank">${ADMIN}</a></div>
    </div>
    <div class="cred-card"><h3>Admin login</h3>
      <div class="cred-row"><span class="cred-label">Email</span><span class="cred-value">${ADMIN_EMAIL}</span></div>
      <div class="cred-row"><span class="cred-label">Password</span><span class="cred-value">${ADMIN_PASS}</span></div>
      <p class="warn">Keep this URL private. Do not paste passwords in public bug tickets.</p>
    </div>
    <div class="cred-card"><h3>B2B client login</h3>
      <p style="margin:0;font-size:0.9rem;color:var(--muted)">Register at <a href="${FRONTEND}register">${FRONTEND}register</a> → Admin approves in <strong>Customers</strong> → then login at <a href="${FRONTEND}login">${FRONTEND}login</a>.</p>
    </div>
  </div>
  <div class="layout">
    <nav class="nav"><h4>Contents</h4>
      <a href="#1-purpose-of-this-document">1. Purpose</a>
      <a href="#2-what-is-being-tested">2. Overview</a>
      <a href="#3-test-environment-and-access">3. Access</a>
      <a href="#4-bug-reporting">4. Bugs</a>
      <a href="#5-storefront-frontend-site-map-and-features">5. Storefront</a>
      <a href="#6-admin-panel-backend-overview">6. Admin</a>
      <a href="#7-admin-modules-detailed-test-cases">7. Admin tests</a>
      <a href="#8-end-to-end-flows-cross-system">8. E2E</a>
      <a href="#12-test-execution-plan-suggested-order">12. Plan</a>
      <a href="#13-sign-off-checklist">13. Sign-off</a>
    </nav>
    <main class="content">${body}</main>
  </div>
  <p class="footer-note">Sarjan Textiles QA Guide · <a href="${FRONTEND}">sarjantextiles.com</a></p>
</body>
</html>`;

fs.writeFileSync(outPath, html);
console.log("Built", outPath);
