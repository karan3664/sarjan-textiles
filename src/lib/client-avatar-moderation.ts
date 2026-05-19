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

/**
 * Blocks likely adult / explicit imagery for client profile photos using NSFWJS
 * (MobileNet). Set `DISABLE_AVATAR_NSFW=true` only for local debugging.
 */
export async function assertClientAvatarContentAllowed(
  imageBuffer: Buffer,
): Promise<void> {
  if (process.env.DISABLE_AVATAR_NSFW === "true") return;

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
    const prob = (name: string) =>
      predictions.find((p) => p.className === name)?.probability ?? 0;
    const porn = prob("Porn");
    const hentai = prob("Hentai");
    const sexy = prob("Sexy");
    if (porn > 0.22 || hentai > 0.22 || (sexy > 0.82 && porn + hentai > 0.08)) {
      throw new Error("AVATAR_CONTENT_REJECTED");
    }
  } finally {
    tensor.dispose();
  }
}
