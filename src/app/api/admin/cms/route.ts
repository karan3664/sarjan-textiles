import { getCmsSnapshot, saveCmsSnapshot } from "@/lib/cms-store";

export async function GET() {
  return Response.json(await getCmsSnapshot());
}

export async function PUT(request: Request) {
  const body = await request.json();
  return Response.json(await saveCmsSnapshot(body));
}
