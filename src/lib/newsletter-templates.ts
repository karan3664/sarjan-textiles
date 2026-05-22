import { escapeHtml, plainTextToEmailHtml } from "@/lib/email-template";

export type NewsletterTemplateField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "url";
  placeholder?: string;
  defaultValue: string;
  required?: boolean;
};

export type NewsletterTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  eyebrow: string;
  defaultSubject: string;
  fields: NewsletterTemplateField[];
  renderBody: (vars: Record<string, string>) => string;
};

function p(text: string) {
  return `<p style="margin:0 0 16px;color:#4d4843;line-height:1.65;font-family:Arial,Helvetica,sans-serif;">${plainTextToEmailHtml(text)}</p>`;
}

function h2(text: string) {
  return `<h2 style="margin:0 0 12px;font-size:18px;line-height:1.4;color:#141414;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(text)}</h2>`;
}

function cta(text: string, url: string) {
  const label = escapeHtml(text);
  const href = escapeHtml(url);
  return `<p style="margin:22px 0 8px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
  <a href="${href}" style="display:inline-block;padding:14px 28px;background:#8b1e2d;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;font-size:15px;">${label}</a>
</p>`;
}

function heroImage(url: string, alt: string) {
  if (!url.trim()) return "";
  return `<p style="margin:0 0 20px;text-align:center;">
  <img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" width="552" style="max-width:100%;height:auto;border-radius:12px;border:1px solid #e8e2d9;" />
</p>`;
}

function card(inner: string) {
  return `<div style="margin:0 0 18px;padding:18px 16px;background:#fbfaf7;border-radius:10px;border:1px solid #e8e2d9;">${inner}</div>`;
}

const baseFields: NewsletterTemplateField[] = [
  {
    key: "headline",
    label: "Headline",
    type: "text",
    defaultValue: "Updates from Sarjan Textiles",
    required: true,
  },
  {
    key: "subheadline",
    label: "Subheadline",
    type: "text",
    defaultValue: "B2B collections, MOQ-friendly programs, and dispatch news",
  },
  {
    key: "body",
    label: "Main message",
    type: "textarea",
    defaultValue:
      "We are sharing the latest from our catalog — new prints, reliable repeat programs, and support for your wholesale planning.",
    required: true,
  },
  {
    key: "cta_text",
    label: "Button text",
    type: "text",
    defaultValue: "Browse catalog",
  },
  {
    key: "cta_url",
    label: "Button link",
    type: "url",
    defaultValue: "https://sarjantextiles.com/products",
  },
  {
    key: "image_url",
    label: "Hero image URL (optional)",
    type: "url",
    defaultValue: "",
  },
];

function defaults(extra: Partial<Record<string, string>> = {}) {
  const out: Record<string, string> = {};
  for (const field of baseFields) out[field.key] = field.defaultValue;
  return { ...out, ...extra };
}

function mergeVars(
  template: NewsletterTemplate,
  input: Record<string, string>,
): Record<string, string> {
  const base = defaults(
    template.fields.reduce<Record<string, string>>((acc, f) => {
      acc[f.key] = f.defaultValue;
      return acc;
    }, {}),
  );
  const merged: Record<string, string> = { ...base } as Record<string, string>;
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") merged[key] = value;
  }
  return merged;
}

