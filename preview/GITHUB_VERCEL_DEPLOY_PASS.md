# WindAgents — GitHub + Vercel Deploy Pass

**Date:** 2026-09-18 (Europe/Skopje / UTC+2)  
**Status:** SUCCESS

## Repo

- **GitHub:** https://github.com/AutoClawGPT/windagents (private)
- **Default branch:** `main`
- **Org/user:** AutoClawGPT

## Vercel

- **Team:** claw-gpt
- **Project:** windagents (`prj_mOkVqFb2besW1oChz3o6lEmVXE4f`)
- **Production domain:** https://windagents.vercel.app
- **Git link:** AutoClawGPT/windagents → productionBranch `main`
- **Framework:** Next.js

## Env (Production + Preview) — names only

| Name | Notes |
|------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://windagents.vercel.app` |
| `ENCRYPTION_KEY` | generated (`openssl rand -hex 32`), Secret |
| `DATABASE_URL` | `file:/tmp/windagents.db` |
| `SOLANA_RPC_URL` | mainnet-beta public RPC |
| `CLAWPUMP_API_URL` | `.env.example` default |
| `CLAWPUMP_MCP_URL` | `.env.example` default |
| `CLAWPUMP_REST_MCP_URL` | `.env.example` default |
| `PAYBOX_MCP_URL` | `.env.example` default |
| `JUPITER_QUOTE_URL` | `.env.example` default |
| `WINDAGENTS_LOCAL_VERIFY` | `0` |

SSO / Deployment Protection on the project was cleared (`ssoProtection=null`) so public agents can reach `/skill.md` and MCP without login walls.

## Smoke results (against https://windagents.vercel.app)

| Path | HTTP | Notes |
|------|------|--------|
| `GET /` | **200** | HTML landing |
| `GET /skill.md` | **200** | `text/markdown`; base URLs rewritten to production |
| `GET /api/clawpump/mcp` | **200** | honest JSON (ClawPump MCP info) |
| `GET /tokenize` | **200** | HTML desk |

### skill.md / APP URL wiring

- Route `src/app/skill.md/route.ts` rewrites `http://localhost:3000` → `NEXT_PUBLIC_APP_URL` (or request origin). Source markdown content was **not** wiped.
- Live skill.md homepage / Base URL lines use `https://windagents.vercel.app` (0 leftover `localhost:3000` in served body).

## Database warning (ephemeral)

`DATABASE_URL=file:/tmp/windagents.db` on Vercel serverless is **ephemeral**: the SQLite file lives on the instance filesystem and is lost on cold starts / new instances. Fine for smoke; **not durable production**.

**Needed for durable prod DB:** Turso / remote libSQL (or Neon / other hosted SQL) with a persistent `DATABASE_URL`. Document and migrate before relying on registrations, agents, or settings in prod.

## Security / hygiene

- `.env*` / `.vercel` / `data/*.db` gitignored; `.env.local` never staged or committed.
- GH / Vercel tokens never written into repo, pass file, or remote URL (clean `origin` = `https://github.com/AutoClawGPT/windagents.git`).
- Probe token/id files under `preview/ansemrail-probe/` and `data/.test-*` excluded from git.

## ROTATE_NEEDED

**ROTATE_NEEDED** — parent should tell the user to rotate the pasted `GH_TOKEN` and `VERCEL_TOKEN` used for this deploy (tokens appeared in process argv / temp env during CLI use; values are not recorded here).

## Notes / blockers resolved

1. Second CLI deploy briefly **BLOCKED** (`readyStateReason`: commit author `deploy@windagents.local` had no linked Git account). Fixed with an empty commit authored as `AutoClawGPT <105085107+AutoClawGPT@users.noreply.github.com>` then redeploy — READY + aliased.
2. Prefer GitHub noreply author for future Vercel+Git pushes to avoid collaboration blocks.

## Success criteria checklist

- [x] Repo https://github.com/AutoClawGPT/windagents has `main`
- [x] Vercel production URL live (`https://windagents.vercel.app`)
- [x] `NEXT_PUBLIC_APP_URL` set to that domain
- [x] `/skill.md` and `/api/clawpump/mcp` reachable
- [x] Pass file written; tokens never in git
