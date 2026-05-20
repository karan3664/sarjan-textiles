import { verifyAdminToken } from "@/lib/admin-token";
import {
  findClientFieldDuplicate,
  type ClientUniqueFields,
} from "@/lib/client-duplicate-check";
import { bearerToken, verifyClientToken } from "@/lib/client-token";
import { readLocalDb } from "@/lib/local-db";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const excludeClientId =
      body.excludeClientId != null
        ? String(body.excludeClientId).trim()
        : undefined;

    if (excludeClientId) {
      const clientSession = verifyClientToken(bearerToken(request));
      const adminSession = await verifyAdminToken(
        (await cookies()).get("sarjan-admin-session")?.value,
      );
      const selfUpdate = clientSession?.clientId === excludeClientId;
      const adminOk =
        adminSession &&
        ["super_admin", "admin", "sales"].includes(adminSession.role);
      if (!selfUpdate && !adminOk) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const fields: ClientUniqueFields = {};
    if (body.email != null && String(body.email).trim()) {
      fields.email = String(body.email);
    }
    if (body.phone != null && String(body.phone).trim()) {
      fields.phone = String(body.phone);
    }
    if (body.gst != null && String(body.gst).trim()) {
      fields.gst = String(body.gst);
    }

    if (!fields.email && !fields.phone && !fields.gst) {
      return Response.json(
        { error: "Provide email, phone, or GST to check" },
        { status: 400 },
      );
    }

    const db = await readLocalDb();
    const duplicate = findClientFieldDuplicate(
      db.clients,
      fields,
      excludeClientId,
    );
    if (duplicate) {
      return Response.json(
        { ok: false, field: duplicate.field, error: duplicate.message },
        { status: 409 },
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Uniqueness check failed",
      },
      { status: 500 },
    );
  }
}
