# Supabase

Database schema, security rules and server functions for SafeSphere.

```
supabase/
├── migrations/   # ordered SQL — run in filename order
│   ├── …0001_extensions_and_types.sql   PostGIS, pgvector, pgcrypto, enums
│   ├── …0002_tables.sql                 all tables + indexes
│   ├── …0003_functions_and_triggers.sql helpers, triggers, RPCs (share pages, guardians, feed, heatmap)
│   ├── …0004_row_level_security.sql     RLS on every table
│   └── …0005_storage_and_realtime.sql   buckets + storage policies + realtime publication
├── functions/    # Edge Functions (Deno) — Phase 1: notify-guardians, trip-heartbeat
└── seed.sql      # admin bootstrap notes
```

## Applying the migrations

With the database connection string from Supabase → Project Settings → Database (URI, session pooler):

```powershell
$env:DATABASE_URL = "postgresql://postgres.<ref>:<password>@<host>:5432/postgres"
Get-ChildItem supabase\migrations\*.sql | Sort-Object Name | ForEach-Object {
  & "C:\Program Files\PostgreSQL\17\bin\psql.exe" $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $_.FullName
}
```

(or paste each file into the Supabase SQL editor, in order).

## Security model
- Users only reach their own rows. Moderators/admins (`profiles.role`) read everything.
- Guardians see alerts only through `nearby_active_alerts()` (verified, ≤10 km, active only).
- Live-location pages use `get_shared_alert(token)` / `get_shared_trip(token)` — token links expire.
- The mobile app and dashboard use the **anon** key. The **service-role** key is only for the ML API and Edge Functions.
