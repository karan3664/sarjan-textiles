import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { getClientSavedLists, saveClientSavedLists } from "@/lib/local-db";

export async function GET(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;
  const lists = await getClientSavedLists(auth.session.clientId);
  return Response.json(lists);
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
    return Response.json(lists);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Could not save lists",
      },
      { status: 400 },
    );
  }
}
