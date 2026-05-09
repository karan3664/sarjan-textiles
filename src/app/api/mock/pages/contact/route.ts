import { mockApi } from "@/lib/mock-api";

export function GET() {
  return Response.json(mockApi.pages.contact);
}
