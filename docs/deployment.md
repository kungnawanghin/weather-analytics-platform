# Deploy BEYOND THE FORECAST

This checklist prepares the website for Vercel. It does not mean the site has
already been deployed. Hourly collection runs separately on GitHub Actions.

## Import the project

1. Sign in to Vercel and import `kungnawanghin/weather-analytics-platform`.
2. Use the Next.js framework preset and the repository root directory.
3. Keep the repository's build command (`npm run build`) and choose Node 24.
4. Use `main` for production deployments.

## Configure the database connection

Before deploying, add these server-side environment variables to the Vercel
project's Production environment:

| Name | Value source |
| --- | --- |
| `SUPABASE_URL` | The existing Supabase project's URL |
| `SUPABASE_SECRET_KEY` | The existing server-side Secret key |

Copy values privately from the local configuration or Supabase settings. Never
paste values into this document, commit `.env.local`, or add `NEXT_PUBLIC_` to
the secret's name. GitHub Actions secrets do not automatically configure Vercel.
If variables change after a deployment, redeploy for the new values to apply.

## Verify the deployed URL

- Check that the video hero and province/district map load on desktop and mobile.
- Select two different areas in turn and confirm the current weather and
  historical data follow the selection.
- Switch temperature/humidity and 7/30 days; check units and coverage counts.
- Confirm historical data is labelled as collected Supabase data. Sparse history
  is expected while collection is new; do not replace missing days with zeros.
- Verify `/api/weather/history?areaId=TH-10` returns history and an unknown ID
  returns 404. Responses must never include a private key.
- Check the latest GitHub Actions collection run independently. Deploying the
  website must not start a second collector or require the local computer.

## Troubleshooting

If the page loads but historical data fails, check that both variables are set
for Production, redeploy, and check whether the Supabase project is available.
Inspect server logs without printing credentials. Current weather comes directly
from Open-Meteo, so it can work even when the database connection needs attention.

References:
- https://vercel.com/docs/git/vercel-for-github
- https://vercel.com/docs/environment-variables
