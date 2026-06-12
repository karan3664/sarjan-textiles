import sanitizeHtml from "sanitize-html";

/** Strip HTML — keeps emoji and Unicode text (UTF-8 safe). */
export function sanitizeUserText(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  }).trim();
}

export type UserTextValidation = {
  max: number;
  min?: number;
  label?: string;
};

export function validateUserText(
  value: string,
  options: UserTextValidation,
): { ok: true; value: string } | { ok: false; error: string } {
  const clean = sanitizeUserText(value);
  const label = options.label ?? "Text";

  if (options.min !== undefined && clean.length < options.min) {
    return { ok: false, error: `${label} is required` };
  }
  if (clean.length > options.max) {
    return {
      ok: false,
      error: `${label} is too long (max ${options.max} characters)`,
    };
  }
  return { ok: true, value: clean };
}

export const USER_TEXT_LIMITS = {
  blogCommentBody: 4000,
  blogCommentName: 120,
  blogCommentEmail: 254,
  testimonialQuote: 2000,
  testimonialAuthor: 120,
  testimonialProduct: 200,
  feedbackMessage: 4000,
  feedbackCompany: 200,
  feedbackContact: 120,
  adminReply: 4000,
} as const;
