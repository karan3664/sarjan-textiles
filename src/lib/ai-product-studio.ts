import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
  copyFile,
} from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { GoogleAuth } from "google-auth-library";

export const runtime = "nodejs";

export type StudioStatus =
  | "queued"
  | "processing"
  | "processed"
  | "approved"
  | "rejected"
  | "failed";
export type StudioShootStyle = "current-style";

export type StudioMetadata = {
  category: string;
  collection: string;
  attributeType: string;
  attributeValue: string;
  color?: string;
  pattern: string;
  seoTags: string[];
  cmsMapping: {
    categorySlug: string;
    collectionSlug: string;
    attributeSlug: string;
  };
};

export type StudioOutputs = {
  webReady: string;
  thumbnail: string;
  zoom: string;
  compressed: string;
};

export type StudioImageRecord = {
  id: string;
  originalName: string;
  rawPath: string;
  rawUrl: string;
  outputs?: StudioOutputs;
  finalPath?: string;
  finalUrl?: string;
  finalPublicPath?: string;
  finalPublicUrl?: string;
  prompt: string;
  useCustomPrompt?: boolean;
  shootStyle: StudioShootStyle;
  metadata: StudioMetadata;
  status: StudioStatus;
  qaNote?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type StudioState = {
  promptTemplate: string;
  records: StudioImageRecord[];
};

export type AiImageProvider = "vertex" | "openai" | "local";

export type CatalogProcessingMode = "preserve" | "generative";

export type AiImageProviderInfo = {
  active: AiImageProvider;
  requested: string;
  ready: boolean;
  catalogMode: CatalogProcessingMode;
  note?: string;
};

const CATALOG_BG = "#f4f4f4";
const CATALOG_BG_CENTER = "#f7f7f7";

export function getCatalogProcessingMode(): CatalogProcessingMode {
  const raw = (process.env.AI_IMAGE_CATALOG_MODE || "preserve")
    .trim()
    .toLowerCase();
  if (
    raw === "generative" ||
    raw === "ai" ||
    raw === "openai" ||
    raw === "vertex"
  ) {
    return "generative";
  }
  return "preserve";
}

export type StudioSnapshot = {
  root: string;
  promptTemplate: string;
  records: StudioImageRecord[];
  imageProvider: AiImageProviderInfo;
  summary: {
    total: number;
    queued: number;
    processed: number;
    approved: number;
    rejected: number;
    failed: number;
    pendingQa: number;
  };
};

const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);

/** Writable root for studio files. Vercel serverless cwd is read-only except /tmp. */
export function resolveAiStudioProductsRoot(): string {
  const fromEnv = process.env.AI_STUDIO_DATA_DIR?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv)
      ? fromEnv
      : path.join(process.cwd(), fromEnv);
  }
  if (process.env.VERCEL) {
    return path.join("/tmp", "sarjan-ai-studio", "products");
  }
  return path.join(process.cwd(), "products");
}

function resolveAiStudioStateDir(): string {
  return path.join(resolveAiStudioProductsRoot(), ".ai-studio");
}

function resolveAiStudioStateFile(): string {
  return path.join(resolveAiStudioStateDir(), "state.json");
}

/** Approved CMS copies; on Vercel lives under /tmp (served via /api/public/ai-products). */
export function resolveAiStudioPublicRoot(): string {
  const fromEnv = process.env.AI_STUDIO_PUBLIC_DIR?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv)
      ? fromEnv
      : path.join(process.cwd(), fromEnv);
  }
  if (process.env.VERCEL) {
    return path.join(
      "/tmp",
      "sarjan-ai-studio",
      "public-uploads",
      "ai-products",
    );
  }
  return path.join(process.cwd(), "public", "uploads", "ai-products");
}

