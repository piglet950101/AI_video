# Erro Zero — AI Video Automation

Phase 1 MVP for [errozero.online](https://errozero.online). Generates AI-cloned videos of Marcelo Guetta from written scripts, auto-publishes to Instagram + Facebook via official Meta Graph API, and tracks the funnel down to signups.

## Architecture

- **Frontend + API**: Next.js 14 App Router, TypeScript, Tailwind
- **Database**: PostgreSQL (Supabase) via Prisma
- **Queue**: BullMQ on Upstash Redis
- **Storage**: Cloudflare R2 (public URLs for Meta to fetch)
- **AI**: HeyGen (avatar) + Anthropic Claude (script variants)
- **Publishing**: Meta Graph API v21
- **Observability**: Sentry + Better Stack (Logtail)
- **Auth**: NextAuth.js email magic link, single-user gate

## Local setup

```bash
# 1) Clone and install
git clone git@github.com:piglet950101/AI_video.git
cd AI_video
npm install

# 2) Configure env
cp .env.example .env.local
# Fill .env.local with values from your SaaS accounts (see top of .env.example)

# 3) Generate Prisma client and apply schema
npx prisma generate
npx prisma db push

# 4) Seed Marcelo's 10 scripts + user row
npm run db:seed

# 5) Run dev server
npm run dev
# open http://localhost:3000

# 6) In a second terminal, run the publish worker:
npm run worker:publish
```

## Env vars that MUST be set before `npm run dev`

Every var in `.env.example` that is not explicitly marked optional. Common pitfalls:

- `ENCRYPTION_KEY` — generate with `openssl rand -base64 32`
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `CRON_SECRET` — generate with `openssl rand -hex 32`
- `DATABASE_URL` — Supabase "Prisma" connection string (pooled + direct)
- `R2_PUBLIC_URL` — the `pub-xxxxx.r2.dev` URL of your bucket (must be publicly reachable; Meta fetches videos by URL)
- `ALLOWED_LOGIN_EMAIL` — only this email can log in. Set to Marcelo's email at handoff.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, "Import Project" → select the repo.
3. Add every env var from `.env.local` to Vercel → **Production + Preview**.
4. Set build command to `npm run build` (default) and framework to Next.js (auto-detected).
5. Add `NEXT_PUBLIC_APP_URL` = `https://<your-vercel-domain>` (or custom domain after setup).
6. After first deploy, run migrations against the live DB:
   ```bash
   DATABASE_URL=<prod-url> npx prisma db push
   DATABASE_URL=<prod-url> npm run db:seed
   ```
7. Vercel Cron is configured in `vercel.json` — no extra setup.
8. For the BullMQ worker, deploy a long-running service to Railway, Render or Fly:
   - command: `npm run worker:publish`
   - same env vars as the web app.

## The full 14-day plan

See `../PLAN.md` in the parent repo (internal — not in this app). Summary:

| Week | Focus |
|------|-------|
| 1 | Infra, HeyGen avatar training, Meta OAuth, LLM variants, HeyGen render pipeline, first live video |
| 2 | Approval dashboard, scheduler, metrics, analytics, portfolio carousel, funnel tracking, handoff |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Prod build (runs prisma generate first) |
| `npm run db:push` | Apply schema to DB without migration files (dev) |
| `npm run db:migrate` | Create + apply a migration (prod-ready) |
| `npm run db:seed` | Seed Marcelo's user + 10 scripts |
| `npm run db:studio` | Prisma Studio GUI |
| `npm run worker:publish` | Start BullMQ publish worker |
| `npm run worker:metrics` | Start HeyGen stale-poll worker (optional) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

## Ownership model

This app is deployed under **Marcelo's** accounts (Vercel, Supabase, Upstash, R2, Sentry, Better Stack). The one exception is **HeyGen**, which remains on Yasmin's account permanently — the API key is injected as `HEYGEN_API_KEY` env var into Marcelo's deployment.

Yasmin never logs into Meta. Marcelo connects his Instagram + Facebook via OAuth on his own device from `/settings`.

See `OPERATIONS.md` for the handoff procedure and the full rotation playbook.
