# SETTINGS_TABS_PASS — every skill.md registrant

**Date:** 2026-09-15  
**Goal:** Settings + missing tabs complete for ANY registrant — not ClawPump/PayBox-only.

## Done

### A) Settings (`/settings`)
Sections for every user:
1. **Profile** — displayName, payout wallet, wallet address readonly
2. **ClawPump (your key)** — cpk_ input, hasClawpump badge, remote agent count, links Agents / Launch / Skills
3. **PayBox (your key)** — pbx_ input, link /paybox
4. **RPC / Helius** — heliusApiKey field; GET returns `hasHelius`
5. **MoonPay / discovery** — moonpayEmail (DB column + GET/PUT)
6. **X verify** — existing WIND- flow kept
7. **Uploads** — kept
8. **Integrations map** — cards → Tokenize, Skills, Tools, Terminal, PayBox, x402, Community, Integrations hub
9. Banner: *Every registrant uses their own keys — WindAgents never uses a shared platform ClawPump key.*

### B) Tabs / routes
- `/x402` — info + authenticated record form → `/api/x402`
- `/integrations` — capability hub + Solana MCP builder note
- Dock MORE: **x402** + **Integrations**
- `/tokenize` already redirects to `/launch`

### C) Skills polish
- CTA: *Save cpk_ in Settings to unlock live ClawPump catalogue*
- Per-skill badges: needs your cpk_ vs installable SKILL.md (three.ws) vs docs/local

### D) Home forge
- Key status row: ClawPump / PayBox / Helius / Agents
- Quick links: Tokenize / Skills / Settings / Integrations

### E) Docs
- skill.md append: Settings vault fields list (no secrets)
- WHAT_YOU_STILL_NEED.md updated
- This pass note

## Rules respected
- Per-user keys only — no platform/test `cpk_` in env for all users
- ClawPump MCP/Partner paths untouched
- skill-md.ts not wiped — append only
- Real APIs / `connect_your_own_key` — no demos

## Verify checklist
- [x] `npm run build` PASS
- [x] `next start` on :3000; cloudflared alone
- [x] Secret scan: no live `cpk_` in `src/`
- [x] GET `/api/settings` → `keys.hasHelius`; UI has Helius field