function siteOriginForAiUrls(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(
    /\/+$/,
    "",
  );
  if (configured) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

export const productStudioPrompt = `Use the provided product image as the ONLY reference.

Task:
Create a highly realistic eCommerce product image with natural depth and shadows.

STRICT RULES (MANDATORY):
- Do NOT change print, color, pattern, fabric, or texture. See the print in detail.
- Do NOT modify buttons, collar, stitching, label, pocket, sleeve shape, hem, proportions, or any detail.
- Maintain exact proportions and all visible details from the reference product.
- Product should look exact same as real, like clicked by camera professionally.

Photoshoot setup:
- Product laid flat, top-down view.
- Perfect alignment.
- Add realistic soft contact shadow beneath product.
- Add subtle directional shadow.
- Natural depth with gradient shadow.
- Do a little adjustment of brightness and exposure, contrast and saturation but it should look realistic.
- Reduce the extra wrinkles.

Background:
- Clean white or light neutral #fafafa.

Lighting:
- Soft studio lighting.
- Slight directional lighting.
- Natural shadow falloff.
- Realistic highlights on folds.

Realism enhancements:
- Fabric depth visibility.
- Natural texture visibility.
- Slight wrinkles allowed only if product shape, pattern, and proportions remain exact.

Style:
- Zara style.
- Premium fashion ecommerce.

Output:
- 4K resolution.
- Website-ready.
- Photorealistic.
- Ultra realistic.
- No text.
- No watermark.

Make 100% accurate — no change in style, color, pattern, logo, or any product detail.`;

function resolveAiStudioPromptFile() {
  return path.join(resolveAiStudioStateDir(), "prompt-template.txt");
}

export async function readStudioPromptTemplate(): Promise<string> {
  await ensureProductFolders();
  try {
    const fromFile = (
      await readFile(resolveAiStudioPromptFile(), "utf8")
    ).trim();
    if (fromFile) return fromFile;
  } catch {
    /* use state.json or default */
  }
  try {
    const data = JSON.parse(
      await readFile(resolveAiStudioStateFile(), "utf8"),
    ) as Partial<StudioState>;
    const fromState = data.promptTemplate?.trim();
    if (fromState) return fromState;
  } catch {
    /* use default */
  }
  return productStudioPrompt;
}

async function writeStudioPromptTemplate(promptTemplate: string) {
  const nextPrompt = promptTemplate.trim() || productStudioPrompt;
  await ensureProductFolders();
  await writeFile(resolveAiStudioPromptFile(), nextPrompt, "utf8");
  const state = await readStudioState();
  await writeStudioState({
    ...state,
    promptTemplate: nextPrompt,
    records: state.records.map((record) =>
      record.status === "approved"
        ? record
        : {
            ...record,
            prompt: nextPrompt,
            useCustomPrompt: false,
            updatedAt: now(),
          },
    ),
  });
  return nextPrompt;
}

function now() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function safeSegment(value: string, fallback: string) {
  const clean = value
    .toLowerCase()
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(/[^\w\s-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return clean || fallback;
}

function extensionFromFileName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return allowedExtensions.has(extension) ? extension : "jpg";
}

function cleanOriginalName(name: string) {
  return path.basename(name.replace(/\\/g, "/")).trim();
}

function normalizedOriginalName(name: string) {
  return cleanOriginalName(name).toLowerCase();
}

function isAllowedImage(name: string) {
  return allowedExtensions.has(name.split(".").pop()?.toLowerCase() ?? "");
}

function relativeToProducts(absolutePath: string) {
  return path
    .relative(resolveAiStudioProductsRoot(), absolutePath)
    .split(path.sep)
    .join("/");
}

function fileUrl(relativePath: string) {
  return `/api/admin/ai-studio/file?path=${encodeURIComponent(relativePath)}`;
}

function publicAiUrl(relativePublicPath: string) {
  const normalized = relativePublicPath
    .split(/[/\\]+/)
    .filter(Boolean)
    .join("/");
  if (process.env.VERCEL) {
    const origin = siteOriginForAiUrls();
    const encoded = normalized.split("/").map(encodeURIComponent).join("/");
    if (origin) return `${origin}/api/public/ai-products/${encoded}`;
    return `/api/public/ai-products/${encoded}`;
  }
  return `/uploads/ai-products/${normalized.split("/").map(encodeURIComponent).join("/")}`;
}

function promptForStyle(_style: StudioShootStyle, currentPrompt: string) {
  return currentPrompt || productStudioPrompt;
}

function absoluteFromProducts(relativePath: string) {
  const normalized = path
    .normalize(relativePath)
    .replace(/^(\.\.(\/|\\|$))+/, "");
  const absolute = path.join(resolveAiStudioProductsRoot(), normalized);

  if (!absolute.startsWith(resolveAiStudioProductsRoot())) {
    throw new Error("Invalid product file path");
  }

  return absolute;
}

function inferPattern(collection: string) {
  const value = collection.toLowerCase();
  if (value.includes("check")) return "checked";
  if (value.includes("stripe")) return "striped";
  if (value.includes("plain") || value.includes("solid")) return "plain";
  if (value.includes("embroider")) return "embroidered";
  if (value.includes("ajrakh")) return "ajrakh";
  if (value.includes("print") || value.includes("block")) return "printed";
  return slugify(collection).split("-").at(-1) || "textile";
}

export function metadataFromParts(
  category: string,
  collection: string,
  attributeType: string,
  attributeValue: string,
): StudioMetadata {
  const pattern = inferPattern(collection);
  const normalizedAttributeType = safeSegment(attributeType, "color");
  const normalizedAttributeValue = safeSegment(attributeValue, "uncategorized");
  const tags = [
    category,
    collection,
    normalizedAttributeType,
    normalizedAttributeValue,
    pattern,
    "sarjan textiles",
    "premium ecommerce",
  ].filter(Boolean);

  return {
    category: safeSegment(category, "uncategorized"),
    collection: safeSegment(collection, "general collection"),
    attributeType: normalizedAttributeType,
    attributeValue: normalizedAttributeValue,
    color:
      normalizedAttributeType === "color"
        ? normalizedAttributeValue
        : undefined,
    pattern,
    seoTags: Array.from(new Set(tags.map(slugify).filter(Boolean))),
    cmsMapping: {
      categorySlug: slugify(category),
      collectionSlug: slugify(collection),
      attributeSlug: `${slugify(normalizedAttributeType)}-${slugify(normalizedAttributeValue)}`,
    },
  };
}

function metadataFromRawRelativePath(relativePath: string) {
  const parts = relativePath.split("/");
  const rawIndex = parts.indexOf("raw");
  const category = parts[rawIndex + 1] ?? "uncategorized";
  const collection = parts[rawIndex + 2] ?? "general collection";
  const attributeType = parts[rawIndex + 3] ?? "color";
  const attributeValue = parts[rawIndex + 4] ?? "uncategorized";

  return metadataFromParts(category, collection, attributeType, attributeValue);
}

async function ensureProductFolders() {
  await mkdir(path.join(resolveAiStudioProductsRoot(), "raw"), {
    recursive: true,
  });
  await mkdir(
    path.join(resolveAiStudioProductsRoot(), "processed", "web-ready"),
    {
      recursive: true,
    },
  );
  await mkdir(
    path.join(resolveAiStudioProductsRoot(), "processed", "thumbnails"),
    {
      recursive: true,
    },
  );
  await mkdir(
    path.join(resolveAiStudioProductsRoot(), "processed", "zoom-images"),
    {
      recursive: true,
    },
  );
  await mkdir(
    path.join(resolveAiStudioProductsRoot(), "processed", "compressed"),
    {
      recursive: true,
    },
  );
  await mkdir(path.join(resolveAiStudioProductsRoot(), "final"), {
    recursive: true,
  });
  await mkdir(resolveAiStudioStateDir(), { recursive: true });
}

async function readRecords() {
  const state = await readStudioState();
  return state.records;
}

async function readStudioState(): Promise<StudioState> {
  await ensureProductFolders();
  const promptTemplate = await readStudioPromptTemplate();

  try {
    const data = JSON.parse(
      await readFile(resolveAiStudioStateFile(), "utf8"),
    ) as Partial<StudioState>;
    return {
      promptTemplate,
      records: (data.records ?? []).map((record) => ({
        ...record,
        originalName: cleanOriginalName(record.originalName),
        prompt: record.prompt?.trim() || promptTemplate,
        shootStyle: "current-style",
        qaNote: record.qaNote?.toLowerCase().includes("model")
          ? "Strict AI flat-lay catalog prompt queued. Run process."
          : record.qaNote,
      })),
    };
  } catch {
    return {
      promptTemplate,
      records: [],
    };
  }
}

async function writeRecords(records: StudioImageRecord[]) {
  const state = await readStudioState();
  await writeStudioState({ ...state, records });
}

async function writeStudioState(state: StudioState) {
  await ensureProductFolders();
  await writeFile(resolveAiStudioStateFile(), JSON.stringify(state, null, 2));
}

function withUrls(record: StudioImageRecord): StudioImageRecord {
  return {
    ...record,
    rawUrl: fileUrl(record.rawPath),
    finalUrl: record.finalPath ? fileUrl(record.finalPath) : undefined,
    finalPublicUrl: record.finalPublicPath
      ? publicAiUrl(record.finalPublicPath)
      : record.finalPublicUrl,
  };
}

export async function getStudioSnapshot(): Promise<StudioSnapshot> {
  const state = await readStudioState();
  const records = state.records.map(withUrls);
  const byStatus = (status: StudioStatus) =>
    records.filter((record) => record.status === status).length;

  return {
    root: resolveAiStudioProductsRoot(),
    promptTemplate: state.promptTemplate,
    imageProvider: getAiImageProviderInfo(),
    records: records.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    summary: {
      total: records.length,
      queued: byStatus("queued"),
      processed: byStatus("processed"),
      approved: byStatus("approved"),
      rejected: byStatus("rejected"),
      failed: byStatus("failed"),
      pendingQa: records.filter(
        (record) =>
          record.status === "processed" || record.status === "rejected",
      ).length,
    },
  };
}

export async function updateStudioPrompt(promptTemplate: string) {
  return writeStudioPromptTemplate(promptTemplate);
}

export async function resetStudioPromptToDefault() {
  return writeStudioPromptTemplate(productStudioPrompt);
}

export async function updateStudioRecordPrompt(id: string, prompt: string) {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("Prompt cannot be empty");

  const records = await readRecords();
  const index = records.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Studio image not found");

  records[index] = {
    ...records[index],
    prompt: trimmed,
    useCustomPrompt: true,
    updatedAt: now(),
  };
  await writeRecords(records);
  return withUrls(records[index]);
}

export async function saveRawUploads(
  files: File[],
  input: {
    category: string;
    collection: string;
    attributeType: string;
    attributeValue: string;
    shootStyle?: StudioShootStyle;
  },
) {
  await ensureProductFolders();

  const state = await readStudioState();
  const records = state.records;
  const shootStyle = input.shootStyle ?? "current-style";
  const metadata = metadataFromParts(
    input.category,
    input.collection,
    input.attributeType,
    input.attributeValue,
  );
  const rawDir = path.join(
    resolveAiStudioProductsRoot(),
    "raw",
    metadata.category,
    metadata.collection,
    metadata.attributeType,
    metadata.attributeValue,
  );
  const rawRelativeDir = relativeToProducts(rawDir);
  await mkdir(rawDir, { recursive: true });

  const added: StudioImageRecord[] = [];
  const skipped: string[] = [];
  const existingNames = new Set(
    records.map(
      (record) =>
        `${path.dirname(record.rawPath)}::${normalizedOriginalName(record.originalName)}::${record.shootStyle}`,
    ),
  );

  for (const file of files) {
    const originalName = cleanOriginalName(file.name);
    if (!isAllowedImage(originalName) && !file.type.startsWith("image/"))
      continue;
    const duplicateKey = `${rawRelativeDir}::${normalizedOriginalName(originalName)}::${shootStyle}`;
    const duplicate = existingNames.has(duplicateKey);

    if (duplicate) {
      skipped.push(originalName);
      continue;
    }

    existingNames.add(duplicateKey);
    const extension = extensionFromFileName(originalName);
    const basename = `${Date.now()}-${randomUUID()}.${extension}`;
    const absolutePath = path.join(rawDir, basename);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(absolutePath, buffer);

    const rawPath = relativeToProducts(absolutePath);
    const createdAt = now();
    added.push({
      id: randomUUID(),
      originalName,
      rawPath,
      rawUrl: fileUrl(rawPath),
      prompt: promptForStyle(shootStyle, state.promptTemplate),
      shootStyle,
      metadata,
      status: "queued",
      createdAt,
      updatedAt: createdAt,
    });
  }

  await writeRecords([...records, ...added]);
  return { added: added.map(withUrls), skipped };
}

async function walkImages(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walkImages(absolutePath);
      return isAllowedImage(entry.name) ? [absolutePath] : [];
    }),
  );

  return nested.flat();
}

