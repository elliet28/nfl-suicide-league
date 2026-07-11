# NFL Suicide League

A web app for running an NFL survivor ("suicide") pool. Each entrant picks one team per week to win straight-up, can never reuse a team, and is eliminated on a loss — with one allowed buy-back before being out for good.

See [`.claude/plans`](.claude/plans) (or the project plan) for the full architecture and build plan.

## Stack

- Next.js 15 (App Router, TypeScript)
- Postgres (Neon) + Prisma
- Auth.js email magic-link auth via Resend
- ESPN public endpoints for schedule/scores/news/odds

## Status

Early scaffolding — not yet built.
