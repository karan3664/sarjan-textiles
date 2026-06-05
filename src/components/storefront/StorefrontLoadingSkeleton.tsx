import type { CSSProperties } from "react";
import { ModaveShell } from "@/components/storefront/ModaveShell";

function Bone({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`placeholder-glow ${className}`.trim()} aria-hidden>
      <span className="placeholder col-12 d-block" style={style} />
    </div>
  );
}

export function StorefrontLoadingSkeleton({
  variant = "default",
}: {
  variant?: "default" | "listing" | "form";
}) {
  return (
    <ModaveShell>
      <section className="flat-spacing-2">
        <div className="container">
          <Bone style={{ height: 28, width: "35%", marginBottom: 20 }} />
          <Bone style={{ height: 14, width: "55%", marginBottom: 32 }} />

          {variant === "listing" ? (
            <div className="row g-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="col-6 col-md-4 col-lg-3" key={index}>
                  <Bone
                    style={{
                      height: 220,
                      marginBottom: 12,
                      borderRadius: 8,
                    }}
                  />
                  <Bone style={{ height: 16, width: "80%", marginBottom: 8 }} />
                  <Bone style={{ height: 14, width: "50%" }} />
                </div>
              ))}
            </div>
          ) : variant === "form" ? (
            <div className="row g-4">
              <div className="col-lg-7">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Bone
                    key={index}
                    style={{ height: 48, marginBottom: 16, borderRadius: 6 }}
                  />
                ))}
              </div>
              <div className="col-lg-5">
                <Bone style={{ height: 200, borderRadius: 8 }} />
              </div>
            </div>
          ) : (
            <div className="row g-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="col-md-4" key={index}>
                  <Bone style={{ height: 180, borderRadius: 8 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </ModaveShell>
  );
}