export async function scanRawFolder() {
  await ensureProductFolders();

  const state = await readStudioState();
  const records = state.records;
  const existing = new Set(records.map((record) => record.rawPath));
  const existingByNameAndFolder = new Set(
    records.map(
      (record) =>
        `${path.dirname(record.rawPath)}::${normalizedOriginalName(record.originalName)}`,
    ),
  );
  const images = await walkImages(
    path.join(resolveAiStudioProductsRoot(), "raw"),
  );
  const added: StudioImageRecord[] = [];
  const skipped: string[] = [];

  for (const absolutePath of images) {
    const rawPath = relativeToProducts(absolutePath);
    const originalName = cleanOriginalName(absolutePath);
    const duplicateKey = `${path.dirname(rawPath)}::${normalizedOriginalName(originalName)}`;
    if (existing.has(rawPath) || existingByNameAndFolder.has(duplicateKey)) {
      skipped.push(rawPath);
      continue;
    }

    existingByNameAndFolder.add(duplicateKey);
    const createdAt = now();
    added.push({
      id: randomUUID(),
      originalName,
      rawPath,
      rawUrl: fileUrl(rawPath),
      prompt: promptForStyle("current-style", state.promptTemplate),
      shootStyle: "current-style",
      metadata: metadataFromRawRelativePath(rawPath),
      status: "queued",
      createdAt,
      updatedAt: createdAt,
    });
  }

  await writeRecords([...records, ...added]);
  return { added: added.map(withUrls), skipped };
}

function processedPath(
  kind: keyof StudioOutputs,
  record: StudioImageRecord,
  extension: "webp" | "jpg",
) {
  const folderByKind: Record<keyof StudioOutputs, string> = {
    webReady: "web-ready",
    thumbnail: "thumbnails",
    zoom: "zoom-images",
    compressed: "compressed",
  };

  const base = path.parse(record.originalName).name || record.id;
  const filename = `${slugify(base)}-${record.id.slice(0, 8)}.${extension}`;

  return path.join(
    resolveAiStudioProductsRoot(),
    "processed",
    folderByKind[kind],
    record.metadata.category,
    record.metadata.collection,
    record.metadata.attributeType,
    record.metadata.attributeValue,
    filename,
  );
}

