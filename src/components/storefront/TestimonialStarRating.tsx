"use client";

import { Fragment, useId } from "react";

type Props = {
  value: number;
  onChange: (value: number) => void;
  name?: string;
  label?: string;
  required?: boolean;
};

export function TestimonialStarRating({
  value,
  onChange,
  name = "rating",
  label = "Your rating",
  required = true,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const stars = [5, 4, 3, 2, 1] as const;

  return (
    <div className="sarjan-testimonial-rating-field">
      <span className="sarjan-testimonial-field-label">
        {label}
        {required ? " *" : null}
      </span>
      <div className="list-rating-check" role="radiogroup" aria-label={label}>
        {stars.map((star) => {
          const id = `${uid}-star-${star}`;
          return (
            <Fragment key={star}>
              <input
                type="radio"
                id={id}
                name={name}
                value={star}
                checked={value === star}
                onChange={() => onChange(star)}
                required={required && value === 0}
              />
              <label
                htmlFor={id}
                title={`${star} star${star === 1 ? "" : "s"}`}
              />
            </Fragment>
          );
        })}
      </div>
      {value > 0 ? (
        <p className="sarjan-testimonial-rating-hint text-caption-1 text-secondary mb_0">
          {value} of 5 stars
        </p>
      ) : null}
    </div>
  );
}

export function TestimonialStarsDisplay({
  rating = 5,
  className = "list-star-default",
}: {
  rating?: number;
  className?: string;
}) {
  const filled = Math.min(5, Math.max(1, Math.round(rating || 5)));

  return (
    <div className={className} aria-label={`${filled} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <i
          className={`icon icon-star${index < filled ? "" : " sarjan-star-muted"}`}
          key={index}
        />
      ))}
    </div>
  );
}
