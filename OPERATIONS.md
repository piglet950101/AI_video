# OPERATIONS.md — Erro Zero

Day-to-day operational playbook.

## Ownership map

| Service | Owner (post-handoff) | Notes |
|---------|----------------------|-------|
| Vercel | Marcelo | App deployment. Free tier. |
| Supabase | Marcelo | Postgres DB. Free tier. Region: São Paulo. |
| Upstash | Marcelo | Redis for BullMQ. Free tier. Region: sa-east-1. |
| Cloudflare R2 | Marcelo | Video + image storage. Public URLs required. |
| Sentry | Marcelo | Error monitoring. Free tier. |
| Better Stack | Marcelo | Log aggregation. Free tier. |
| Meta Developer App | Marcelo | Own Facebook account. |
| Meta OAuth token | Marcelo | Stored encrypted in his Supabase. |
| **HeyGen** | **Yasmin** | Permanent. API key env-var only. |
| Anthropic (Claude) | Marcelo | Direct billing. |

## Common recipes

### "I want to add a new script"

1. Open Prisma Studio (`npm run db:studio`)
2. Table `scripts` → "Add record"
3. Fill `userId` (Marcelo), `slot` (next unused), `format` (REEL or FEED), `titleHook`, `body`, `cta`.
4. Visit `/scripts` → click "Gerar variações" on the new row.
5. Review the 3 platform variants on the card.
6. Click "Renderizar" on each platform you want a video for.
7. When the video is READY (check `/videos`), a post is **not** auto-created — go to `/videos`, click the video, then use the "Agendar post" action (in the UI backlog).

### "A render is stuck RENDERING forever"

The HeyGen webhook might have failed. Run the metrics worker for 2 min:

```bash
npm run worker:metrics
```

This scans videos stuck >2 min and re-checks HeyGen directly. Or in Prisma Studio, set the video's `status` back to PENDING and re-render.

### "Meta token expired, posts are failing"

1. Open `/settings`.
2. Click **Reconectar**. Marcelo drives — Yasmin never touches.
3. Verify `metaTokenExpiresAt` is ~60 days in the future.

The daily cron at 03:00 UTC (`/api/cron/refresh-meta-token`) auto-refreshes tokens within 7 days of expiry. If that ever fails, the user sees a banner on the dashboard.

### "I got a shadowban alert"

1. Stop the queue:
   ```sql
   UPDATE posts SET status = 'DRAFT' WHERE status = 'SCHEDULED';
   ```
2. Post manually to Instagram through the app (non-API) for a few days.
3. Review recent posts for policy issues (copyrighted audio, links in caption body, repeated content).
4. Resume gradually — 1 post/day for a week, then scale back up.

### "Rotate the HeyGen API key"

The HeyGen key lives under Yasmin. If compromised:

1. Yasmin rotates in the HeyGen admin UI.
2. Yasmin sends the new key to Marcelo (secure channel).
3. Marcelo (or Yasmin during warranty) updates `HEYGEN_API_KEY` in Vercel → Env Vars → redeploy.

Rotation takes <5 min. No Marcelo business data is exposed by a compromise — it only affects video generation capacity.

### "Rotate the encryption key" (ENCRYPTION_KEY)

⚠️ This invalidates the stored Meta token. Use only if you suspect the key leaked.

1. Generate new key: `openssl rand -base64 32`.
2. Update `ENCRYPTION_KEY` in Vercel env.
3. Redeploy.
4. Marcelo reconnects Meta via `/settings`. Done.

### "I need to move the data out of Supabase"

```bash
pg_dump "$DATABASE_URL" > errozero_backup.sql
```

Or use Supabase's "Download backup" feature in the dashboard.

## Handoff Day 14 checklist

- [ ] Transfer Vercel project to Marcelo's Team (Vercel → Settings → Advanced → Transfer)
- [ ] Invite Marcelo as Owner on Supabase → accept → downgrade Yasmin to Member
- [ ] Same on Upstash, Cloudflare R2, Sentry, Better Stack
- [ ] Re-add `HEYGEN_API_KEY` in Marcelo's Vercel env (same key, owned by Yasmin)
- [ ] Marcelo OAuths Meta via `/settings` — verify token stored
- [ ] First real post on his IG + FB — joint verification
- [ ] Yasmin removes herself from Meta Developer App Developer role
- [ ] Send `.env.local` secrets to Marcelo via secure channel (1Password shared vault)
- [ ] 30-day warranty window begins — Yasmin stays on each service as Collaborator (read-only where possible)

## On-call / emergencies

- Sentry will email Marcelo on repeated errors.
- Better Stack dashboard: check `logs` for recent error bursts.
- Direct Yasmin contact: `yasmin@...` (during warranty window).
