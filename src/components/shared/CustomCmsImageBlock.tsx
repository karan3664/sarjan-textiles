import { StorefrontImage } from "@/components/storefront/StorefrontImage";
import { STOREFRONT_IMAGE_SIZES } from "@/lib/storefront-image";
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
        <StorefrontImage
          src={src}
          alt={alt}
          width={1200}
          height={800}
          sizes={STOREFRONT_IMAGE_SIZES.promoBanner}
          style={cmsImageElementStyle(display)}
        />
      </div>
    </div>
  );
}
