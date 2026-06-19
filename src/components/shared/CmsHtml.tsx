import {
  cmsSanitizedHasBlockContent,
  sanitizeCmsHtml,
  unwrapSingleInlineParagraph,
} from "@/lib/cms-html";

type Props = {
  html: string;
  className?: string;
  as?: "span" | "div" | "p" | "h2" | "h3" | "h4" | "h6";
};

export function CmsHtml({ html, className, as: Tag = "span" }: Props) {
  const clean = sanitizeCmsHtml(html);
  if (!clean) return null;

  const hasBlock = cmsSanitizedHasBlockContent(clean);
  const TagName =
    hasBlock || (Tag === "p" && /<p[\s>]/i.test(clean)) ? "div" : Tag;
  const innerHtml =
    !hasBlock && TagName !== "div" ? unwrapSingleInlineParagraph(clean) : clean;

  return (
    <TagName
      className={
        className ? `cms-html-content ${className}` : "cms-html-content"
      }
      dangerouslySetInnerHTML={{ __html: innerHtml }}
    />
  );
}
