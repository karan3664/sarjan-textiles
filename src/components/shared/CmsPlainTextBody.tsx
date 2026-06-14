import { CmsHtml } from "@/components/shared/CmsHtml";
import { isCmsHtmlContent, splitCmsTextParagraphs } from "@/lib/cms-html";

export function CmsPlainTextBody({
  text,
  className = "text-secondary",
  wrapperClassName = "cms-html-content",
}: {
  text: string;
  className?: string;
  wrapperClassName?: string;
}) {
  const value = text?.trim() ?? "";
  if (!value) return null;

  if (isCmsHtmlContent(value)) {
    return (
      <div className={wrapperClassName}>
        <CmsHtml html={value} className={className} />
      </div>
    );
  }

  const paragraphs = splitCmsTextParagraphs(value);
  if (paragraphs.length <= 1) {
    return <p className={`mb_0 ${className}`}>{value}</p>;
  }

  return (
    <div className={wrapperClassName}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={className}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}
