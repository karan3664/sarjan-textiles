import { getCachedCmsSnapshot } from "@/lib/cms-store";

export async function GET() {
  const { home } = await getCachedCmsSnapshot();
  return Response.json(home.hero);
}
