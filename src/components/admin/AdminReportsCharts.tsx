"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminMetricChartView } from "@/components/admin/AdminMetricChartView";
import type { AdminReportsData } from "@/lib/admin-reports";
import {
  formatChartValue,
  getReportCharts,
  type ReportKey,
} from "@/lib/admin-report-charts";

function ChartTooltip({
  active,
  payload,
  label,
  report,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; color?: string }>;
  label?: string;
  report: ReportKey;
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
          <strong>{formatChartValue(Number(entry.value ?? 0), report)}</strong>
        </div>
      ))}
    </div>
  );
}

export function AdminReportsCharts({
  report,
  data,
}: {
  report: ReportKey;
  data: AdminReportsData;
}) {
  const charts = useMemo(() => getReportCharts(report, data), [report, data]);
  const [chartId, setChartId] = useState(charts[0]?.id ?? "");

  useEffect(() => {
    setChartId(charts[0]?.id ?? "");
  }, [report, charts]);

  const selected = charts.find((chart) => chart.id === chartId) ?? charts[0];

  if (!charts.length) return null;

  return (
    <div className="sarjan-report-charts-box mb-24">
      <div className="sarjan-report-charts-head">
        <div>
          <h5>Charts & graphs</h5>
          <div className="body-text text-secondary">
            Select a chart for the active report tab. Updates when you switch
            report type.
          </div>
        </div>
        <div className="tf-select sarjan-report-chart-select">
          <select
            value={selected?.id ?? ""}
            onChange={(event) => setChartId(event.target.value)}
            aria-label="Select chart"
          >
            {charts.map((chart) => (
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
              key={`${report}-${selected.id}`}
              data={selected.data}
              kind={selected.kind}
              tickFormatter={(value) => formatChartValue(value, report)}
              seriesName={selected.label}
              value2Label={selected.value2Label}
              tooltip={<ChartTooltip report={report} />}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
