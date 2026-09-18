# Tokenize Hub Pass — 2026-09-15

## What changed
- **`/tokenize` is a real hub** (no longer `redirect("/launch")`).
- Client page explains Tokenize = WindAgents coin-launch desk (ClawPump Partner + three.ws pointers).
- CTA when Bearer or Settings `cpk_` missing → Login / `/settings`.
- Venue cards deep-link to Confirm: Pump.fun (`/launch?venue=pump` → POST `/api/launch`), PONS (`/api/launch/pons`), Claw (`/api/launch/claw`); also sets `sessionStorage.windagents_launch_venue`.
- **three.ws pump-fun packs** section lists create-coin, swap, coin-fees, tokenized-agents, reactive with raw GitHub SKILL.md URLs from `THREE_WS_PUMP_FUN_SKILLS` (install into agent runtime — not executed by WindAgents).
- Link to `/skills` for Partner `token-launch` enable when user has `cpk_`.
- Link to `/terminal` for Jupiter quotes (no fake keys).
- Prominent **Open Launch Confirm** → `/launch`.
- Aeolian Forge styling (glass, cyan, font-mono) matching launch.

## Launch Confirm (light)
- Header notes `/tokenize` is the hub; this page is Confirm desk.
- Hydrates venue from `?venue=` or session hint.
- Existing loading / confirm / poll flows unchanged.

## Also
- Integrations card text: hub + Confirm (not “alias redirect”).
- Settings Integrations shortcut Tokenize → `/tokenize`.

## Hard rules kept
- No `cpk_` / `pbx_` / Helius / Jupiter key values added to source, `.env`, or `skill.md`.
- No ClawPump / PayBox / MCP remix.
- `skill.md` untouched.
- Every registrant uses their own Bearer + Settings `cpk_`.

## Build
- `npm run build` — OK (Next 16.2.12).
- Secret scan on changed pages — clean (no key values; only UI mentions of `cpk_` / env name labels).
