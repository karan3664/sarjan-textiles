const ALLOWED_PG_TABLES = new Set([
  "admin_notification_state",
  "admin_profile_overrides",
  "admin_session_versions",
  "ai_chat_messages",
  "ai_chat_sessions",
  "ai_leads",
  "ai_session_events",
  "ai_user_interests",
  "ai_user_preferences",
  "ai_user_recommendations",
  "app_backups",
  "audit_logs",
  "blog_comments",
  "client_broadcast_reads",
  "client_carts",
  "client_notifications",
  "client_saved_lists",
  "clients",
  "cms_snapshots",
  "device_tokens",
  "admin_device_tokens",
  "feedbacks",
  "newsletter_campaigns",
  "newsletter_subscribers",
  "orders",
  "password_reset_requests",
  "product_reviews",
  "rate_limit_buckets",
  "single_use_tokens",
]);

const PG_COLUMN_PATTERN = /^[a-z][a-z0-9_]*$/;

export function assertPgTableName(table: string) {
  if (!ALLOWED_PG_TABLES.has(table)) {
    throw new Error(`Invalid Postgres table identifier: ${table}`);
  }
}

export function assertPgColumnName(column: string) {
  if (!PG_COLUMN_PATTERN.test(column)) {
    throw new Error(`Invalid Postgres column identifier: ${column}`);
  }
}

export function assertPgColumnNames(columns: string[]) {
  for (const column of columns) {
    assertPgColumnName(column);
  }
}
