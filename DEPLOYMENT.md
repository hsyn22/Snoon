# Deploying سنون

The plan of record is **Dokploy on the existing AWS EC2 instance** (see CLAUDE.md).
What is described here is the **Vercel + Supabase preview** — a place to open the
site on a phone and show people, not a replacement for that plan.

## What works on the preview, and what does not

- **Patient side: fully working.** Submitting a case, the reference code, the
  private tracking link.
- **Admin: fully working.** `/admin`, first visit offers a create-first-admin form.
- **Student sign-up: deliberately closed.** No email provider is configured, so
  `isEmailConfigured()` returns false in production and the sign-up page says so.
  Creating accounts that could never be verified would be worse than none.
  See the Authentication section of CLAUDE.md.

## Database

Supabase, free tier, `eu-central-1`.

Connections go through the **shared pooler in session mode** (`…pooler.supabase.com:5432`),
not the direct endpoint. The direct endpoint is IPv6-only on the free tier and
Vercel is IPv4-only, so it simply cannot be reached. Session mode rather than
transaction mode (`:6543`) is a deliberate trade: transaction mode is the right
choice for serverless at scale but does not support prepared statements, which
both Drizzle and Payload rely on. Session mode holds a connection per client, so
it will need revisiting before real traffic — it is fine for a preview.

The app connects as a dedicated `snoon_app` role, not as `postgres`.

## Migrations

`vercel-build` runs them:

```
pnpm db:migrate && pnpm payload:migrate && pnpm payload:seed && next build
```

They run on the build machine because it can reach the database. A deploy whose
schema is behind its code is a broken deploy, so this fails the build loudly
rather than shipping a mismatch. The seed is idempotent.

## Environment variables

All five must be set on the Vercel project before the first build. There is no
API access to set them from a tool, so they are entered by hand.

| Name | What it is |
|---|---|
| `DATABASE_URL` | Supabase pooler connection string, session mode, as the `snoon_app` role |
| `BETTER_AUTH_SECRET` | Signs student sessions. Rotating it logs everyone out |
| `PAYLOAD_SECRET` | Signs admin sessions. Rotating it logs admins out |
| `TRACKING_TOKEN_SECRET` | Keys the HMAC over patient tracking tokens. **Rotating it invalidates every outstanding tracking link** |
| `BETTER_AUTH_URL` | Optional. Falls back to the Vercel production URL |

## Before this stops being a preview

1. **Rotate every secret.** The ones in use were generated inside an AI session
   transcript, which is not a secret store.
2. **Configure email**, or student registration stays closed.
3. **Decide whether Vercel or EC2 is the real home.** Vercel's hobby plan is for
   non-commercial use; سنون takes no payments today, but the supplies store would
   change that.
4. **Treat the data as real.** The moment a patient submits a case, that is a real
   person's phone number in a real database.
