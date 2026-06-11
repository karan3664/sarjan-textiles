"use client";

import { useEffect, useRef, useState } from "react";
import { StorefrontProductImage } from "./StorefrontProductImage";

type Props = {
  imageUrl: string;
  alt: string;
  fabricLabel?: string;
};

type Mode = "zoom" | "ar";

export function FabricSwatchViewer({ imageUrl, alt, fabricLabel }: Props) {
  const [mode, setMode] = useState<Mode>("zoom");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [arError, setArError] = useState("");

  const bindStreamToVideo = (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return false;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
    return true;
  };

  useEffect(() => {
    if (mode !== "ar") {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      return;
    }

    let cancelled = false;
    setArError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setArError(
        "Camera needs a secure connection (HTTPS). Open sarjantextiles.com in the browser and allow camera access.",
      );
      return;
    }

    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (!bindStreamToVideo(stream)) {
          // Video element may mount after getUserMedia resolves — retry on next frame.
          window.requestAnimationFrame(() => {
            if (!cancelled) bindStreamToVideo(stream);
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setArError(
            "Camera access denied. Allow camera permission to preview fabric on a surface.",
          );
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "ar" || !streamRef.current) return;
    bindStreamToVideo(streamRef.current);
  });

  return (
    <div className="sarjan-fabric-swatch-viewer">
      <div className="sarjan-immersive-mode-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "zoom"}
          className={mode === "zoom" ? "active" : undefined}
          onClick={() => setMode("zoom")}
        >
          Swatch zoom
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "ar"}
          className={mode === "ar" ? "active" : undefined}
          onClick={() => setMode("ar")}
        >
          AR preview
        </button>
      </div>

      {mode === "zoom" ? (
        <div className="sarjan-fabric-zoom-stage">
          <StorefrontProductImage
            src={imageUrl}
            alt={alt}
            variant="detail"
            className="sarjan-fabric-zoom-img"
          />
          <p className="sarjan-fabric-zoom-caption">
            {fabricLabel
              ? `${fabricLabel} — pinch or scroll to inspect weave & print`
              : "Inspect weave, texture and print detail"}
          </p>
        </div>
      ) : (
        <div className="sarjan-fabric-ar-stage">
          {arError ? (
            <p className="sarjan-fabric-ar-error">{arError}</p>
          ) : (
            <>
              <video
                ref={videoRef}
                className="sarjan-fabric-ar-video"
                playsInline
                muted
                autoPlay
                onLoadedMetadata={(event) => {
                  void event.currentTarget.play().catch(() => undefined);
                }}
              />
              <div
                className="sarjan-fabric-ar-overlay"
                style={{ backgroundImage: `url(${imageUrl})` }}
                aria-hidden
              />
            </>
          )}
          <p className="sarjan-fabric-ar-caption">
            Point your camera at a table or shirt — fabric texture overlays live
          </p>
        </div>
      )}
    </div>
  );
}
