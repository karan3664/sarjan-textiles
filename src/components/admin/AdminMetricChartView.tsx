"use client";

import dynamic from "next/dynamic";
import type { ComponentProps, ComponentType } from "react";

export type {
  AdminMetricChartKind,
  AdminMetricChartRow,
} from "@/components/admin/AdminMetricChartViewInner";

/** Recharts must not run during Next SSR (Global.isSsr hides cartesian axis ticks). */
export const AdminMetricChartView = dynamic(
  () =>
    import("@/components/admin/AdminMetricChartViewInner").then(
      (mod) => mod.AdminMetricChartViewInner,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="sarjan-report-chart-measure sarjan-report-chart-empty"
        style={{ minHeight: 320 }}
        aria-busy="true"
      />
    ),
  },
) as ComponentType<
  ComponentProps<
    typeof import("@/components/admin/AdminMetricChartViewInner").AdminMetricChartViewInner
  >
>;
