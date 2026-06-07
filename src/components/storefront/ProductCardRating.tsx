import { productDisplayRating } from "@/lib/product-card-display";

export function ProductCardRating({
  rating,
  className = "",
}: {
  rating?: number;
  className?: string;
}) {
  const filled = productDisplayRating({ rating });
  const stars = 5;

  return (
    <div
      className={`sarjan-product-card-rating${className ? ` ${className}` : ""}`}
      aria-label={`${filled} out of ${stars} stars`}
    >
      {Array.from({ length: stars }).map((_, index) => (
        <i
          key={index}
          className={`icon icon-star${index < filled ? "" : " sarjan-star-muted"}`}
        />
      ))}
    </div>
  );
}
