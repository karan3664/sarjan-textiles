const maxBytes = 4 * 1024 * 1024;

export type AvatarUploadPayload = {
  buffer: Buffer;
  mime: string;
  filename: string;
};

function isNativeClient(request: Request) {
  return request.headers.get("x-sarjan-native-client") === "1";
}

function isImageMimeOrName(mime: string, filename: string) {
  return (
    mime.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(filename)
  );
}

/** React Native axios multipart is unreliable with Next.js — accept JSON base64 from the app. */
async function readNativeJsonUpload(
  request: Request,
): Promise<AvatarUploadPayload | Response> {
  let body: { fileBase64?: string; mime?: string; filename?: string };
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
    return Response.json({ error: "Image file required" }, { status: 400 });
  }

  const mime = String(body.mime ?? "image/jpeg").trim() || "image/jpeg";
  const filename = String(body.filename ?? "avatar.jpg").trim() || "avatar.jpg";
  if (!isImageMimeOrName(mime, filename)) {
    return Response.json(
      { error: "Only image uploads allowed" },
      { status: 400 },
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(raw, "base64");
  } catch {
    return Response.json(
      { error: "Could not read image file" },
      { status: 400 },
    );
  }

  if (!buffer.byteLength) {
    return Response.json({ error: "Image file required" }, { status: 400 });
  }
  if (buffer.byteLength > maxBytes) {
    return Response.json({ error: "Image must be under 4MB" }, { status: 400 });
  }

  return { buffer, mime, filename };
}

async function readMultipartUpload(
  request: Request,
): Promise<AvatarUploadPayload | Response> {
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
    return Response.json({ error: "Image file required" }, { status: 400 });
  }
  if (!isImageMimeOrName(file.type, file.name)) {
    return Response.json(
      { error: "Only image uploads allowed" },
      { status: 400 },
    );
  }
  if (file.size > maxBytes) {
    return Response.json({ error: "Image must be under 4MB" }, { status: 400 });
  }

  return {
    buffer: Buffer.from(await file.arrayBuffer()),
    mime: file.type,
    filename: file.name,
  };
}

export async function readAvatarUploadBody(
  request: Request,
): Promise<AvatarUploadPayload | Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (isNativeClient(request) && contentType.includes("application/json")) {
    return readNativeJsonUpload(request);
  }
  return readMultipartUpload(request);
}
