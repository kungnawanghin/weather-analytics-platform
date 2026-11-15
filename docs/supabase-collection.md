# Supabase collection

Requires Node 24. No new packages are required. This is a server-side tool;
never import these scripts into a client component.

1. For a new empty Supabase project, run `database/supabase-schema.sql` once
   in SQL Editor. It creates the two tables with RLS enabled and no public
   policies. Do not rerun it against existing tables.
2. Create `.env.local` in the project root (already ignored by Git):

   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
   ```

   Use a Secret key (`sb_secret_...`) from Supabase Settings > API Keys.
   Do not prefix it with NEXT_PUBLIC_, commit it, or send it in chat.
   The scripts load `.env.local` with Node's built-in loader. Environment
   variables already supplied by the host take precedence.
3. Run `node scripts/seed-supabase.cjs` to upsert and verify all 85 locations
   (6 provinces, 79 districts). Repeating the seed updates the same IDs.
4. Run `node scripts/collect-supabase.cjs --limit 3` for a trial, then
   `node scripts/collect-supabase.cjs --all` for all 85 locations.
5. Read the latest ten snapshots with `node scripts/view-supabase.cjs` or
   open Table Editor in Supabase.

The collector calls Open-Meteo directly; a running Next.js server is unnecessary.
It requests Celsius, km/h and Unix timestamps, validates units and values, and
normalizes timestamps to UTC. Source `open-meteo`, model `best_match` describes
the provider's default model selection, not a named station observation.
Values represent the registry reference point, not a province-wide average.

Weather inserts ignore conflicts on `(area_id, source, model, valid_at)` and
preserve the original fetch time. Areas run sequentially with 20-second request
timeouts. Individual failures do not undo saved areas; any failure exits with 1.
The collector does not retry automatically; rerunning safely skips duplicates.

Tests: `node scripts/test-supabase.cjs` (fake transport only, no cloud writes).
Existing local SQLite scripts and Windows schedule are unchanged. Historical
SQLite records are not migrated automatically. The website still reads current
weather and ERA5 history through its existing APIs; cloud storage does not
change those data sources.

This step does not enable cloud scheduling. Until a hosted schedule is configured,
run this collector manually. Next: configure repository secrets and a scheduled
GitHub Actions workflow, verify a successful run, then disable the old Windows
task if it is no longer needed.

References:
- https://supabase.com/docs/guides/api/api-keys
- https://docs.postgrest.org/en/stable/references/api/tables_views.html#upsert
- https://open-meteo.com/en/docs
