import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import {
  getAiUserPreferences,
  saveAiUserPreferences,
} from "@/lib/ai-chat/store";
import { normalizeAiLanguage } from "@/lib/ai-chat/session-lifecycle";

export async function GET(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;

  const prefs = await getAiUserPreferences(auth.session.clientId);
  return Response.json({
    language: prefs?.language ?? "en",
    hasPreference: Boolean(prefs),
    updatedAt: prefs?.updatedAt ?? null,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;

  let body: { language?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const language = normalizeAiLanguage(body.language);
  const prefs = await saveAiUserPreferences(auth.session.clientId, language);
  return Response.json(prefs);
}
