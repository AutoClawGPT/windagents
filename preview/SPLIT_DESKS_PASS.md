# Split Desks Pass — 2026-09-15

## Goal
Stop mashing ClawPump.tech into the WindAgents Agents desk. Additive cleanup only — no rebuild; MCP + launch APIs kept.

## What changed

### Tokenize (`/tokenize`) — two tabs
| Tab | Deep-link | Auth | Content |
|-----|-----------|------|---------|
| **WindAgents** (default) | `?tab=windagents` (also `#wa-agents`) | Bearer only | `AgentsDeskPanel` — list/create local agents, local skills PATCH, profile links, Skills / Terminal pointers. CTA: open ClawPump.tech tab for cpk_ launch. |
| **ClawPump.tech** | `?tab=clawpump` | Bearer + `cpk_` | `ClawPumpTechPanel` — venue cards (pump/pons/claw), Open Launch Confirm, self-funded/fees, ClawPump MCP GET + tools/list, three.ws packs, token-launch skills link. |

Whole-hub “needs cpk_” banner removed from the WindAgents tab.

### AgentsDeskPanel
- Removed ClawPump MCP tools/list + fees/earnings UI (moved to ClawPump.tech tab).
- Kept: list, create, enable/PATCH local skills, honest linked-`clawpumpAgentId` note.
- Launch: linked → “Launch via ClawPump tab”; not linked → “Open ClawPump.tech tab…” — desk itself does **not** demand cpk_.

### Settings
- Removed UI inputs + badges for Helius / Solana RPC / Jupiter quote URL / Jupiter API key.
- Short note only: server operator sets `HELIUS_API_KEY` / `SOLANA_RPC_URL` / Jupiter in env.
- API handlers for vault overrides left intact (harmless).
- Vault UI remains: Profile, cpk_, pbx_, MoonPay email, X verify, uploads.

### skill.md
- Append-only `SKILL_MD_APPEND_SPLIT_DESKS` (prior appends untouched).
- Documents vault = cpk_/pbx_ (+ profile); Helius/Jupiter/RPC = server env; tab split + dock deep-links.

### OrbitalDock
- Primary **Tokenize** → `/tokenize` (WindAgents default).
- More → **Agents desk** `/tokenize?tab=windagents`.
- More → **ClawPump launch** `/tokenize?tab=clawpump`.

## Intact (do not remove)
- `/api/clawpump/mcp` (GET + POST tools/list)
- PayBox MCP / `/api/paybox`
- Existing `/api/launch*` (+ pons/claw/self-funded/pools/pump-pairs)
- Fees API `/api/fees/earnings`

## Verify
- `npm run build` — OK (Next 16.2.12); log `preview/build-split-desks.log`
- Restarted `next start -H 0.0.0.0 -p 3000`; **cloudflared left running**
- Smoke: `/tokenize` `/settings` `/skill.md` `/api/clawpump/mcp` → 200; `/api/paybox` → 401 without auth (expected)
- skill.md contains “Split desks” + `tab=clawpump` + server-env HELIUS note
- Settings source: no Helius/Jupiter/RPC input fields; has “Server operator sets”
- Secret scan on changed surfaces — clean (no key values)

## Success criteria
User opens Tokenize → sees **WindAgents** desk without Jupiter/Helius Settings spam; **ClawPump.tech** is a separate tab for cpk_ launch; MCP routes intact.