async function writeProcessedOutputs(
  source: sharp.Sharp,
  record: StudioImageRecord,
) {
  const webReady = processedPath("webReady", record, "webp");
  const thumbnail = processedPath("thumbnail", record, "webp");
  const zoom = processedPath("zoom", record, "webp");
  const compressed = processedPath("compressed", record, "jpg");
  await Promise.all(
    [webReady, thumbnail, zoom, compressed].map((target) =>
      mkdir(path.dirname(target), { recursive: true }),
    ),
  );

  await Promise.all([
    source
      .clone()
      .resize({
        width: 2000,
        height: 2500,
        fit: "inside",
        withoutEnlargement: false,
        background: "#f5f5f5",
      })
      .sharpen({ sigma: 0.6, m1: 0.6, m2: 1.4 })
      .webp({ quality: 88, effort: 5 })
      .toFile(webReady),
    source
      .clone()
      .resize({ width: 420, height: 540, fit: "inside", background: "#f5f5f5" })
      .webp({ quality: 74, effort: 4 })
      .toFile(thumbnail),
    source
      .clone()
      .resize({
        width: 4096,
        height: 4096,
        fit: "inside",
        withoutEnlargement: false,
        background: "#f5f5f5",
      })
      .sharpen({ sigma: 0.5, m1: 0.5, m2: 1.2 })
      .webp({ quality: 92, effort: 5 })
      .toFile(zoom),
    source
      .clone()
      .resize({
        width: 1200,
        height: 1500,
        fit: "inside",
        background: "#f5f5f5",
      })
      .jpeg({ quality: 72, mozjpeg: true })
      .toFile(compressed),
  ]);

  return {
    webReady: relativeToProducts(webReady),
    thumbnail: relativeToProducts(thumbnail),
    zoom: relativeToProducts(zoom),
    compressed: relativeToProducts(compressed),
  };
}

async function generateOpenAiCatalogShoot(inputPath: string, prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAPI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY missing in .env.local. Add key, restart dev server, then run process.",
    );
  }

  const inputBuffer = await sharp(inputPath)
    .rotate()
    .resize({
      width: 1536,
      height: 1536,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const formData = new FormData();
  formData.append(
    "model",
    process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1",
  );
  formData.append("prompt", prompt);
  formData.append(
    "image",
    new Blob([new Uint8Array(inputBuffer)], { type: "image/png" }),
    "shirt-reference.png",
  );
  formData.append("size", process.env.OPENAI_IMAGE_SIZE || "1024x1536");
  formData.append(
    "quality",
    process.env.OPENAI_IMAGE_QUALITY?.trim() || "high",
  );
  formData.append(
    "input_fidelity",
    process.env.OPENAI_IMAGE_INPUT_FIDELITY?.trim() || "high",
  );
  formData.append("output_format", "png");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
    signal: AbortSignal.timeout(180_000),
  });

  const text = await response.text();
  let data: {
    data?: Array<{ b64_json?: string; url?: string }>;
    error?: { message?: string };
  };

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `OpenAI image edit failed: ${text.slice(0, 240) || response.statusText}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
        `OpenAI image edit failed with status ${response.status}`,
    );
  }

  const image = data.data?.[0];
  if (image?.b64_json) return Buffer.from(image.b64_json, "base64");
  if (image?.url) {
    const imageResponse = await fetch(image.url, {
      signal: AbortSignal.timeout(120_000),
    });
    if (!imageResponse.ok)
      throw new Error(
        `OpenAI image download failed with status ${imageResponse.status}`,
      );
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  throw new Error("OpenAI image edit returned no image data");
}

type VertexPrediction = {
  bytesBase64Encoded?: string;
  mimeType?: string;
  raiFilteredReason?: string;
};

type VertexPredictResponse = {
  predictions?: VertexPrediction[];
  error?: {
    message?: string;
  };
};

function vertexNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function generateVertexImagenCatalogShoot(
  inputPath: string,
  prompt: string,
) {
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
  const model = process.env.VERTEX_IMAGEN_MODEL || "imagen-3.0-capability-001";

  if (!projectId) {
    throw new Error(
      "GOOGLE_CLOUD_PROJECT_ID missing in .env.local. Add Google Cloud project id, restart dev server, then run process.",
    );
  }

  const inputBuffer = await sharp(inputPath)
    .rotate()
    .resize({
      width: 2000,
      height: 2500,
      fit: "inside",
      withoutEnlargement: true,
      background: "#f5f5f5",
    })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  if (inputBuffer.byteLength > 10 * 1024 * 1024) {
    throw new Error(
      "Input image too large for Vertex Imagen background edit. Use image under 10 MB.",
    );
  }

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const accessToken = typeof token === "string" ? token : token.token;

  if (!accessToken) {
    throw new Error(
      "Google auth token unavailable. Check GOOGLE_APPLICATION_CREDENTIALS service-account JSON path.",
    );
  }

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`;
  const body = {
    instances: [
      {
        prompt,
        referenceImages: [
          {
            referenceType: "REFERENCE_TYPE_RAW",
            referenceId: 1,
            referenceImage: {
              bytesBase64Encoded: inputBuffer.toString("base64"),
            },
          },
          {
            referenceType: "REFERENCE_TYPE_MASK",
            referenceId: 2,
            maskImageConfig: {
              maskMode: "MASK_MODE_BACKGROUND",
              dilation: Number(process.env.VERTEX_IMAGEN_MASK_DILATION ?? "0"),
            },
          },
        ],
      },
    ],
    parameters: {
      editConfig: {
        baseSteps: vertexNumberEnv("VERTEX_IMAGEN_EDIT_STEPS", 75),
      },
      editMode: "EDIT_MODE_BGSWAP",
      sampleCount: 1,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });

  const text = await response.text();
  let data: VertexPredictResponse;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Vertex Imagen edit failed: ${text.slice(0, 240) || response.statusText}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
        `Vertex Imagen edit failed with status ${response.status}`,
    );
  }

  const image = data.predictions?.find(
    (prediction) => prediction.bytesBase64Encoded,
  );
  if (image?.bytesBase64Encoded)
    return Buffer.from(image.bytesBase64Encoded, "base64");

  const filtered = data.predictions?.find(
    (prediction) => prediction.raiFilteredReason,
  )?.raiFilteredReason;
  throw new Error(
    filtered
      ? `Vertex Imagen returned no image: ${filtered}`
      : "Vertex Imagen returned no image data",
  );
}

function openAiConfigured() {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() || process.env.OPENAPI_API_KEY?.trim(),
  );
}

function vertexConfigured() {
  return Boolean(
    (
      process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
    )?.trim(),
  );
}

function requestedAiImageProvider(): AiImageProvider {
  const raw = (process.env.AI_IMAGE_PROVIDER || "vertex").trim().toLowerCase();
  if (raw === "vertex" || raw === "google" || raw === "imagen") {
    return "vertex";
  }
  if (raw === "openai") {
    return "openai";
  }
  if (raw === "local") {
    return "local";
  }
  throw new Error("AI_IMAGE_PROVIDER must be vertex, openai, or local");
}

