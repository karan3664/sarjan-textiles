export type ClientAccountStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "inactive";

/** Non-null when the client must not use authenticated storefront APIs. */
export function clientStatusAuthError(
  status: ClientAccountStatus,
): string | null {
  if (status === "approved") return null;
  if (status === "pending") {
    return "Your wholesale account is still under review. You will receive an email once it is approved; after that you can sign in to view prices and place orders.";
  }
  if (status === "rejected") {
    return "Your registration could not be approved. Please contact Sarjan Textiles if you believe this is a mistake.";
  }
  return "Your account is not active. Please contact Sarjan Textiles.";
}
