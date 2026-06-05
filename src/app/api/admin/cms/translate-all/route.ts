import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-token";
import {
  ensureCmsLocalized,
  getCmsLocalizationStatus,
} from "@/lib/cms-locale-sync";
import {
  appendAuditLog,
  getCmsSnapshot,
  saveCmsSnapshot,
} from "@/lib/cms-store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function requireAdmin() {
  return verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json(
        { error: "Admin login required" },
        { status: 401 },
      );
    }

    const cms = await getCmsSnapshot();
    const status = getCmsLocalizationStatus(cms);

    return NextResponse.json({
      ...status,
      pendingLabels: status.pendingSections.map((key) => status.labels[key]),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load translation status",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json(
        { error: "Admin login required" },
        { status: 401 },
      );
    }

    const before = await getCmsSnapshot();
    const beforeStatus = getCmsLocalizationStatus(before);

    if (!beforeStatus.pending) {
      return NextResponse.json({
        ok: true,
        changed: false,
        message: "All Hindi and Gujarati translations are already up to date.",
        ...beforeStatus,
        pendingLabels: [],
      });
    }

    const synced = await ensureCmsLocalized(before);
    if (synced.changed) {
      await saveCmsSnapshot(synced.cms);
    }

    const afterStatus = getCmsLocalizationStatus(synced.cms);

    await appendAuditLog({
      actor: session.email,
      role: session.role,
      action: "translate_all_cms",
      entity: "cms_snapshot",
      entityId: "localization",
      note: synced.changed
        ? `Translated: ${beforeStatus.pendingSections.join(", ")}`
        : "No changes after translate run",
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      changed: synced.changed,
      message: synced.changed
        ? "Hindi and Gujarati translations generated and saved."
        : "Translation run finished with no remaining changes.",
      translatedSections: beforeStatus.pendingSections,
      translatedLabels: beforeStatus.pendingSections.map(
        (key) => beforeStatus.labels[key],
      ),
      ...afterStatus,
      pendingLabels: afterStatus.pendingSections.map(
        (key) => afterStatus.labels[key],
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Translation failed";
    const hint = message.includes("429")
      ? " Translation API rate limit hit — wait a minute and retry, or add OPENAI_API_KEY for faster bulk translate."
      : message.includes("OpenAI")
        ? " Add a valid OPENAI_API_KEY in .env for reliable bulk translation."
        : "";

    return NextResponse.json({ error: `${message}${hint}` }, { status: 500 });
  }
}
