/** Client-safe launch newsletter ids — keep free of mailer / nodemailer imports. */
export const LAUNCH_NEWSLETTER_TEMPLATE_ID = "website-launch";

const SILENT_NEWSLETTER_SOURCES = new Set(["launch", "inquiry", "register"]);

export function isSilentNewsletterSource(source: string) {
  return SILENT_NEWSLETTER_SOURCES.has(source);
}
