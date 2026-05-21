"use client";

import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { Global } from "recharts";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  pieSliceLabel,
  reportChartColors,
  reportChartMargins,
  reportChartXAxisProps,
  reportChartYAxisProps,
} from "@/lib/admin-report-charts";

export type AdminMetricChartKind = "line" | "bar" | "area" | "pie";

export type AdminMetricChartRow = {
  name: string;
  value: number;
  value2?: number;
};

const MIN_CHART_WIDTH = 280;

/** Recharts skips axes/grid when width is 0 on first paint — measure container first. */
function useChartCanvasWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      const next = Math.round(node.getBoundingClientRect().width);
      setWidth((prev) => (prev === next ? prev : next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width: width >= MIN_CHART_WIDTH ? width : 0 };
}

/** Client-only chart body (loaded via dynamic import so Recharts isSsr stays false). */
export function AdminMetricChartViewInner({
  data,
  kind,
  tickFormatter,
  tooltip,
  seriesName,
  value2Label,
  height = 320,
  yAxisWidth = 72,
  maxBarSize = 48,
}: {
  data: AdminMetricChartRow[];
  kind: AdminMetricChartKind;
  tickFormatter: (value: number) => string;
  tooltip: ReactElement;
  seriesName: string;
  value2Label?: string;
  height?: number;
  yAxisWidth?: number;
  maxBarSize?: number;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Global.set("isSsr", false);
    setReady(true);
  }, []);

  const colors = reportChartColors();
  const { ref, width } = useChartCanvasWidth();
  const hasSecondSeries = data.some(
    (row) => row.value2 != null && row.value2 > 0,
  );

  if (!data.length) {
    return (
      <div className="sarjan-empty-state sarjan-report-chart-empty">
        No data for this chart.
      </div>
    );
  }

  if (!ready || width <= 0) {
    return (
      <div
        ref={ref}
        className="sarjan-report-chart-measure"
        style={{ width: "100%", minHeight: height }}
        aria-hidden={!ready}
      />
    );
  }

  if (kind === "pie") {
    return (
      <div ref={ref} className="sarjan-report-chart-measure" style={{ height }}>
        <PieChart width={width} height={height}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={56}
            outerRadius={110}
            paddingAngle={2}
            label={pieSliceLabel}
            labelLine={false}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={tooltip} />
          <Legend />
        </PieChart>
      </div>
    );
  }

  const crowded = data.length > 5;
  const margin = reportChartMargins(data.length);
  const xAxis = reportChartXAxisProps(data.length);
  const yAxis = reportChartYAxisProps(yAxisWidth);

  const gridAndAxes = (
    <>
      <CartesianGrid
        strokeDasharray="3 3"
        stroke="rgba(24, 24, 24, 0.14)"
        vertical={false}
      />
      <XAxis
        dataKey={xAxis.dataKey}
        height={xAxis.height}
        interval={xAxis.interval}
        angle={xAxis.angle}
        textAnchor={xAxis.textAnchor}
        dy={xAxis.dy}
        tick={xAxis.tick}
        axisLine={xAxis.axisLine}
        tickLine={xAxis.tickLine}
      />
      <YAxis
        width={yAxis.width}
        tick={yAxis.tick}
        tickMargin={yAxis.tickMargin}
        tickFormatter={tickFormatter}
        axisLine={yAxis.axisLine}
        tickLine={yAxis.tickLine}
      />
      <Tooltip content={tooltip} />
    </>
  );

  const chartKey = `${kind}-${width}-${height}-${data.length}`;

  const chartBody =
    kind === "line" ? (
      <LineChart
        key={chartKey}
        width={width}
        height={height}
        data={data}
        margin={margin}
      >
        {gridAndAxes}
        <Line
          type="monotone"
          dataKey="value"
          name={seriesName}
          stroke={colors[0]}
          strokeWidth={2.5}
          dot={{ r: 4, fill: colors[0] }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    ) : kind === "area" ? (
      <AreaChart
        key={chartKey}
        width={width}
        height={height}
        data={data}
        margin={margin}
      >
        {gridAndAxes}
        <Area
          type="monotone"
          dataKey="value"
          name={seriesName}
          stroke={colors[0]}
          fill={colors[0]}
          fillOpacity={0.18}
          strokeWidth={2}
        />
      </AreaChart>
    ) : (
      <BarChart
        key={chartKey}
        width={width}
        height={height}
        data={data}
        margin={margin}
      >
        {gridAndAxes}
        {hasSecondSeries ? <Legend /> : null}
        <Bar
          dataKey="value"
          name={hasSecondSeries ? "Available" : seriesName}
          fill={colors[0]}
          radius={[6, 6, 0, 0]}
          maxBarSize={maxBarSize}
        />
        {hasSecondSeries ? (
          <Bar
            dataKey="value2"
            name={value2Label ?? "Series 2"}
            fill={colors[1]}
            radius={[6, 6, 0, 0]}
            maxBarSize={maxBarSize}
          />
        ) : null}
      </BarChart>
    );

  return (
    <div
      ref={ref}
      className="sarjan-report-chart-measure"
      style={{ width: "100%", minHeight: height }}
    >
      {chartBody}
    </div>
  );
}
