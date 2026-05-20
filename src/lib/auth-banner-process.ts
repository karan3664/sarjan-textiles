import sharp from "sharp";
import type { AuthBannerAsset } from "@/lib/auth-banner-types";
import { DEFAULT_AUTH_BANNER_ALT } from "@/lib/auth-banner-defaults";

export type ProcessedAuthBanner = {
  webp: Buffer;
  avif: Buffer;
  blurDataURL: string;
  width: number;
  height: number;
  alt: string;
};

export async function processAuthBannerUpload(
  input: Buffer,
  alt = DEFAULT_AUTH_BANNER_ALT,
): Promise<ProcessedAuthBanner> {
  const pipeline = sharp(input)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true });

  const [webpResult, avifResult, blurBuffer] = await Promise.all([
    pipeline
      .clone()
      .webp({ quality: 76, effort: 4 })
      .toBuffer({ resolveWithObject: true }),
    pipeline.clone().avif({ quality: 52, effort: 4 }).toBuffer(),
    pipeline.clone().resize(10).jpeg({ quality: 40, mozjpeg: true }).toBuffer(),
  ]);

  return {
    webp: webpResult.data,
    avif: avifResult,
    blurDataURL: `data:image/jpeg;base64,${blurBuffer.toString("base64")}`,
    width: webpResult.info.width ?? 1024,
    height: webpResult.info.height ?? 480,
    alt: alt.trim() || DEFAULT_AUTH_BANNER_ALT,
  };
}

export function toAuthBannerAsset(
  webpUrl: string,
  avifUrl: string,
  processed: ProcessedAuthBanner,
): AuthBannerAsset {
  return {
    webp: webpUrl,
    avif: avifUrl,
    blurDataURL: processed.blurDataURL,
    width: processed.width,
    height: processed.height,
    alt: processed.alt,
  };
}
