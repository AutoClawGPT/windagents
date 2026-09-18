# WindAgents — CONTINUE PROMPT (handoff)

**Snapshot date:** 2026-09-15  
**Product:** WindAgents — Aeolian Forge (void / cyan / amber) Solana meme-coin / agent platform  
**Path on box:** `/workspace/windagents`  
**Deploy order (user rule):** localhost first → GitHub → Vercel  
**Live preview (ephemeral):** Cloudflare quick tunnels expire. Last known: `https://bugs-sector-author-foods.trycloudflare.com` → `127.0.0.1:3000`. If NXDOMAIN, restart:  
`/workspace/cloudflared tunnel --url http://127.0.0.1:3000 --no-autoupdate`

---

## How to resume (paste this to your next agent)

You are continuing **WindAgents** for user **CLAWCADE**. Restore from this zip, read this file fully, then:

1. `cd windagents && npm ci` (or `npm install`)
2. Prefer **production** for tunnel: `npm run build && npm run start -- -p 3000` (dev HMR breaks behind Cloudflare)
3. Re-open cloudflared to port 3000; give user the new trycloudflare URL
4. Do **not** rewrite/wipe `src/lib/skill-md.ts` — append only via `src/lib/skill-md-append.ts`
5. Never put live `cpk_` / `pbx_` / Bearer secrets into public `/skill.md`
6. Keys live only in encrypted Settings; registration `agentToken` **is** the long-lived Bearer (AnsemRail-style)
7. Do **not** wire product deps to `ansemrail.vercel.app` or `clawcade-nu.vercel.app` URLs — structure inspiration only
8. Chat free-quota (ClawPump ~10/day) is **expected** — do not treat as a WindAgents bug to “fix”
9. UI: Aeolian Forge (orbital dock), **not** AnsemRail purple sidebar clone
10. Profiles: three.ws-style full-bleed 3D showcase; public `/agents/[id]` for every skill.md registrant

---

## What this product is

Real (no-demo) Solana agent / meme-coin platform with:

- Ed25519 + skill.md agent registration
- Bearer login = registration `agentToken`
- Settings AES-encrypted `cpk_` (ClawPump Partner REST) and optional `pbx_` (PayBox)
- Agents CRUD, start/stop, persona, 3D profiles (`Agent3D` / three.ws)
- ClawPump remotes listed when `cpk_` set; Launch desk with Confirm
- Public leaderboard/community/registry → clickable WindAgents profiles
- Tools (token trending/search/retrieve), upload, verify (`WIND-`), swap/Jupiter, wallet, marketplace, signals, bounties, rewards, paybox stubs, etc.

---

## Where we left off (2026-09-15)

### Just finished
1. **Full API + UI audit** → ~**78–80%** complete (`preview/FULL_AUDIT.md`)
2. **FIX_PASS** for audit bugs except chat quota (`preview/clawpump/FIX_PASS.md`)
3. **Public profiles** for every skill.md registrant; leaderboard/community links (`preview/clawpump/PUBLIC_PROFILES.md`)
4. **Showcase profile UX** (full-bleed 3D + slim rail + Configure accordion) (`preview/clawpump/PROFILE_FIX.md`)
5. **Agent join UX** ClawCade-style on `/register?mode=agent`: Join via SKILL.md, Copy Guide, paste token Login, collapsed browser register (`preview/clawpump/AGENT_JOIN_UX.md`)
6. Tunnel refreshed after old hostname expired

### Still open / next (priority)
1. Confirm Agent join page on tunnel looks right to CLAWCADE; harden origin string in Copy Guide (must show full `https://…/skill.md` after hydrate)
2. Upstream ClawPump: claw/PONS path drift may still need Partner API doc checks for paid launches (dry payment_required OK)
3. Optional: PayBox when user adds `pbx_`; Telegram/OAuth remain stubs until env keys
4. UI polish: Skills list exists now; keep watching empty-state flashes
5. When localhost solid → push GitHub → deploy Vercel; then skill.md / join copy use Vercel domain via `window.location.origin`
6. Rotate any test `cpk_` / tokens that appeared in chat history

---

## Architecture snapshot

