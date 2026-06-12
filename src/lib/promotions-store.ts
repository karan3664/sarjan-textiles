import fs from "node:fs/promises";
import path from "node:path";
import type { PromotionAd } from "@/lib/promotions-cms";

type PromotionsFile = {
  promotions: PromotionAd[];
  updatedAt: string;
};

const DATA_PATH = path.join(process.cwd(), "data", "promotions.json");

function defaultFile(): PromotionsFile {
  return { promotions: [], updatedAt: new Date().toISOString() };
}

async function readFile(): Promise<PromotionsFile> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as PromotionsFile;
    return {
      promotions: Array.isArray(parsed.promotions) ? parsed.promotions : [],
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return defaultFile();
  }
}

async function writeFile(data: PromotionsFile) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
}

export async function listPromotionAds(): Promise<PromotionAd[]> {
  const file = await readFile();
  return file.promotions;
}

export async function savePromotionAds(promotions: PromotionAd[]) {
  await writeFile({
    promotions,
    updatedAt: new Date().toISOString(),
  });
}

export async function upsertPromotionAd(ad: PromotionAd) {
  const file = await readFile();
  const index = file.promotions.findIndex((entry) => entry.id === ad.id);
  if (index >= 0) {
    file.promotions[index] = ad;
  } else {
    file.promotions.push(ad);
  }
  file.updatedAt = new Date().toISOString();
  await writeFile(file);
  return ad;
}

export async function deletePromotionAd(id: string) {
  const file = await readFile();
  file.promotions = file.promotions.filter((entry) => entry.id !== id);
  file.updatedAt = new Date().toISOString();
  await writeFile(file);
}
