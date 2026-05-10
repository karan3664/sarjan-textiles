import { getCmsSnapshot, saveCmsSnapshot } from "@/lib/cms-store";

export async function GET() {
  return Response.json(await getCmsSnapshot());
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    return Response.json(await saveCmsSnapshot(body));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "CMS save failed" },
      { status: 400 },
    );
  }
}
