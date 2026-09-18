# WindAgents Agents Desk Pass — 2026-09-15

## Goal
Every skill.md registrant can use **OUR** platform agents (fetch, create, add skills, launch/tokenize) from dashboard **or** agent chat via skill.md — not only ClawPump remotes. Per-user keys only; no platform keys in source/skill.md/.env.

## A) Tokenize hub → WindAgents Agents desk
- Expanded **`/tokenize`** (hub stays Tokenize; Confirm remains `/launch`).
- New panel `#wa-agents` via `src/components/agents/AgentsDeskPanel.tsx`:
  1. Lists **local** agents from `GET /api/agents` (`agents[]`) — primary
  2. Create form → `POST /api/agents` with name, persona, Partner enableable skills
  3. Enable skills: `POST /api/skills { action:enable }` when `cpk_` + `clawpumpAgentId`; else `PATCH /api/agents/:id` local skills
  4. Launch CTA: linked → `/launch?venue=pump` + `sessionStorage.windagents_launch_agent`; local-only → honest Settings/sync CTA (no fake mint)
  5. Fees: `GET /api/fees/earnings?agentId=` when cpk_ connected
  6. MCP read-only: GET info + POST `tools/list` via `/api/clawpump/mcp`
  7. three.ws packs section kept below the desk
  8. Aeolian glass/cyan styling
- `/agents` gallery links to Tokenize → Agents desk.

## B) Launch Confirm — local agents first-class
- Selector optgroups: **Local WindAgents** + **ClawPump remote**.
- Shows name + local id + linked `clawpumpAgentId` (or NOT LINKED).
- Prefer linked id for Partner launch value.
- Local-only without link: amber error; Confirm / self-funded / Partner calls blocked — never fake Partner id.

## C) Settings — RPC / Jupiter slots
- Vault + UI + `PUT /api/settings`:
  - `heliusApiKey` (existing)
  - `solanaRpcUrl` → `hasSolanaRpc`
  - `jupiterQuoteUrl` → `hasJupiterQuoteUrl`
  - `jupiterApiKey` → `hasJupiterApiKey`
- UI note: Jupiter quotes public by default; execute uses PayBox.
- `GET` still masks — never returns raw secrets.

## D) skill.md append ONLY
- Added `SKILL_MD_APPEND_AGENTS_DESK` (desk path, create/list/skills/launch, settings keys, points at LAUNCH_PARITY).
- Wired into `skill.md` route + `SKILL_MD_APPEND_COMBINED`.
- Updated `SKILL_MD_APPEND_SETTINGS_TABS`: `/tokenize` is hub (not alias redirect); optional RPC/Jupiter vault fields; dock Tokenize → `/tokenize`.

## E) OrbitalDock
- Primary **Tokenize** → `/tokenize`.
- More → **Agents desk** (`/tokenize#wa-agents`).

## Constraints kept
- Additive only — ClawPump / PayBox / MCP not rebuilt/removed.
- No API key **values** in source / skill.md / .env.
- `npm run build` — pass (Next 16.2.12).
- Restarted `next start` on `:3000`; cloudflared left running.
- Secret scan on changed surfaces — clean.

## Smoke
- `/tokenize` `/launch` `/settings` `/skill.md` → 200
- skill.md contains Agents desk + solanaRpcUrl + Tokenize hub wording