export const NEWSLETTER_TEMPLATES: NewsletterTemplate[] = [
  {
    id: "classic-announcement",
    name: "Classic announcement",
    description: "Logo, headline, message, and one clear CTA.",
    category: "General",
    eyebrow: "Newsletter",
    defaultSubject: "News from Sarjan Textiles",
    fields: baseFields,
    renderBody: (v) =>
      [
        heroImage(v.image_url, v.headline),
        h2(v.headline),
        p(v.subheadline),
        p(v.body),
        cta(v.cta_text, v.cta_url),
      ].join(""),
  },
  {
    id: "new-collection",
    name: "New collection launch",
    description: "Highlight a fresh catalog drop with hero image.",
    category: "Collections",
    eyebrow: "New collection",
    defaultSubject: "New collection now live — Sarjan Textiles",
    fields: baseFields,
    renderBody: (v) =>
      [
        heroImage(v.image_url, "New collection"),
        h2(v.headline),
        p(v.subheadline),
        card(`${p(v.body)}${cta(v.cta_text, v.cta_url)}`),
      ].join(""),
  },
  {
    id: "wholesale-offer",
    name: "Wholesale / MOQ offer",
    description: "B2B-focused offer with highlighted terms.",
    category: "B2B",
    eyebrow: "Wholesale program",
    defaultSubject: "Wholesale update for your buying team",
    fields: [
      ...baseFields,
      {
        key: "offer_note",
        label: "Offer highlight",
        type: "text",
        defaultValue: "MOQ-friendly sets · 90-day credit for approved partners",
      },
    ],
    renderBody: (v) =>
      [
        h2(v.headline),
        p(v.subheadline),
        card(
          `<p style="margin:0 0 8px;font-weight:700;color:#8b1e2d;">${escapeHtml(v.offer_note)}</p>${p(v.body)}`,
        ),
        cta(v.cta_text, v.cta_url),
      ].join(""),
  },
  {
    id: "festival-greeting",
    name: "Festival greeting",
    description: "Warm seasonal note with soft styling.",
    category: "Seasonal",
    eyebrow: "Season's greetings",
    defaultSubject: "Warm wishes from Sarjan Textiles",
    fields: baseFields,
    renderBody: (v) =>
      [
        heroImage(v.image_url, "Festival"),
        h2(v.headline),
        p(v.body),
        p(v.subheadline),
      ].join(""),
  },
  {
    id: "minimal-update",
    name: "Minimal update",
    description: "Short letter-style note without heavy blocks.",
    category: "General",
    eyebrow: "Update",
    defaultSubject: "A quick update from Sarjan Textiles",
    fields: baseFields.filter((f) => f.key !== "image_url"),
    renderBody: (v) => [h2(v.headline), p(v.body), p(v.subheadline)].join(""),
  },
  {
    id: "product-highlight",
    name: "Product highlight",
    description: "Single hero product or category focus.",
    category: "Products",
    eyebrow: "Featured",
    defaultSubject: "Featured styles this week",
    fields: [
      ...baseFields,
      {
        key: "product_name",
        label: "Product / range name",
        type: "text",
        defaultValue: "Ajrakh & block-print shirts",
      },
    ],
    renderBody: (v) =>
      [
        heroImage(v.image_url, v.product_name),
        h2(v.headline),
        p(`Featured: ${v.product_name}. ${v.body}`),
        cta(v.cta_text, v.cta_url),
      ].join(""),
  },
  {
    id: "credit-reminder",
    name: "B2B credit reminder",
    description: "Approved partner credit workflow reminder.",
    category: "B2B",
    eyebrow: "Partner services",
    defaultSubject: "Your Sarjan Textiles partner account",
    fields: baseFields,
    renderBody: (v) =>
      [
        h2(v.headline),
        p(v.subheadline),
        p(v.body),
        cta("Open my account", "https://sarjantextiles.com/login"),
      ].join(""),
  },
  {
    id: "catalog-launch",
    name: "Catalog launch",
    description: "Drive traffic to full catalog browse.",
    category: "Collections",
    eyebrow: "Catalog",
    defaultSubject: "Explore the full Sarjan catalog",
    fields: baseFields,
    renderBody: (v) =>
      [
        h2(v.headline),
        p(v.body),
        cta(v.cta_text || "View catalog", v.cta_url),
        heroImage(v.image_url, "Catalog"),
      ].join(""),
  },
  {
    id: "dispatch-update",
    name: "Dispatch & logistics",
    description: "Order tracking and dispatch communication.",
    category: "Operations",
    eyebrow: "Dispatch update",
    defaultSubject: "Dispatch & order tracking update",
    fields: baseFields,
    renderBody: (v) =>
      [
        h2(v.headline),
        p(v.body),
        cta("Track orders", "https://sarjantextiles.com/order-tracking"),
      ].join(""),
  },
  {
    id: "thank-you",
    name: "Thank you",
    description: "Gratitude note to subscribers and partners.",
    category: "General",
    eyebrow: "Thank you",
    defaultSubject: "Thank you for staying connected",
    fields: baseFields.filter((f) => f.key !== "cta_url"),
    renderBody: (v) => [h2(v.headline), p(v.body), p(v.subheadline)].join(""),
  },
  {
    id: "event-invite",
    name: "Event / visit invite",
    description: "Invite buyers to visit booth or meeting.",
    category: "Events",
    eyebrow: "Invitation",
    defaultSubject: "You're invited — Sarjan Textiles",
    fields: [
      ...baseFields,
      {
        key: "event_details",
        label: "Event details",
        type: "textarea",
        defaultValue: "Date, venue, and contact person details here.",
      },
    ],
    renderBody: (v) =>
      [
        h2(v.headline),
        p(v.subheadline),
        card(p(v.event_details)),
        p(v.body),
        cta(v.cta_text, v.cta_url),
      ].join(""),
  },
  {
    id: "two-column-tips",
    name: "Tips & insights",
    description: "Educational note for retailers.",
    category: "Education",
    eyebrow: "Insights",
    defaultSubject: "Textile buying tips from Sarjan",
    fields: [
      ...baseFields,
      {
        key: "tip_one",
        label: "Tip 1",
        type: "text",
        defaultValue: "Plan MOQ by size curve early in the season.",
      },
      {
        key: "tip_two",
        label: "Tip 2",
        type: "text",
        defaultValue: "Block prints need shade-wise batch planning.",
      },
    ],
    renderBody: (v) =>
      [
        h2(v.headline),
        card(
          `<p style="margin:0 0 10px;"><strong>Tip 1:</strong> ${escapeHtml(v.tip_one)}</p><p style="margin:0;"><strong>Tip 2:</strong> ${escapeHtml(v.tip_two)}</p>`,
        ),
        p(v.body),
      ].join(""),
  },
  {
    id: "image-hero",
    name: "Image hero",
    description: "Large visual-first layout.",
    category: "Visual",
    eyebrow: "Lookbook",
    defaultSubject: "New lookbook — Sarjan Textiles",
    fields: baseFields,
    renderBody: (v) =>
      [
        heroImage(v.image_url, v.headline),
        h2(v.headline),
        p(v.body),
        cta(v.cta_text, v.cta_url),
      ].join(""),
  },
  {
    id: "process-story",
    name: "Craft & process",
    description: "Share process / heritage story.",
    category: "Brand",
    eyebrow: "Our process",
    defaultSubject: "The craft behind Sarjan Textiles",
    fields: baseFields,
    renderBody: (v) =>
      [
        h2(v.headline),
        p(v.body),
        cta("See our process", "https://sarjantextiles.com/process"),
      ].join(""),
  },
  {
    id: "inquiry-cta",
    name: "Inquiry / contact",
    description: "Drive inquiries for bulk orders.",
    category: "B2B",
    eyebrow: "Work with us",
    defaultSubject: "Plan your next bulk program",
    fields: baseFields,
    renderBody: (v) =>
      [
        h2(v.headline),
        p(v.body),
        cta("Send inquiry", "https://sarjantextiles.com/inquiry"),
      ].join(""),
  },
  {
    id: "plain-letter",
    name: "Plain letter",
    description: "Simple personal letter — no CTA button.",
    category: "General",
    eyebrow: "Letter",
    defaultSubject: "Message from Sarjan Textiles",
    fields: baseFields.filter(
      (f) => !["cta_text", "cta_url", "image_url"].includes(f.key),
    ),
    renderBody: (v) =>
      [
        p(`Dear partner,`),
        p(v.body),
        p(v.subheadline),
        p(`— Sarjan Textiles team`),
      ].join(""),
  },
];

