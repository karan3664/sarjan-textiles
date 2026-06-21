# Postgres migrations (VPS Hostinger)

SQL migrations for the production Postgres database on the Hostinger VPS (Coolify).

Apply on the server:

```bash
curl -fsSL https://raw.githubusercontent.com/karan3664/sarjan-textiles/prod/scripts/vps/apply-pending-migrations.sh -o /tmp/apply-pending-migrations.sh
chmod +x /tmp/apply-pending-migrations.sh
bash /tmp/apply-pending-migrations.sh
```

Local dev: set `DATABASE_URL` in `.env.local` to your local Postgres instance (see `docs/VPS-COOLIFY.md`).

Applied files are tracked in the `schema_migrations` table on the server.