function withCatalogMode(info: Omit<AiImageProviderInfo, "catalogMode">) {
  const catalogMode = getCatalogProcessingMode();
  if (catalogMode === "preserve") {
    return {
      ...info,
      active: "local" as const,
      catalogMode,
      note: info.note
        ? `${info.note} Catalog mode: preserve (exact product pixels).`
        : "Catalog mode: preserve — keeps original print, color, logo, and buttons.",
    };
  }

  return {
    ...info,
    catalogMode,
    note: info.note
      ? `${info.note} Catalog mode: generative (AI may alter details).`
      : "Catalog mode: generative — AI may change print, color, or logo.",
  };
}

/** Pick a working image provider when env is incomplete (e.g. Vertex id missing but OpenAI key set). */
export function resolveAiImageProvider(): AiImageProviderInfo {
  const requested = requestedAiImageProvider();

  if (requested === "vertex") {
    if (vertexConfigured()) {
      return withCatalogMode({ active: "vertex", requested, ready: true });
    }
    if (openAiConfigured()) {
      return withCatalogMode({
        active: "openai",
        requested,
        ready: true,
        note: "GOOGLE_CLOUD_PROJECT_ID is not set — using OpenAI for catalog processing.",
      });
    }
    return withCatalogMode({
      active: "local",
      requested,
      ready: true,
      note: "Vertex and OpenAI are not configured — using local background cleanup only.",
    });
  }

  if (requested === "openai") {
    if (openAiConfigured()) {
      return withCatalogMode({ active: "openai", requested, ready: true });
    }
    if (vertexConfigured()) {
      return withCatalogMode({
        active: "vertex",
        requested,
        ready: true,
        note: "OPENAI_API_KEY is not set — using Vertex Imagen instead.",
      });
    }
    return withCatalogMode({
      active: "local",
      requested,
      ready: true,
      note: "OpenAI is not configured — using local background cleanup only.",
    });
  }

  return withCatalogMode({ active: "local", requested, ready: true });
}

export function getAiImageProviderInfo() {
  try {
    return resolveAiImageProvider();
  } catch (error) {
    return withCatalogMode({
      active: "local" as const,
      requested: process.env.AI_IMAGE_PROVIDER?.trim() || "vertex",
      ready: false,
      note:
        error instanceof Error
          ? error.message
          : "AI_IMAGE_PROVIDER must be vertex, openai, or local",
    });
  }
}

async function generateAiCatalogShoot(inputPath: string, prompt: string) {
  if (getCatalogProcessingMode() === "preserve") {
    return generateLocalCatalogShoot(inputPath);
  }

  const requested = requestedAiImageProvider();

  if (requested === "vertex" && vertexConfigured()) {
    return generateVertexImagenCatalogShoot(inputPath, prompt);
  }

  if (requested === "openai" && openAiConfigured()) {
    return generateOpenAiCatalogShoot(inputPath, prompt);
  }

  if (requested === "vertex" && openAiConfigured()) {
    return generateOpenAiCatalogShoot(inputPath, prompt);
  }

  if (requested === "openai" && vertexConfigured()) {
    return generateVertexImagenCatalogShoot(inputPath, prompt);
  }

  return generateLocalCatalogShoot(inputPath);
}

function pixelOffset(index: number) {
  return index * 4;
}

function colorDistance(
  buffer: Buffer,
  index: number,
  color: { r: number; g: number; b: number },
) {
  const offset = pixelOffset(index);
  const r = buffer[offset] ?? 0;
  const g = buffer[offset + 1] ?? 0;
  const b = buffer[offset + 2] ?? 0;
  return Math.sqrt(
    (r - color.r) ** 2 + (g - color.g) ** 2 + (b - color.b) ** 2,
  );
}

function averageEdgeColor(buffer: Buffer, width: number, height: number) {
  const samples: Array<{ r: number; g: number; b: number }> = [];
  const sampleSize = Math.min(24, Math.floor(Math.min(width, height) / 10));
  const corners = [
    [0, 0],
    [Math.max(0, width - sampleSize), 0],
    [0, Math.max(0, height - sampleSize)],
    [Math.max(0, width - sampleSize), Math.max(0, height - sampleSize)],
  ];

  for (const [startX, startY] of corners) {
    for (let y = startY; y < Math.min(height, startY + sampleSize); y += 1) {
      for (let x = startX; x < Math.min(width, startX + sampleSize); x += 1) {
        const offset = pixelOffset(y * width + x);
        const alpha = buffer[offset + 3] ?? 255;
        if (alpha < 32) continue;
        samples.push({
          r: buffer[offset] ?? 245,
          g: buffer[offset + 1] ?? 245,
          b: buffer[offset + 2] ?? 245,
        });
      }
    }
  }

  if (!samples.length) return { r: 245, g: 245, b: 245 };

  const total = samples.reduce(
    (current, item) => ({
      r: current.r + item.r,
      g: current.g + item.g,
      b: current.b + item.b,
    }),
    { r: 0, g: 0, b: 0 },
  );

  return {
    r: Math.round(total.r / samples.length),
    g: Math.round(total.g / samples.length),
    b: Math.round(total.b / samples.length),
  };
}

function pixelRgb(buffer: Buffer, index: number) {
  const offset = pixelOffset(index);
  return {
    r: buffer[offset] ?? 0,
    g: buffer[offset + 1] ?? 0,
    b: buffer[offset + 2] ?? 0,
    a: buffer[offset + 3] ?? 255,
  };
}

function isLightStudioPixel(r: number, g: number, b: number, strict = false) {
  const maxChannel = Math.max(r, g, b);
  const minChannel = Math.min(r, g, b);
  const chroma = maxChannel - minChannel;
  if (strict) {
    return minChannel > 210 && chroma < 22;
  }
  return minChannel > 188 && chroma < 38;
}

function isFloodBackground(
  buffer: Buffer,
  index: number,
  background: { r: number; g: number; b: number },
) {
  const { r, g, b, a } = pixelRgb(buffer, index);
  return (
    a < 32 ||
    colorDistance(buffer, index, background) < 62 ||
    isLightStudioPixel(r, g, b)
  );
}

function floodTransparentMask(
  buffer: Buffer,
  width: number,
  height: number,
  seeds: number[],
  matcher: (index: number) => boolean,
) {
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const stack = new Int32Array(totalPixels);
  let stackLength = 0;

  const push = (index: number) => {
    if (index < 0 || index >= totalPixels || visited[index]) return;
    if (!matcher(index)) return;
    visited[index] = 1;
    stack[stackLength] = index;
    stackLength += 1;
  };

  for (const seed of seeds) push(seed);

  while (stackLength > 0) {
    stackLength -= 1;
    const index = stack[stackLength];
    const x = index % width;

    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (index >= width) push(index - width);
    if (index < totalPixels - width) push(index + width);
  }

  for (let index = 0; index < totalPixels; index += 1) {
    if (!visited[index]) continue;
    const offset = pixelOffset(index);
    buffer[offset + 3] = 0;
  }
}

