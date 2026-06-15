const imageMaxBytes = 6 * 1024 * 1024;
const videoMaxBytes = 40 * 1024 * 1024;

export type ReviewUploadPayload = {
  buffer: Buffer;
  mime: string;
  filename: string;
  kind: "image" | "video";
};

function isNativeClient(request: Request) {
  return request.headers.get("x-sarjan-native-client") === "1";
}

function isImage(mime: string, filename: string) {
  return (
    mime.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(filename)
  );
}

function isVideo(mime: string, filename: string) {
  return mime.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(filename);
}

/** React Native multipart is unreliable with Next.js — accept JSON base64 from the app. */
async function readNativeJsonUpload(
  request: Request,
): Promise<ReviewUploadPayload | Response> {
  let body: {
    fileBase64?: string;
    mime?: string;
    filename?: string;
    kind?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { error: "Invalid JSON upload body" },
      { status: 400 },
    );
  }

  const raw = typeof body.fileBase64 === "string" ? body.fileBase64.trim() : "";
  if (!raw) {
    return Response.json({ error: "File required" }, { status: 400 });
  }

  const mime = String(body.mime ?? "image/jpeg").trim() || "image/jpeg";
  const filename = String(body.filename ?? "review.jpg").trim() || "review.jpg";
  const kind = body.kind === "video" ? "video" : "image";

  if (kind === "video") {
    if (!isVideo(mime, filename)) {
      return Response.json(
        { error: "Image or video file required." },
        { status: 400 },
      );
    }
  } else if (!isImage(mime, filename)) {
    return Response.json(
      { error: "Image or video file required." },
      { status: 400 },
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(raw, "base64");
  } catch {
    return Response.json({ error: "Could not read file" }, { status: 400 });
  }

  if (!buffer.byteLength) {
    return Response.json({ error: "File required" }, { status: 400 });
  }

  const maxBytes = kind === "video" ? videoMaxBytes : imageMaxBytes;
  if (buffer.byteLength > maxBytes) {
    return Response.json(
      {
        error:
          kind === "video"
            ? "Video must be under 40 MB."
            : "Image must be under 6 MB.",
      },
      { status: 400 },
    );
  }

  return { buffer, mime, filename, kind };
}

async function readMultipartUpload(
  request: Request,
): Promise<ReviewUploadPayload | Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse upload";
    return Response.json({ error: message }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "File required" }, { status: 400 });
  }

  const kindField = String(formData.get("kind") ?? "image");
  const kind: ReviewUploadPayload["kind"] =
    kindField === "video" || isVideo(file.type, file.name) ? "video" : "image";
  const buffer = Buffer.from(await file.arrayBuffer());
  const maxBytes = kind === "video" ? videoMaxBytes : imageMaxBytes;

  if (buffer.byteLength > maxBytes) {
    return Response.json(
      {
        error:
          kind === "video"
            ? "Video must be under 40 MB."
            : "Image must be under 6 MB.",
      },
      { status: 400 },
    );
  }

  if (kind === "video" && !isVideo(file.type, file.name)) {
    return Response.json(
      { error: "Image or video file required." },
      { status: 400 },
    );
  }
  if (kind === "image" && !isImage(file.type, file.name)) {
    return Response.json(
      { error: "Image or video file required." },
      { status: 400 },
    );
  }

  return {
    buffer,
    mime: file.type,
    filename: file.name,
    kind,
  };
}

export async function readReviewUploadBody(
  request: Request,
): Promise<ReviewUploadPayload | Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (isNativeClient(request) && contentType.includes("application/json")) {
    return readNativeJsonUpload(request);
  }
  return readMultipartUpload(request);
}
