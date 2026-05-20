import sharp from "sharp";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-cpu";
import { load as loadNsfw, type NSFWJS } from "nsfwjs";

let nsfwModelPromise: Promise<NSFWJS> | null = null;

async function getNsfwModel(): Promise<NSFWJS> {
  if (!nsfwModelPromise) {
    await tf.setBackend("cpu");
    await tf.ready();
    nsfwModelPromise = loadNsfw();
  }
  return nsfwModelPromise;
}

type NsfwScores = {
  porn: number;
  hentai: number;
  sexy: number;
  neutral: number;
  drawing: number;
};

function readScores(
  predictions: Array<{ className: string; probability: number }>,
): NsfwScores {
  const prob = (name: string) =>
    predictions.find((p) => p.className === name)?.probability ?? 0;
  return {
    porn: prob("Porn"),
    hentai: prob("Hentai"),
    sexy: prob("Sexy"),
    neutral: prob("Neutral"),
    drawing: prob("Drawing"),
  };
}

/** Stricter rules for B2B profile photos (headshot / logo only). */
function isAvatarContentRejectedByNsfw(scores: NsfwScores) {
  const explicit = scores.porn + scores.hentai;
  const suggestive = scores.sexy;

  if (scores.porn > 0.08 || scores.hentai > 0.08) return true;
  if (suggestive > 0.28) return true;
  if (suggestive > 0.2 && scores.neutral > 0.35) return true;
  if (suggestive > 0.18 && explicit > 0.04) return true;
  if (explicit + suggestive > 0.32) return true;

  const top = Math.max(
    scores.porn,
    scores.hentai,
    scores.sexy,
    scores.neutral,
    scores.drawing,
  );
  if (suggestive === top && suggestive > 0.22) return true;
  if (scores.porn === top && scores.porn > 0.06) return true;
  if (scores.hentai === top && scores.hentai > 0.06) return true;
  if (scores.neutral === top && suggestive > 0.24) return true;

  return false;
}

/** YCbCr skin-tone heuristic — catches shirtless torso photos NSFWJS labels as Neutral. */
function isSkinPixel(r: number, g: number, b: number) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  if (y < 40 || y > 230) return false;
  if (cb < 77 || cb > 127) return false;
  if (cr < 133 || cr > 173) return false;
  return true;
}

type SkinExposureStats = {
  overall: number;
  topThird: number;
  middleThird: number;
  bottomThird: number;
};

async function measureSkinExposure(
  imageBuffer: Buffer,
): Promise<SkinExposureStats> {
  const width = 128;
  const height = 128;
  const { data, info } = await sharp(imageBuffer)
    .rotate()
    .resize(width, height, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 3) {
    return { overall: 0, topThird: 0, middleThird: 0, bottomThird: 0 };
  }

  const rowHeight = Math.floor(height / 3);
  const bands = [
    { key: "topThird" as const, y0: 0, y1: rowHeight },
    { key: "middleThird" as const, y0: rowHeight, y1: rowHeight * 2 },
    { key: "bottomThird" as const, y0: rowHeight * 2, y1: height },
  ];

  let skinTotal = 0;
  let pixelTotal = 0;
  const bandStats: Record<
    "topThird" | "middleThird" | "bottomThird",
    { skin: number; total: number }
  > = {
    topThird: { skin: 0, total: 0 },
    middleThird: { skin: 0, total: 0 },
    bottomThird: { skin: 0, total: 0 },
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const skin = isSkinPixel(r, g, b) ? 1 : 0;
      pixelTotal += 1;
      skinTotal += skin;
      for (const band of bands) {
        if (y >= band.y0 && y < band.y1) {
          bandStats[band.key].total += 1;
          bandStats[band.key].skin += skin;
        }
      }
    }
  }

  const ratio = (skin: number, total: number) => (total > 0 ? skin / total : 0);

  return {
    overall: ratio(skinTotal, pixelTotal),
    topThird: ratio(bandStats.topThird.skin, bandStats.topThird.total),
    middleThird: ratio(bandStats.middleThird.skin, bandStats.middleThird.total),
    bottomThird: ratio(bandStats.bottomThird.skin, bandStats.bottomThird.total),
  };
}

/**
 * Shirtless gym/portrait photos are often classified as Neutral by NSFWJS.
 * Block large bare-skin torso exposure (mid + lower frame), not face-only headshots.
 */
function isAvatarContentRejectedBySkinExposure(stats: SkinExposureStats) {
  const { overall, middleThird, bottomThird } = stats;

  if (middleThird >= 0.42 && bottomThird >= 0.32) return true;
  if (overall >= 0.38 && middleThird >= 0.4) return true;

  return false;
}

/**
 * Blocks adult / explicit / shirtless-suggestive imagery on client profile photos.
 * Uses NSFWJS (MobileNet) plus skin-exposure heuristics.
 * Set `DISABLE_AVATAR_NSFW=true` only for local debugging.
 */
export async function assertClientAvatarContentAllowed(
  imageBuffer: Buffer,
): Promise<void> {
  if (process.env.DISABLE_AVATAR_NSFW === "true") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AVATAR_MODERATION_DISABLED");
    }
    return;
  }

  const skinStats = await measureSkinExposure(imageBuffer);
  if (isAvatarContentRejectedBySkinExposure(skinStats)) {
    throw new Error("AVATAR_CONTENT_REJECTED");
  }

  const model = await getNsfwModel();

  const { data, info } = await sharp(imageBuffer)
    .rotate()
    .resize(224, 224, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 3) {
    throw new Error("Avatar must be a colour image (RGB).");
  }

  const h = info.height;
  const w = info.width;
  const tensor = tf.tensor3d(new Uint8Array(data), [h, w, 3], "int32");
  try {
    const predictions = await model.classify(tensor as never);
    if (isAvatarContentRejectedByNsfw(readScores(predictions))) {
      throw new Error("AVATAR_CONTENT_REJECTED");
    }
  } finally {
    tensor.dispose();
  }
}
