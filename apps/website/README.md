# @pond/website

Pond's promotional site. A single, static Next.js page that reuses `@pond/ui`
tokens and `@pond/icons` brand glyphs.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Run the Next dev server on port 3000 |
| `pnpm build` | Build the static site into `.next/` |
| `pnpm start` | Serve the production build |
| `pnpm typecheck` | Run `tsc --noEmit` |

## Deploy

Vercel. Static page plus one route handler (`/api/subscribe`) for the
mailing list. No database, no analytics.

## Environment variables

| Variable | Required | What it does |
|---|---|---|
| `RESEND_API_KEY` | Yes | Resend API key used to create contacts |
| `RESEND_AUDIENCE_ID` | No | Scopes signups to a Resend audience; omit to use global contacts |

Without `RESEND_API_KEY` the form returns a friendly "not configured" error,
so local dev works without secrets.
