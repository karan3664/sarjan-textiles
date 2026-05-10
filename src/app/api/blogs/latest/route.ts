import { getCachedCmsSnapshot } from "@/lib/cms-store";

export async function GET() {
  const { blogs } = await getCachedCmsSnapshot();
  return Response.json({ blogs: blogs.slice(0, 6) });
}
