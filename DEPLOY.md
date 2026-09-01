# Deploying squadup for free

**Stack:** Vercel (app) · Neon (Postgres) · Upstash (Redis) · GitHub Actions (the tick).

The app is serverless, so there's no long-lived matchmaking worker or simulator in
production. A scheduled GitHub Action pokes `POST /api/cron/tick` every ~5 minutes; each
call keeps the bot pool warm and runs a short burst of simulate + match passes. Between
bursts the app is quiet, but Server-Sent Events still push queue/match updates live the
moment they happen.

> Total cost: **$0** on the free tiers below.

---

## 1. Postgres — Neon

1. Create a project at <https://neon.tech> (free tier).
2. Copy the connection string. Use the **direct** one (host _without_ `-pooler`), and
   make sure it ends with `?sslmode=require`. This is your `DATABASE_URL`.
   - Free Neon suspends the DB after 5 min idle; the first request after that has a ~1s
     cold start. Fine for a demo.

## 2. Redis — Upstash

1. Create a database at <https://upstash.com> (free tier), any region close to your
   Vercel region.
2. On the database page, copy the **TCP** connection URL — it looks like
   `rediss://default:<password>@<host>:<port>`. This is your `REDIS_URL`.
   (Upstash's page also shows a ready-made `ioredis` snippet if you hit connection
   trouble.)

## 3. App — Vercel

1. At <https://vercel.com/new>, import `jackthecoder17/squadup`.
2. Framework preset: **Next.js** (auto-detected). Leave the build command alone — the
   repo defines a `vercel-build` script that runs migrations + seed + `next build`.
3. Add these **Environment Variables** (Production):

   | Name                  | Value                                              |
   | --------------------- | -------------------------------------------------- |
   | `DATABASE_URL`        | Neon direct connection string (`?sslmode=require`) |
   | `REDIS_URL`           | Upstash TCP URL (`rediss://…`)                     |
   | `AUTH_SECRET`         | `openssl rand -base64 33`                          |
   | `AUTH_DISCORD_ID`     | from step 4                                        |
   | `AUTH_DISCORD_SECRET` | from step 4                                        |
   | `NEXT_PUBLIC_APP_URL` | `https://<your-project>.vercel.app`                |
   | `CRON_SECRET`         | `openssl rand -hex 32`                             |
   | `SIM_BOTS`            | _(optional)_ bot pool size, default `30`           |

4. Deploy. The build runs `prisma migrate deploy` and seeds the game catalog against
   Neon automatically.
   - If Vercel rejects `maxDuration = 60` on your plan, set an env var `CRON_BURST=3`
     and lower `maxDuration` in `src/app/api/cron/tick/route.ts` to `10`.

## 4. Discord OAuth

In your app at <https://discord.com/developers/applications> → **OAuth2** → **Redirects**,
add:

```
https://<your-project>.vercel.app/api/auth/callback/discord
```

Copy the **Client ID** and **Client Secret** into the Vercel env vars above and redeploy.

## 5. The tick (GitHub Actions)

The workflow is already in the repo at `.github/workflows/tick.yml` (runs every 5 min).
Add two repository secrets at
**Settings → Secrets and variables → Actions**:

| Secret        | Value                               |
| ------------- | ----------------------------------- |
| `PROD_URL`    | `https://<your-project>.vercel.app` |
| `CRON_SECRET` | the same value you set on Vercel    |

Then run it once by hand: **Actions → Matchmaking tick → Run workflow**.

> Prefer Vercel Cron? It reads `CRON_SECRET` automatically. Add a `vercel.json` with a
> cron entry for `/api/cron/tick` and disable the GitHub workflow. Note the Hobby plan
> limits cron frequency.

## 6. Verify

1. Open the site, **Sign in with Discord**, finish onboarding.
2. Go to **Queue**, join a game.
3. Trigger the tick workflow (or wait for the schedule). Watch **Live** — queues fill,
   matches land in the feed, and if you queued for a popular game you may get pulled
   into a lobby.

## Notes

- **SSE on serverless is time-capped** (`maxDuration = 60`). `EventSource` reconnects on
  its own; the global stream re-sends a full snapshot on connect and the match stream
  re-sends current state, so a reconnect is invisible apart from a ~1s gap.
- **Connection pooling** (Neon's `-pooler` host, PgBouncer) is an optional upgrade for
  the _app_ runtime under load; migrations must still use the direct connection.
- **Upstash free** caps daily commands and concurrent connections — plenty for a demo,
  but each open SSE tab holds one subscriber connection.