function removeInteriorStudioFill(
  buffer: Buffer,
  width: number,
  height: number,
) {
  const seeds: number[] = [];
  const topBand = Math.max(1, Math.floor(height * 0.22));
  const sideBand = Math.max(1, Math.floor(width * 0.18));
  const bottomBand = Math.max(1, Math.floor(height * 0.12));

  for (let x = 0; x < width; x += 4) {
    seeds.push(x);
    seeds.push((height - 1) * width + x);
  }

  for (let y = 0; y < topBand; y += 3) {
    for (let x = 0; x < width; x += 4) {
      seeds.push(y * width + x);
    }
  }

  for (let y = height - bottomBand; y < height; y += 2) {
    for (let x = Math.floor(width * 0.3); x < Math.floor(width * 0.7); x += 3) {
      seeds.push(y * width + x);
    }
  }

  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < sideBand; x += 4) {
      seeds.push(y * width + x);
      seeds.push(y * width + (width - 1 - x));
    }
  }

  const centerStart = Math.floor(width * 0.38);
  const centerEnd = Math.floor(width * 0.62);
  for (let x = centerStart; x < centerEnd; x += 2) {
    for (let y = 0; y < Math.floor(height * 0.1); y += 1) {
      seeds.push(y * width + x);
    }
  }

  floodTransparentMask(buffer, width, height, seeds, (index) => {
    const { r, g, b, a } = pixelRgb(buffer, index);
    if (a < 24) return false;
    return isMannequinPixel(r, g, b) || isLightStudioPixel(r, g, b, true);
  });
}

function trimMannequinSideBulges(
  buffer: Buffer,
  width: number,
  height: number,
) {
  for (let y = 0; y < height; y += 1) {
    let left = width;
    let right = -1;

    for (let x = 0; x < width; x += 1) {
      const { r, g, b, a } = pixelRgb(buffer, y * width + x);
      if (a < 24) continue;
      if (isMannequinPixel(r, g, b)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }

    if (right < left) continue;

    for (let x = 0; x < width; x += 1) {
      if (x >= left && x <= right) continue;
      const offset = pixelOffset(y * width + x);
      const { r, g, b, a } = pixelRgb(buffer, y * width + x);
      if (a < 24) continue;
      if (!isMannequinPixel(r, g, b)) continue;
      buffer[offset + 3] = 0;
    }
  }
}

function trimBottomMannequinPedestal(
  buffer: Buffer,
  width: number,
  height: number,
) {
  let cutFrom = height;

  for (let y = height - 1; y >= Math.floor(height * 0.5); y -= 1) {
    let mannequin = 0;
    let opaque = 0;

    for (let x = 0; x < width; x += 1) {
      const { r, g, b, a } = pixelRgb(buffer, y * width + x);
      if (a < 24) continue;
      opaque += 1;
      if (isMannequinPixel(r, g, b)) mannequin += 1;
    }

    if (opaque > width * 0.06 && mannequin / opaque > 0.5) {
      cutFrom = y;
      continue;
    }

    if (cutFrom < height) break;
  }

  for (let y = cutFrom; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      buffer[pixelOffset(y * width + x) + 3] = 0;
    }
  }
}

function removeNeckMannequinFill(
  buffer: Buffer,
  width: number,
  height: number,
) {
  const seeds: number[] = [];
  const topBand = Math.max(1, Math.floor(height * 0.08));
  const centerStart = Math.floor(width * 0.42);
  const centerEnd = Math.floor(width * 0.58);

  for (let x = centerStart; x < centerEnd; x += 1) {
    for (let y = 0; y < topBand; y += 1) {
      seeds.push(y * width + x);
    }
  }

  floodTransparentMask(buffer, width, height, seeds, (index) => {
    const { r, g, b, a } = pixelRgb(buffer, index);
    if (a < 24) return false;
    return isMannequinPixel(r, g, b, true);
  });
}

function isMannequinPixel(r: number, g: number, b: number, strict = false) {
  const maxChannel = Math.max(r, g, b);
  const minChannel = Math.min(r, g, b);
  const chroma = maxChannel - minChannel;
  if (strict) {
    return minChannel > 225 && chroma < 18;
  }
  return minChannel > 198 && chroma < 28;
}

function defringeWhiteHalos(buffer: Buffer, width: number, height: number) {
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const offset = pixelOffset(index);
      const alpha = buffer[offset + 3] ?? 0;
      if (alpha < 16 || alpha > 250) continue;

      const r = buffer[offset] ?? 0;
      const g = buffer[offset + 1] ?? 0;
      const b = buffer[offset + 2] ?? 0;
      if (r + g + b < 720) continue;

      const neighbors = [index - 1, index + 1, index - width, index + width];
      const transparentNeighbor = neighbors.some((neighbor) => {
        const neighborAlpha = buffer[pixelOffset(neighbor) + 3] ?? 0;
        return neighborAlpha < 24;
      });
      if (!transparentNeighbor) continue;

      buffer[offset] = Math.round(r * 0.9);
      buffer[offset + 1] = Math.round(g * 0.9);
      buffer[offset + 2] = Math.round(b * 0.9);
      buffer[offset + 3] = Math.min(alpha, 220);
    }
  }
}

function opaqueBounds(buffer: Buffer, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const alpha = buffer[pixelOffset(index) + 3] ?? 0;
      if (alpha < 24) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return { left: 0, top: 0, width, height };
  }

  const pad = Math.max(10, Math.round(Math.min(width, height) * 0.014));
  return {
    left: Math.max(0, minX - pad),
    top: Math.max(0, minY - pad),
    width: Math.min(width, maxX + pad + 1) - Math.max(0, minX - pad),
    height: Math.min(height, maxY + pad + 1) - Math.max(0, minY - pad),
  };
}

