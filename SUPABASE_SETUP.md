# Supabase Setup

AWS/S3 is intentionally skipped for now.

## 1. Run Schema

Open Supabase dashboard -> SQL Editor -> paste and run:

```sql
-- use database.schema.sql from this repo
```

The schema file is:

```txt
database.schema.sql
```

## 2. Enable Supabase

After schema is created, set:

```env
SUPABASE_ENABLED=true
```

Required env keys:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CLIENT_JWT_SECRET=
```

## 3. Verify

Open:

```txt
/api/admin/system
```

Expected:

```json
{"databaseMode":"supabase-postgres"}
```
