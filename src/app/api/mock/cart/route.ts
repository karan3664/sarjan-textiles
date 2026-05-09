import { getCartItems } from "@/lib/mock-api";

export function GET() {
  return Response.json({ items: getCartItems() });
}
