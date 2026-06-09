"use client";

import type { ReactNode } from "react";
import {
  CMS_IMAGE_DEFAULTS,
  CMS_IMAGE_SIZE_OPTIONS,
  resolveCmsImageDisplay,
} from "@/lib/cms-image-display";
import type {
  CmsImageAlign,
  CmsImageAspect,
  CmsImageDisplay,
  CmsImageFit,
  CmsImageSize,
} from "@/types/cms-custom";

type Props = {
  value: CmsImageDisplay;
  onChange: (patch: Partial<CmsImageDisplay>) => void;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset>
      <div className="body-title mb-10">{label}</div>
      {children}
    </fieldset>
  );
}

export function AdminCmsImageDisplayFields({ value, onChange }: Props) {
  const resolved = resolveCmsImageDisplay(value);
  const widthPercent =
    value.imageSize === "custom"
      ? (value.imageWidthPercent ?? CMS_IMAGE_DEFAULTS.imageWidthPercent)
      : resolved.imageWidthPercent;

  return (
    <div className="sarjan-cms-image-display-fields grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Image width on page">
        <select
          value={value.imageSize ?? CMS_IMAGE_DEFAULTS.imageSize}
          onChange={(event) =>
            onChange({ imageSize: event.target.value as CmsImageSize })
          }
        >
          {CMS_IMAGE_SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Alignment">
        <select
          value={value.imageAlign ?? CMS_IMAGE_DEFAULTS.imageAlign}
          onChange={(event) =>
            onChange({ imageAlign: event.target.value as CmsImageAlign })
          }
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </Field>

      {value.imageSize === "custom" ? (
        <Field label={`Custom width: ${widthPercent}%`}>
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={widthPercent}
            onChange={(event) =>
              onChange({ imageWidthPercent: Number(event.target.value) })
            }
          />
        </Field>
      ) : null}

      <Field label="Image fit">
        <select
          value={value.imageFit ?? CMS_IMAGE_DEFAULTS.imageFit}
          onChange={(event) =>
            onChange({ imageFit: event.target.value as CmsImageFit })
          }
        >
          <option value="contain">Fit inside (no crop)</option>
          <option value="cover">Fill area (may crop)</option>
        </select>
      </Field>

      <Field label="Shape / aspect">
        <select
          value={value.imageAspect ?? CMS_IMAGE_DEFAULTS.imageAspect}
          onChange={(event) =>
            onChange({ imageAspect: event.target.value as CmsImageAspect })
          }
        >
          <option value="auto">Original proportions</option>
          <option value="16/9">Wide banner (16:9)</option>
          <option value="4/3">Standard (4:3)</option>
          <option value="1/1">Square (1:1)</option>
          <option value="3/4">Portrait (3:4)</option>
        </select>
      </Field>
    </div>
  );
}