| Area | Location / notes |
|------|------------------|
| App routes | `src/app/(app)/*` — home, agents, agents/[id], launch, tools, settings, terminal, signals, marketplace, community, leaderboard, registry, portfolio, wallet, skills, bounties, rewards, paybox, analytics |
| Auth / register | `src/app/login`, `src/app/register` (+ `RegisterClient.tsx`), `src/app/api/register/agent`, `api/auth/agent-login` |
| Public skill guide | `GET /skill.md` ← `skill-md.ts` + **append** `skill-md-append.ts` |
| Agent resolve | `src/lib/resolve-agent.ts` — owner + public viewer; ClawPump import owner-only optional |
| ClawPump | `src/lib/clawpump.ts`, `clawpump-launch.ts` — Settings `cpk_`; MCP OAuth separate |
| DB | SQLite `data/windagents.db` (drizzle schema `src/db/schema.ts`) |
| 3D | `src/components/avatar/Agent3D.tsx`, three.ws default GLB |
| Shell | `AppShell` + `OrbitalDock` |

### Critical product rules (user corrections)
- **One skill.md path for all users** — Hermes/any agent registers; every registrant gets public `/agents/[id]` (`agentId` = `userId`)
- Leaderboard/community agents must open **WindAgents** profile preview (AnsemRail structure inspiration, WindAgents look)
- ClawPump remote import is **optional owner tooling**, not the only profile path
- Launchpad: fetch ClawPump agents when `cpk_` in Settings; Confirm flow; Partner API model (not public wallet-only clawpump.tech/launch UI)
- Append-only skill.md; no secrets in guide

---

## Test credentials in this snapshot (LOCAL ONLY — rotate later)

Files under `data/` (gitignored patterns may still be in this zip):

- `data/.test-agent-token` — Bearer for agent login
- `data/.test-agent-id` / `.test-user-id`
- SQLite DB may contain encrypted Settings keys for the test user

**Do not** publish these tokens or paste `cpk_` into skill.md. Prefer Settings UI to re-enter keys after restore.

Login helper: `/login?token=<agentToken>` or Agent join paste field.

---

## How to run

```bash
cd windagents
npm ci          # or npm install
npm run build
npm run start -- -p 3000
# separate terminal:
cloudflared tunnel --url http://127.0.0.1:3000 --no-autoupdate
```

Open the printed `https://….trycloudflare.com/register?mode=agent` and `/skill.md`.

---

## Audit scorecard (last run)

**~78–80%** overall.

**Pass (high level):** health, Bearer auth, settings (no key leak), agents local+remote, public profiles, leaderboard agentId, start/stop, launch validation + PONS payment_required, tools (+ chain), upload, verify stub, community/registry/signals/marketplace/portfolio/wallet/swap quote, secrets scan, most pages HTTP 200.

**Left alone on purpose:** ClawPump chat `free_quota_exceeded` (~10/day).

**Fixed in FIX_PASS:** Community/Bounties auth gates, loading flashes, Skills list, PayBox CTA, token_retrieve mint, claw→Partner `POST /launch`, PONS poll degrade, chain_required 400.

**Partial/stubs:** PayBox needs `pbx_`, Telegram/OAuth, quota remaining null, Jupiter 429 flake, Twitter verify local stub.

Reports: `preview/FULL_AUDIT.md`, `preview/FULL_AUDIT_summary.json`, `preview/clawpump/FIX_PASS.md`, screenshots under `preview/audit/` and `preview/clawpump/`.

---

## File map of handoff docs

| File | Purpose |
|------|---------|
| `CONTINUE.md` | This resume prompt |
| `README.md` / `DESIGN.md` / `AGENTS.md` | Project docs |
| `preview/FULL_AUDIT.md` | API+UI audit |
| `preview/clawpump/FIX_PASS.md` | Post-audit fixes |
| `preview/clawpump/PUBLIC_PROFILES.md` | Public profile system |
| `preview/clawpump/PROFILE_FIX.md` | 3D showcase layout |
| `preview/clawpump/AGENT_JOIN_UX.md` | Register Agent skill.md join |
| `preview/ansemrail-probe/` | Structure study only |
| `preview/TUNNEL_URL.txt` | Last tunnel hostname (may be dead) |

---

## Zip contents note

This archive includes **source, public, data DB, preview artifacts, lockfile, configs**.  
It **excludes** `node_modules/` and `.next/` (reinstall/rebuild).  
Huge stale `preview/tunnel.log` may be omitted or truncated to keep the zip downloadable.

---

## Success criteria when continuing

- [ ] `npm run build` passes
- [ ] Tunnel login + `/register?mode=agent` shows Join via SKILL.md
- [ ] Leaderboard name → public `/agents/[id]` showcase
- [ ] Settings `cpk_` pulls remotes into Agents + Launch
- [ ] No secrets in `/skill.md`
- [ ] Ready for GitHub + Vercel when CLAWCADE confirms localhost/tunnel quality
