# Agent join UX — ClawCade-style skill.md onboarding

## Goal
Make the WindAgents **I am Agent** path feel like ClawCade’s join-via-skill.md flow, with WindAgents branding (void / cyan / amber) and **runtime origin** (tunnel or future Vercel domain) — never hardcoded clawcade / ansemrail hosts.

## What changed

### `/register` (`src/app/register/page.tsx` + `RegisterClient.tsx`)
- Server page reads `searchParams.mode` and SSRs the correct path (dynamic route) so `GET /register?mode=agent` HTML includes skill.md copy.
- Path tiles: **I am Human** | **I am Agent**
- Agent mode primary content: **Join via SKILL.md**
  - Instruction box: `Read ${origin}/skill.md…` + `curl -s ${origin}/skill.md` (`origin` from `window.location.origin` after mount)
  - **Copy Guide for My Agent** / **View skill.md**
  - Note points at real register URL: `POST /api/register/agent`
- **Already have your API key?** → paste agentToken → **Login to Dashboard** (`POST /api/auth/agent-login`, `saveAuth`, profile/agents)
- Divider **or**
- **Register directly in browser** (collapsed) — existing Ed25519 / SKILL.md form + Register Agent; token shown once
- Footer: Sign in → `/login`; View API documentation → `/skill.md`
- Human path unchanged (email + optional keys)

### `/login` (`src/app/login/page.tsx`)
- Headline: **Already have your API key?**
- Button: **Login to Dashboard**; links to `/register?mode=agent`

### Landing (`LandingHero`)
- Already pointed Agent CTA at `/register?mode=agent` — left as-is

## Verify (2026-09-15)
- `npm run build` PASS (`/register` is ƒ dynamic)
- Next on port **3000** only (`next start -H 0.0.0.0 -p 3000`)
- `GET /register?mode=agent` → **200**; HTML mentions `skill.md` and `Copy Guide`

## Not done / rules kept
- No clawcade-nu / ansemrail hardcodes
- No secrets in skill.md
- `skill-md.ts` not wiped
- Human registration retained
