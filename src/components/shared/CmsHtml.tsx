import { sanitizeCmsHtml } from "@/lib/cms-html";

type Props = {
  html: string;
  className?: string;
  as?: "span" | "div" | "p" | "h2" | "h3" | "h4" | "h6";
};

export function CmsHtml({ html, className, as: Tag = "span" }: Props) {
  const clean = sanitizeCmsHtml(html);
  if (!clean) return null;
  // Avoid <p><p>...</p></p> — invalid HTML that browsers rewrite before hydration.
  const TagName = Tag === "p" && /<p[\s>]/i.test(clean) ? "div" : Tag;
  return (
    <TagName
      className={
        className ? `cms-html-content ${className}` : "cms-html-content"
      }
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
