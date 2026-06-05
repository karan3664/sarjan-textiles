"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  frames: string[];
  alt: string;
};

export function ProductSpin360Viewer({ frames, alt }: Props) {
  const [index, setIndex] = useState(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const accumulated = useRef(0);

  useEffect(() => {
    frames.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [frames]);

  const stepFrame = useCallback(
    (delta: number) => {
      if (!frames.length) return;
      setIndex((current) => {
        const next = (current + delta + frames.length) % frames.length;
        return next;
      });
    },
    [frames.length],
  );

  const onPointerDown = (clientX: number) => {
    dragging.current = true;
    lastX.current = clientX;
    accumulated.current = 0;
  };

  const onPointerMove = (clientX: number) => {
    if (!dragging.current || !frames.length) return;
    const delta = clientX - lastX.current;
    lastX.current = clientX;
    accumulated.current += delta;
    const threshold = Math.max(8, Math.floor(320 / frames.length));
    while (Math.abs(accumulated.current) >= threshold) {
      stepFrame(accumulated.current > 0 ? -1 : 1);
      accumulated.current += accumulated.current > 0 ? -threshold : threshold;
    }
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <div
      className="sarjan-spin360-viewer"
      role="img"
      aria-label={`${alt} — 360 degree product view`}
      onMouseDown={(event) => onPointerDown(event.clientX)}
      onMouseMove={(event) => {
        if (dragging.current) onPointerMove(event.clientX);
      }}
      onMouseUp={onPointerUp}
      onMouseLeave={onPointerUp}
      onTouchStart={(event) => onPointerDown(event.touches[0]?.clientX ?? 0)}
      onTouchMove={(event) => {
        event.preventDefault();
        onPointerMove(event.touches[0]?.clientX ?? 0);
      }}
      onTouchEnd={onPointerUp}
    >
      <img
        src={frames[index]}
        alt={`${alt} — frame ${index + 1} of ${frames.length}`}
        draggable={false}
      />
      <div className="sarjan-spin360-hint">
        <i className="icon icon-refresh" aria-hidden />
        Drag to rotate · {index + 1}/{frames.length}
      </div>
    </div>
  );
}
