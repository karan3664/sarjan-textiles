import { AdminProductReviewsClient } from "@/components/admin/AdminProductReviewsClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getReviewDashboardMetrics, listAllReviews } from "@/lib/reviews-store";

export const dynamic = "force-dynamic";

export default async function AdminProductReviewsPage() {
  const [reviews, metrics] = await Promise.all([
    listAllReviews(),
    getReviewDashboardMetrics(),
  ]);

  return (
    <AdminTemplateChrome active="productReviews" title="Product reviews">
      <p className="body-text-1 mb_20">
        Only <strong>approved</strong> verified-purchase reviews appear on the
        website and mobile app. Rejected and hidden reviews are never shown
        publicly.
      </p>
      <AdminProductReviewsClient
        initialReviews={reviews}
        initialMetrics={metrics}
      />
    </AdminTemplateChrome>
  );
}
