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

## Hourly GitHub Actions collection

`.github/workflows/collect-weather.yml` runs on the default branch every hour
at minute 17 (UTC and Asia/Bangkok share the same minute). It can also be
started manually from Actions > Collect weather hourly > Run workflow.

Configure repository Actions secrets named `SUPABASE_URL` and
`SUPABASE_SECRET_KEY` using the values from the local environment file.
Never put secret values into workflow YAML. Only the collection step receives
them. Tests run first without secrets. The job uses Node 24 built-ins, so it
does not install project dependencies or build/start Next.js.

The workflow has read-only repository permissions, no persisted checkout
credential, a 35-minute timeout and a concurrency group that prevents overlap.
Check a run's collection log for requested/inserted/duplicates/failed counts;
any failed area makes the job fail. Retry with Run workflow; duplicate snapshots
are ignored. The workflow does not seed or change the database schema.

Once a hosted run succeeds, the old `WeatherAnalytics-CollectHourly` Windows
task can be disabled; local SQLite data remains available. Cloud collection
does not need the user's computer or web server to be running.

GitHub schedules can be delayed or dropped during load. Public-repository
scheduled workflows are disabled after 60 days without repository activity.
This is not a guaranteed exact-hour service or a backfill of missed snapshots.

References:
- https://supabase.com/docs/guides/api/api-keys
- https://docs.postgrest.org/en/stable/references/api/tables_views.html#upsert
- https://open-meteo.com/en/docs
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
