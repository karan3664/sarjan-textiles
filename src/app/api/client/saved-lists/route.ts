import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import {
  readClientSavedListsRecord,
  saveClientSavedLists,
} from "@/lib/local-db";

export async function GET(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;
  const record = await readClientSavedListsRecord(auth.session.clientId);
  return Response.json({
    wishlist: record.wishlist,
    compare: record.compare,
    updatedAt: record.updatedAt,
  });
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedClientRequest(request);
    if (auth instanceof Response) return auth;
    const body = await request.json();
    const lists = await saveClientSavedLists(auth.session.clientId, {
      wishlist: Array.isArray(body.wishlist) ? body.wishlist : [],
      compare: Array.isArray(body.compare) ? body.compare : [],
    });
    const record = await readClientSavedListsRecord(auth.session.clientId);
    return Response.json({ ...lists, updatedAt: record.updatedAt });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Could not save lists",
      },
      { status: 400 },
    );
  }
}
