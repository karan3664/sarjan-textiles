import { resolveReviewMediaUrl } from "@/lib/review-media-url";

type Props = {
  images?: string[];
  videos?: string[];
  /** Admin table uses smaller thumbs; PDP uses default size. */
  variant?: "admin" | "storefront";
};

export function ReviewMediaGallery({
  images = [],
  videos = [],
  variant = "storefront",
}: Props) {
  const photos = images.map(resolveReviewMediaUrl).filter(Boolean);
  const clips = videos.map(resolveReviewMediaUrl).filter(Boolean);
  if (!photos.length && !clips.length) return null;

  const className =
    variant === "admin"
      ? "sarjan-review-media-gallery sarjan-review-media-gallery--admin"
      : "sarjan-review-media-gallery";

  return (
    <div className={className}>
      {photos.map((src) => (
        <a
          key={src}
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="sarjan-review-media-gallery__photo-link"
          aria-label="Open review photo"
        >
          <img
            src={src}
            alt="Customer review photo"
            className="sarjan-review-media-gallery__photo"
            loading="lazy"
          />
        </a>
      ))}
      {clips.map((src) => (
        <video
          key={src}
          src={src}
          controls
          playsInline
          preload="metadata"
          className="sarjan-review-media-gallery__video"
        />
      ))}
    </div>
  );
}
