function readCronSecret(request: Request) {
  const configured = process.env.CRON_SECRET?.trim();
  if (!configured) {
    return { configured: "", provided: "", ok: true };
  }

  const auth = request.headers.get("authorization")?.trim() ?? "";
  const headerSecret = request.headers.get("x-cron-secret")?.trim() ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";

  const provided = bearer || headerSecret;
  return {
    configured,
    provided,
    ok: provided === configured,
  };
}

export function verifyCronRequest(request: Request) {
  const { configured, ok } = readCronSecret(request);
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      return Response.json(
        { error: "CRON_SECRET is required in production" },
        { status: 503 },
      );
    }
    return null;
  }
  if (!ok) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
