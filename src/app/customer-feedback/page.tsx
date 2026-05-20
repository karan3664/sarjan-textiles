import { redirect } from "next/navigation";

/** Legacy URL — feedback lives on /order-feedback now. */
export default function CustomerFeedbackRedirect() {
  redirect("/order-feedback");
}