export function getNewsletterTemplate(id: string) {
  return NEWSLETTER_TEMPLATES.find((t) => t.id === id) ?? null;
}

export type NewsletterTemplateMeta = Omit<NewsletterTemplate, "renderBody">;

export function listNewsletterTemplatesForAdmin(): NewsletterTemplateMeta[] {
  return NEWSLETTER_TEMPLATES.map(({ renderBody: _omit, ...meta }) => {
    void _omit;
    return meta;
  });
}

export function newsletterTemplateDefaults(id: string) {
  const template = getNewsletterTemplate(id);
  if (!template) return {};
  return mergeVars(template, {});
}

export function renderNewsletterTemplateBody(
  templateId: string,
  input: Record<string, string>,
) {
  const template = getNewsletterTemplate(templateId);
  if (!template) throw new Error("Unknown newsletter template");
  const vars = mergeVars(template, input);
  return { template, vars, html: template.renderBody(vars) };
}

export function newsletterUnsubscribeFooterHtml(unsubscribeUrl: string) {
  const href = escapeHtml(unsubscribeUrl);
  return `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e8e2d9;font-size:12px;line-height:1.5;color:#6f6a64;text-align:center;font-family:Arial,Helvetica,sans-serif;">
  You received this because you subscribed on sarjantextiles.com.<br />
  <a href="${href}" style="color:#8b1e2d;text-decoration:underline;">Unsubscribe</a> from future newsletters.
</p>`;
}
