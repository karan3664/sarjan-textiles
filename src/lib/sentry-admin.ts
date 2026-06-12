export type SentryIssueRow = {
  id: string;
  title: string;
  count: number;
  userCount: number;
  lastSeen: string;
  platform?: string;
  permalink: string;
};

export type SentryCrashSummary = {
  configured: boolean;
  message?: string;
  unresolvedCount: number;
  crashFreeSessionsPct: number | null;
  affectedUsers: number;
  issues: SentryIssueRow[];
  sentryUrl?: string;
};

type SentryIssueApi = {
  id: string;
  title: string;
  count: string;
  userCount: number;
  lastSeen: string;
  platform?: string;
  permalink: string;
};

export async function getSentryCrashSummary(): Promise<SentryCrashSummary> {
  const token = process.env.SENTRY_AUTH_TOKEN?.trim();
  const org = process.env.SENTRY_ORG?.trim();
  const project = process.env.SENTRY_PROJECT?.trim();

  if (!token || !org || !project) {
    return {
      configured: false,
      message:
        "Set SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT to load crash data.",
      unresolvedCount: 0,
      crashFreeSessionsPct: null,
      affectedUsers: 0,
      issues: [],
    };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  try {
    const issuesRes = await fetch(
      `https://sentry.io/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/issues/?query=is:unresolved&limit=15`,
      { headers, next: { revalidate: 120 } },
    );

    if (!issuesRes.ok) {
      return {
        configured: true,
        message: `Sentry API error (${issuesRes.status}).`,
        unresolvedCount: 0,
        crashFreeSessionsPct: null,
        affectedUsers: 0,
        issues: [],
        sentryUrl: `https://${org}.sentry.io/projects/${project}/`,
      };
    }

    const issues = (await issuesRes.json()) as SentryIssueApi[];
    const affectedUsers = issues.reduce(
      (sum, issue) => sum + (issue.userCount ?? 0),
      0,
    );

    let crashFreeSessionsPct: number | null = null;
    try {
      const statsRes = await fetch(
        `https://sentry.io/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/stats/?stat=received&resolution=1d&statsPeriod=14d`,
        { headers, next: { revalidate: 300 } },
      );
      if (statsRes.ok) {
        const stats = (await statsRes.json()) as Array<[number, number]>;
        const total = stats.reduce((sum, [, count]) => sum + count, 0);
        if (total > 0) {
          const crashEvents = issues.reduce(
            (sum, issue) => sum + Number(issue.count ?? 0),
            0,
          );
          crashFreeSessionsPct = Math.max(
            0,
            Math.min(100, Math.round((1 - crashEvents / total) * 1000) / 10),
          );
        }
      }
    } catch {
      crashFreeSessionsPct = null;
    }

    return {
      configured: true,
      unresolvedCount: issues.length,
      crashFreeSessionsPct,
      affectedUsers,
      issues: issues.map((issue) => ({
        id: issue.id,
        title: issue.title,
        count: Number(issue.count ?? 0),
        userCount: issue.userCount ?? 0,
        lastSeen: issue.lastSeen,
        platform: issue.platform,
        permalink: issue.permalink,
      })),
      sentryUrl: `https://${org}.sentry.io/projects/${project}/`,
    };
  } catch (error) {
    return {
      configured: true,
      message:
        error instanceof Error ? error.message : "Could not reach Sentry.",
      unresolvedCount: 0,
      crashFreeSessionsPct: null,
      affectedUsers: 0,
      issues: [],
      sentryUrl: `https://${org}.sentry.io/projects/${project}/`,
    };
  }
}
