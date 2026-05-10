import { dashboard } from "@/data/mock";

export async function GET() {
  return Response.json(dashboard);
}
