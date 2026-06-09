import {
  cmsImageBlockClassName,
  cmsImageBlockStyle,
  cmsImageElementStyle,
  cmsImageWrapClassName,
} from "@/lib/cms-image-display";
import type { CmsImageDisplay } from "@/types/cms-custom";

type Props = {
  src: string;
  alt: string;
  display?: CmsImageDisplay | null;
  className?: string;
};

export function CustomCmsImageBlock({ src, alt, display, className }: Props) {
  return (
    <div
      className={[cmsImageWrapClassName(display), className]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={cmsImageBlockClassName(display)}
        style={cmsImageBlockStyle(display)}
      >
        <img
          src={src}
          alt={alt}
          style={cmsImageElementStyle(display)}
          loading="lazy"
        />
      </div>
    </div>
  );
}
