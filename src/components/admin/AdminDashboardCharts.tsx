"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminMetricChartView } from "@/components/admin/AdminMetricChartView";
import type { AdminMetricChartKind } from "@/components/admin/AdminMetricChartView";

type ChartPoint = { label: string; value: number };

type DashboardCharts = {
  monthlyOrders: ChartPoint[];
  monthlySales: ChartPoint[];
  clientSignups: ChartPoint[];
  clientActivity: ChartPoint[];
  dispatchTrend: ChartPoint[];
  monthlyUnitsSold: ChartPoint[];
  stockSnapshot: ChartPoint[];
  productDemand: ChartPoint[];
};

type DashboardChartDefinition = {
  id: string;
  label: string;
  kind: AdminMetricChartKind;
  description: string;
  format: "number" | "currency";
  data: Array<{ name: string; value: number }>;
};

function toSeries(data: ChartPoint[]) {
  return data.map((point) => ({ name: point.label, value: point.value }));
}

function formatDashboardValue(value: number, format: "number" | "currency") {
  if (format === "currency" && value >= 100) {
    return `₹${Math.round(value).toLocaleString("en-IN")}`;
  }
  return Math.round(value).toLocaleString("en-IN");
}

function getDashboardCharts(
  charts: DashboardCharts,
): DashboardChartDefinition[] {
  return [
    {
      id: "sales",
      label: "Order sales",
      kind: "area",
      description: "Total order value (last 6 months).",
      format: "currency",
      data: toSeries(charts.monthlySales),
    },
    {
      id: "orders",
      label: "Orders count",
      kind: "line",
      description: "Orders created per month.",
      format: "number",
      data: toSeries(charts.monthlyOrders),
    },
    {
      id: "clients",
      label: "New clients",
      kind: "bar",
      description: "Client registrations per month.",
      format: "number",
      data: toSeries(charts.clientSignups),
    },
    {
      id: "dispatch",
      label: "Dispatch & delivery",
      kind: "line",
      description: "Dispatched or delivered orders per month.",
      format: "number",
      data: toSeries(charts.dispatchTrend),
    },
    {
      id: "stock-units",
      label: "Units sold",
      kind: "bar",
      description: "Sets / pieces sold per month.",
      format: "number",
      data: toSeries(charts.monthlyUnitsSold),
    },
    {
      id: "client-orders",
      label: "Top clients (orders)",
      kind: "bar",
      description: "Order count by client.",
      format: "number",
      data: toSeries(charts.clientActivity),
    },
    {
      id: "demand",
      label: "Top products (demand)",
      kind: "bar",
      description: "Best sellers by quantity ordered.",
      format: "number",
      data: toSeries(charts.productDemand),
    },
    {
      id: "stock-health",
      label: "Stock health",
      kind: "pie",
      description: "Healthy, low stock, and out of stock SKUs.",
      format: "number",
      data: toSeries(charts.stockSnapshot),
    },
  ];
}

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; color?: string }>;
  label?: string;
  format: "number" | "currency";
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="sarjan-report-chart-tooltip">
      <div className="sarjan-report-chart-tooltip__label">{label}</div>
      {payload.map((entry) => (
        <div
          key={String(entry.name)}
          className="sarjan-report-chart-tooltip__row"
        >
          <span
            className="sarjan-report-chart-tooltip__dot"
            style={{ background: entry.color }}
          />
          <span>{entry.name}:</span>
          <strong>
            {formatDashboardValue(Number(entry.value ?? 0), format)}
          </strong>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboardCharts({ charts }: { charts: DashboardCharts }) {
  const chartOptions = useMemo(() => getDashboardCharts(charts), [charts]);
  const [chartId, setChartId] = useState(chartOptions[0]?.id ?? "");

  useEffect(() => {
    setChartId(chartOptions[0]?.id ?? "");
  }, [chartOptions]);

  const selected =
    chartOptions.find((chart) => chart.id === chartId) ?? chartOptions[0];

  if (!chartOptions.length) return null;

  return (
    <div className="sarjan-report-charts-box mb-24">
      <div className="sarjan-report-charts-head">
        <div>
          <h5>Charts & graphs</h5>
          <div className="body-text text-secondary">
            Select a chart to explore dashboard metrics. Same layout as Reports.
          </div>
        </div>
        <div className="tf-select sarjan-report-chart-select">
          <select
            value={selected?.id ?? ""}
            onChange={(event) => setChartId(event.target.value)}
            aria-label="Select chart"
          >
            {chartOptions.map((chart) => (
              <option value={chart.id} key={chart.id}>
                {chart.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {selected ? (
        <>
          <p className="text-caption-1 text-secondary mb-16">
            {selected.description}
          </p>
          <div className="sarjan-report-chart-canvas">
            <AdminMetricChartView
              key={selected.id}
              data={selected.data}
              kind={selected.kind}
              tickFormatter={(value) =>
                formatDashboardValue(value, selected.format)
              }
              seriesName={selected.label}
              yAxisWidth={selected.format === "currency" ? 96 : 80}
              tooltip={<ChartTooltip format={selected.format} />}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
