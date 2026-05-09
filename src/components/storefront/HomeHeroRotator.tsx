"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function HomeHeroRotator({
  images,
  title,
  description,
  cta,
}: {
  images: string[];
  title: string;
  description: string;
  cta: { label: string; href: string };
}) {
  const safeImages = images.length ? images : ["/sarjan-assets/banner-textiles-studio.webp"];
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (safeImages.length < 2) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % safeImages.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [safeImages.length]);

  return (
    <div className="tf-slideshow slider-center slider-parallax sarjan-hero-rotator">
      {safeImages.map((image, index) => (
        <div className={`sarjan-hero-slide${index === active ? " active" : ""}`} style={{ backgroundImage: `url(${image})` }} key={`${image}-${index}`} />
      ))}
      <div className="wrap-slider">
        <div className="box-content">
          <div className="container">
            <div className="content-slider">
              <div className="box-title-slider">
                <div className="heading text-white title-display wow fadeInUp" data-wow-delay="0s">{title}</div>
                <p className="body-text-1 subheading text-white wow fadeInUp" data-wow-delay=".1s">{description}</p>
              </div>
              <div className="box-btn-slider wow fadeInUp" data-wow-delay=".2s">
                <Link href={cta.href} className="tf-btn btn-fill btn-white"><span className="text">{cta.label}</span><i className="icon icon-arrowUpRight" /></Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {safeImages.length > 1 && (
        <div className="sarjan-hero-dots">
          {safeImages.map((image, index) => (
            <button type="button" className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-label={`Show banner ${index + 1}`} key={`hero-dot-${image}-${index}`} />
          ))}
        </div>
      )}
    </div>
  );
}
