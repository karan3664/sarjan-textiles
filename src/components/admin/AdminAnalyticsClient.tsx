"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminMetricChartView } from "@/components/admin/AdminMetricChartView";
import type { ClientActivityRow } from "@/lib/client-activity";
import type { SentryCrashSummary } from "@/lib/sentry-admin";

type InstallAnalytics = {
  summary: {
    totalInstalls: number;
    androidInstalls: number;
    iosInstalls: number;
    dau: number;
    mau: number;
    installsToday: number;
    installsWeek: number;
    installsMonth: number;
  };
  installTrend: Array<{ date: string; android: number; ios: number }>;
  activeTrend: Array<{ date: string; dau: number }>;
};

type UserAnalytics = {
  segments: { active: number; inactive: number; dormant: number };
  clients: ClientActivityRow[];
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string }>;
  label?: string;
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
          <span>{entry.name}</span>
          <strong>
            {Math.round(Number(entry.value ?? 0)).toLocaleString("en-IN")}
          </strong>
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function AdminAnalyticsClient() {
  const [tab, setTab] = useState<"installs" | "users" | "crashes">("installs");
  const [installs, setInstalls] = useState<InstallAnalytics | null>(null);
  const [users, setUsers] = useState<UserAnalytics | null>(null);
  const [crashes, setCrashes] = useState<SentryCrashSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [segmentFilter, setSegmentFilter] = useState<
    "all" | "active" | "inactive" | "dormant"
  >("all");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [installRes, userRes, crashRes] = await Promise.all([
          fetch("/api/admin/analytics/installs"),
          fetch("/api/admin/analytics/users"),
          fetch("/api/admin/crashes"),
        ]);
        if (cancelled) return;
        if (installRes.ok) {
          setInstalls((await installRes.json()) as InstallAnalytics);
        }
        if (userRes.ok) {
          setUsers((await userRes.json()) as UserAnalytics);
        }
        if (crashRes.ok) {
          setCrashes((await crashRes.json()) as SentryCrashSummary);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const installChart = useMemo(
    () =>
      (installs?.installTrend ?? []).map((row) => ({
        name: formatDate(row.date),
        value: row.android + row.ios,
      })),
    [installs],
  );

  const dauChart = useMemo(
    () =>
      (installs?.activeTrend ?? []).map((row) => ({
        name: formatDate(row.date),
        value: row.dau,
      })),
    [installs],
  );

  const filteredClients = useMemo(() => {
    const rows = users?.clients ?? [];
    if (segmentFilter === "all") return rows;
    return rows.filter((row) => row.segment === segmentFilter);
  }, [segmentFilter, users?.clients]);

  return (
    <div className="sarjan-admin-analytics">
      <div className="d-flex flex-wrap gap-2 mb_24">
        {(
          [
            ["installs", "App installs & DAU"],
            ["users", "Client activity"],
            ["crashes", "Crash reporting"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`tf-btn ${tab === id ? "btn-fill" : "btn-line"} btn-sm`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-secondary">Loading analytics…</p> : null}

      {tab === "installs" && installs ? (
        <>
          <div className="row g-3 mb_24">
            {[
              ["Total installs", installs.summary.totalInstalls],
              ["DAU", installs.summary.dau],
              ["MAU", installs.summary.mau],
              ["Today", installs.summary.installsToday],
              ["Android", installs.summary.androidInstalls],
              ["iOS", installs.summary.iosInstalls],
            ].map(([label, value]) => (
              <div className="col-md-4 col-lg-2" key={String(label)}>
                <div className="sarjan-admin-card p-3 h-100">
                  <div className="text-secondary text-caption-1">{label}</div>
                  <div className="h4 mb_0">{value}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="row g-4">
            <div className="col-lg-6">
              <h6 className="mb_12">New installs (14 days)</h6>
              <div className="sarjan-report-chart-canvas">
                <AdminMetricChartView
                  data={installChart}
                  kind="bar"
                  tickFormatter={(value) => String(Math.round(value))}
                  seriesName="Installs"
                  tooltip={<ChartTooltip />}
                />
              </div>
            </div>
            <div className="col-lg-6">
              <h6 className="mb_12">Daily active devices (14 days)</h6>
              <div className="sarjan-report-chart-canvas">
                <AdminMetricChartView
                  data={dauChart}
                  kind="line"
                  tickFormatter={(value) => String(Math.round(value))}
                  seriesName="DAU"
                  tooltip={<ChartTooltip />}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}

      {tab === "users" && users ? (
        <>
          <div className="row g-3 mb_24">
            {(
              [
                ["active", "Active (30d)"],
                ["inactive", "Inactive (30–90d)"],
                ["dormant", "Dormant (90d+)"],
              ] as const
            ).map(([key, label]) => (
              <div className="col-md-4" key={key}>
                <button
                  type="button"
                  className={`sarjan-admin-card p-3 h-100 w-100 text-start ${segmentFilter === key ? "border-primary" : ""}`}
                  onClick={() =>
                    setSegmentFilter((current) =>
                      current === key ? "all" : key,
                    )
                  }
                >
                  <div className="text-secondary text-caption-1">{label}</div>
                  <div className="h4 mb_0">{users.segments[key]}</div>
                </button>
              </div>
            ))}
          </div>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Segment</th>
                  <th>Last login</th>
                  <th>Last app open</th>
                  <th>Last purchase</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.slice(0, 50).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div>{row.companyName}</div>
                      <div className="text-secondary text-caption-1">
                        {row.email}
                      </div>
                    </td>
                    <td>{row.segment}</td>
                    <td>
                      {row.lastLoginAt
                        ? new Date(row.lastLoginAt).toLocaleString("en-IN")
                        : "—"}
                    </td>
                    <td>
                      {row.lastAppOpenAt
                        ? new Date(row.lastAppOpenAt).toLocaleString("en-IN")
                        : "—"}
                    </td>
                    <td>
                      {row.lastPurchaseAt
                        ? new Date(row.lastPurchaseAt).toLocaleString("en-IN")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === "crashes" && crashes ? (
        <>
          {!crashes.configured ? (
            <p className="text-secondary">{crashes.message}</p>
          ) : (
            <>
              <div className="row g-3 mb_24">
                <div className="col-md-3">
                  <div className="sarjan-admin-card p-3">
                    <div className="text-secondary text-caption-1">
                      Unresolved issues
                    </div>
                    <div className="h4 mb_0">{crashes.unresolvedCount}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="sarjan-admin-card p-3">
                    <div className="text-secondary text-caption-1">
                      Affected users
                    </div>
                    <div className="h4 mb_0">{crashes.affectedUsers}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="sarjan-admin-card p-3">
                    <div className="text-secondary text-caption-1">
                      Crash-free sessions
                    </div>
                    <div className="h4 mb_0">
                      {crashes.crashFreeSessionsPct != null
                        ? `${crashes.crashFreeSessionsPct}%`
                        : "—"}
                    </div>
                  </div>
                </div>
                {crashes.sentryUrl ? (
                  <div className="col-md-3 d-flex align-items-stretch">
                    <a
                      href={crashes.sentryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="tf-btn btn-line w-100 align-self-center"
                    >
                      Open in Sentry
                    </a>
                  </div>
                ) : null}
              </div>
              {crashes.message ? (
                <p className="text-secondary">{crashes.message}</p>
              ) : null}
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Issue</th>
                      <th>Events</th>
                      <th>Users</th>
                      <th>Last seen</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {crashes.issues.map((issue) => (
                      <tr key={issue.id}>
                        <td>{issue.title}</td>
                        <td>{issue.count}</td>
                        <td>{issue.userCount}</td>
                        <td>
                          {new Date(issue.lastSeen).toLocaleString("en-IN")}
                        </td>
                        <td>
                          <a
                            href={issue.permalink}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