function transparentEdgeBackground(
  buffer: Buffer,
  width: number,
  height: number,
) {
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const stack = new Int32Array(totalPixels);
  const background = averageEdgeColor(buffer, width, height);
  let stackLength = 0;

  const push = (index: number) => {
    if (index < 0 || index >= totalPixels || visited[index]) return;
    if (!isFloodBackground(buffer, index, background)) return;
    visited[index] = 1;
    stack[stackLength] = index;
    stackLength += 1;
  };

  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }

  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }

  while (stackLength > 0) {
    stackLength -= 1;
    const index = stack[stackLength];
    const x = index % width;

    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (index >= width) push(index - width);
    if (index < totalPixels - width) push(index + width);
  }

  for (let index = 0; index < totalPixels; index += 1) {
    if (!visited[index]) continue;
    const offset = pixelOffset(index);
    buffer[offset + 3] = 0;
  }

  removeInteriorStudioFill(buffer, width, height);
  trimMannequinSideBulges(buffer, width, height);
  trimBottomMannequinPedestal(buffer, width, height);
  removeNeckMannequinFill(buffer, width, height);
  defringeWhiteHalos(buffer, width, height);

  return {
    buffer,
    trim: opaqueBounds(buffer, width, height),
  };
}

async function makeMyntraBackdrop(width: number, height: number) {
  const svg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="40%" r="78%">
          <stop offset="0%" stop-color="${CATALOG_BG_CENTER}" />
          <stop offset="100%" stop-color="${CATALOG_BG}" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
    </svg>`,
  );
  return sharp(svg).png().toBuffer();
}

async function makeMyntraFloorShadow(productWidth: number) {
  const shadowWidth = Math.max(80, Math.round(productWidth * 0.62));
  const shadowHeight = Math.max(18, Math.round(productWidth * 0.07));
  const svg = Buffer.from(
    `<svg width="${shadowWidth}" height="${shadowHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="floorShadow" cx="50%" cy="50%" rx="50%" ry="50%">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.14" />
          <stop offset="55%" stop-color="#000000" stop-opacity="0.06" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50%" cy="50%" rx="46%" ry="40%" fill="url(#floorShadow)" />
    </svg>`,
  );
  return sharp(svg).png().toBuffer();
}

async function polishProductLayer(product: Buffer) {
  const metadata = await sharp(product).metadata();
  const width = metadata.width ?? 1;
  const height = metadata.height ?? 1;
  const rgb = await sharp(product).removeAlpha().raw().toBuffer();
  const alpha = await sharp(product)
    .extractChannel("alpha")
    .blur(0.7)
    .raw()
    .toBuffer();

  return sharp(rgb, { raw: { width, height, channels: 3 } })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
}

async function generateLocalCatalogShoot(inputPath: string) {
  const raw = await sharp(inputPath)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = raw.info.width;
  const height = raw.info.height;
  const working = Buffer.from(raw.data);
  const { buffer, trim } = transparentEdgeBackground(working, width, height);
  const cutout = await sharp(buffer, { raw: { width, height, channels: 4 } })
    .extract(trim)
    .modulate({
      brightness: 1.02,
      saturation: 1.02,
    })
    .linear(1.02, -3)
    .png()
    .toBuffer();

  const canvasWidth = 1600;
  const canvasHeight = 2000;
  const maxProductWidth = Math.round(canvasWidth * 0.78);
  const maxProductHeight = Math.round(canvasHeight * 0.8);
  const productLayer = await polishProductLayer(
    await sharp(cutout)
      .resize({
        width: maxProductWidth,
        height: maxProductHeight,
        fit: "inside",
        withoutEnlargement: false,
      })
      .sharpen({ sigma: 0.25, m1: 0.35, m2: 0.65 })
      .png()
      .toBuffer(),
  );
  const productMeta = await sharp(productLayer).metadata();
  const productWidth = productMeta.width ?? canvasWidth;
  const productHeight = productMeta.height ?? canvasHeight;
  const left = Math.round((canvasWidth - productWidth) / 2);
  const top = Math.round((canvasHeight - productHeight) / 2);
  const floorShadow = await makeMyntraFloorShadow(productWidth);
  const shadowMeta = await sharp(floorShadow).metadata();
  const shadowWidth = shadowMeta.width ?? productWidth;
  const shadowHeight = shadowMeta.height ?? 24;
  const shadowLeft = left + Math.round((productWidth - shadowWidth) / 2);
  const shadowTop = top + productHeight - Math.round(shadowHeight * 0.55);
  const backdrop = await makeMyntraBackdrop(canvasWidth, canvasHeight);

  return sharp(backdrop)
    .composite([
      { input: floorShadow, left: shadowLeft, top: shadowTop },
      { input: productLayer, left, top },
    ])
    .png()
    .toBuffer();
}

async function processRecord(
  record: StudioImageRecord,
): Promise<StudioImageRecord> {
  const inputPath = absoluteFromProducts(record.rawPath);
  const currentTime = now();

  try {
    await stat(inputPath);

    const globalPrompt = await readStudioPromptTemplate();
    const prompt =
      record.useCustomPrompt && record.prompt?.trim()
        ? record.prompt.trim()
        : globalPrompt;
    const generated = await generateAiCatalogShoot(inputPath, prompt);
    const source = sharp(generated)
      .rotate()
      .flatten({ background: CATALOG_BG })
      .removeAlpha();

    const outputs = await writeProcessedOutputs(source, record);

    return {
      ...record,
      outputs,
      prompt,
      status: "processed",
      error: undefined,
      updatedAt: currentTime,
    };
  } catch (error) {
    return {
      ...record,
      status: "failed",
      error: error instanceof Error ? error.message : "Processing failed",
      updatedAt: currentTime,
    };
  }
}

export async function processStudioImages(ids?: string[], limit = 5) {
  const idSet = ids?.length ? new Set(ids) : null;
  const records = await readRecords();
  const allTargets = records.filter((record) =>
    idSet
      ? idSet.has(record.id) && record.status !== "approved"
      : record.status === "queued" ||
        record.status === "failed" ||
        record.status === "rejected",
  );
  const targets = allTargets.slice(0, Math.max(1, limit));
  const updated = new Map<string, StudioImageRecord>();

  for (const record of targets) {
    updated.set(
      record.id,
      await processRecord({
        ...record,
        status: "processing",
        updatedAt: now(),
      }),
    );
  }

  const next = records.map((record) => updated.get(record.id) ?? record);
  await writeRecords(next);

  return {
    processed: Array.from(updated.values()).map(withUrls),
    remaining: Math.max(0, allTargets.length - targets.length),
  };
}

function finalFilename(record: StudioImageRecord, sku: string) {
  const metadata = record.metadata;
  const parts = [
    metadata.category,
    metadata.collection,
    metadata.color ?? metadata.attributeValue,
    metadata.pattern,
    safeSegment(sku, record.id.slice(0, 8)),
  ];

  return `${parts.map((part) => slugify(part).toUpperCase()).join("_")}.jpg`;
}

async function removeRecordFiles(record: StudioImageRecord) {
  const paths = [
    record.rawPath,
    record.outputs?.webReady,
    record.outputs?.thumbnail,
    record.outputs?.zoom,
    record.outputs?.compressed,
    record.finalPath,
  ].filter(Boolean);

  await Promise.all(
    paths.map((item) =>
      rm(absoluteFromProducts(item!), { force: true }).catch(() => null),
    ),
  );

  if (record.finalPublicPath) {
    await rm(path.join(resolveAiStudioPublicRoot(), record.finalPublicPath), {
      force: true,
    }).catch(() => null);
  }
}

export async function updateStudioRecord(input: {
  id: string;
  action:
    | "approve"
    | "reject"
    | "reprocess"
    | "delete"
    | "catalog_shoot"
    | "update_prompt";
  sku?: string;
  note?: string;
  prompt?: string;
}) {
  const records = await readRecords();
  const record = records.find((item) => item.id === input.id);
  if (!record) throw new Error("Studio image not found");

  if (input.action === "delete") {
    await removeRecordFiles(record);
    const nextRecords = records.filter((item) => item.id !== record.id);
    await writeRecords(nextRecords);
    return withUrls({
      ...record,
      status: "rejected",
      qaNote: "Deleted",
      updatedAt: now(),
    });
  }

  let nextRecord = record;

  if (input.action === "catalog_shoot") {
    const shootStyle: StudioShootStyle = "current-style";
    nextRecord = {
      ...record,
      outputs: undefined,
      finalPath: undefined,
      finalUrl: undefined,
      finalPublicPath: undefined,
      finalPublicUrl: undefined,
      shootStyle,
      prompt: (await readStudioState()).promptTemplate,
      status: "queued",
      error: undefined,
      qaNote: "Strict AI flat-lay catalog prompt queued. Run process.",
      updatedAt: now(),
    };
  }

  if (input.action === "update_prompt") {
    if (typeof input.prompt !== "string" || !input.prompt.trim()) {
      throw new Error("Prompt required");
    }
    const globalPrompt = await readStudioPromptTemplate();
    const trimmed = input.prompt.trim();
    nextRecord = {
      ...record,
      prompt: trimmed,
      useCustomPrompt: trimmed !== globalPrompt.trim(),
      updatedAt: now(),
    };
  }

  if (input.action === "reprocess") {
    const globalPrompt = await readStudioPromptTemplate();
    const prompt =
      record.useCustomPrompt && record.prompt?.trim()
        ? record.prompt.trim()
        : globalPrompt;
    nextRecord = await processRecord({
      ...record,
      prompt,
      status: "processing",
      updatedAt: now(),
    });
  }

  if (input.action === "reject") {
    nextRecord = {
      ...record,
      status: "rejected",
      qaNote: input.note?.trim() || "Rejected in manual QA",
      updatedAt: now(),
    };
  }

  if (input.action === "approve") {
    if (!record.outputs?.webReady)
      throw new Error("Process image before approval");

    const filename = finalFilename(record, input.sku || record.id.slice(0, 8));
    const finalPath = path.join(
      resolveAiStudioProductsRoot(),
      "final",
      record.metadata.category,
      record.metadata.collection,
      record.metadata.attributeType,
      record.metadata.attributeValue,
      filename,
    );
    const publicRelativePath = path.join(
      record.metadata.category,
      record.metadata.collection,
      record.metadata.attributeType,
      record.metadata.attributeValue,
      filename,
    );
    const publicPath = path.join(
      resolveAiStudioPublicRoot(),
      publicRelativePath,
    );
    await mkdir(path.dirname(finalPath), { recursive: true });
    await mkdir(path.dirname(publicPath), { recursive: true });
    if (record.finalPath)
      await rm(absoluteFromProducts(record.finalPath), { force: true }).catch(
        () => null,
      );
    if (record.finalPublicPath)
      await rm(path.join(resolveAiStudioPublicRoot(), record.finalPublicPath), {
        force: true,
      }).catch(() => null);

    await sharp(absoluteFromProducts(record.outputs.webReady))
      .resize({
        width: 2000,
        height: 2500,
        fit: "inside",
        background: "#ffffff",
      })
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(finalPath)
      .catch(async () =>
        copyFile(absoluteFromProducts(record.outputs!.webReady), finalPath),
      );

    await copyFile(finalPath, publicPath);

    nextRecord = {
      ...record,
      status: "approved",
      finalPath: relativeToProducts(finalPath),
      finalUrl: fileUrl(relativeToProducts(finalPath)),
      finalPublicPath: publicRelativePath,
      finalPublicUrl: publicAiUrl(publicRelativePath),
      qaNote: input.note?.trim() || "Approved for CMS upload",
      updatedAt: now(),
    };
  }

  const nextRecords = records.map((item) =>
    item.id === record.id ? nextRecord : item,
  );
  await writeRecords(nextRecords);

  return withUrls(nextRecord);
}

export async function replaceStudioRawImage(id: string, file: File) {
  const records = await readRecords();
  const record = records.find((item) => item.id === id);
  if (!record) throw new Error("Studio image not found");
  if (!isAllowedImage(file.name) && !file.type.startsWith("image/"))
    throw new Error("Only JPG, PNG, or WEBP allowed");

  const rawDir = path.dirname(absoluteFromProducts(record.rawPath));
  await removeRecordFiles(record).catch(() => null);
  await mkdir(rawDir, { recursive: true });

  const extension = extensionFromFileName(file.name);
  const rawPath = path.join(
    rawDir,
    `${Date.now()}-${randomUUID()}.${extension}`,
  );
  await writeFile(rawPath, Buffer.from(await file.arrayBuffer()));

  const nextRecord: StudioImageRecord = {
    ...record,
    originalName: file.name,
    rawPath: relativeToProducts(rawPath),
    rawUrl: fileUrl(relativeToProducts(rawPath)),
    outputs: undefined,
    finalPath: undefined,
    finalUrl: undefined,
    finalPublicPath: undefined,
    finalPublicUrl: undefined,
    status: "queued",
    qaNote: "Raw image replaced. Reprocess required.",
    error: undefined,
    updatedAt: now(),
  };

  const nextRecords = records.map((item) =>
    item.id === id ? nextRecord : item,
  );
  await writeRecords(nextRecords);
  return withUrls(nextRecord);
}

export function getProductFileStream(relativePath: string) {
  const absolute = absoluteFromProducts(relativePath);
  return createReadStream(absolute);
}

export function contentTypeForProductFile(relativePath: string) {
  const extension = relativePath.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}
