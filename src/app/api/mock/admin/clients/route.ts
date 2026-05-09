import { mockApi } from "@/lib/mock-api";

export function GET() {
  return Response.json(mockApi.admin.clients);
}
