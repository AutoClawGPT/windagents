# TOKENIZE_LIKE_CLAWPUMP_PASS — 2026-09-15

## Goal
Dig ClawPump tokenize architecture, map WindAgents gaps, then add only clear missing pieces so the **WindAgents desk** can launch like clawpump.tech **without** deleting the ClawPump.tech tab / launch APIs / MCP / PayBox / desk split. Per-user `cpk_` only.

## Dig first
Wrote `preview/CLAWPUMP_TOKENIZE_ARCHITECTURE.md` from:
- `clawpump.tech/docs` + `clawpump.tech/developers`
- Local notes: `LAUNCH_PARITY_NOTES`, `MASTER_GAP_1_TO_100`, `SPLIT_DESKS_PASS`, `WINDAGENTS_AGENTS_DESK_PASS`
- Inventory of `/api/launch/*`, fees, AgentsDeskPanel, ClawPumpTechPanel, Confirm `/launch`

### Architecture gaps closed this pass
| Gap | Resolution |
|-----|------------|
| WindAgents desk deferred all Partner launch to ClawPump tab | Added **Tokenize like ClawPump** (`#wa-tokenize-like-clawpump`): create launcher + `token-launch`, Confirm deep-links with agent preselected, venue links (pump / self-funded / pons / pools), earnings when linked |
| Confirm lacked `pools` venue (API existed) | Added `venue=pools` → `POST /api/launch/pools` |
| ClawPump tab venue cards incomplete | Added self-funded + pools cards |
| skill.md dual-path undocumenteds | Append `SKILL_MD_APPEND_TOKENIZE_PARITY` |
| Missing Partner proxies? | **None** — self-funded, pools, pump-pairs, fees already proxied |

## Files changed
- `preview/CLAWPUMP_TOKENIZE_ARCHITECTURE.md` (new)
- `preview/TOKENIZE_LIKE_CLAWPUMP_PASS.md` (this)
- `preview/build-tokenize-parity.log`
- `src/components/agents/AgentsDeskPanel.tsx` — Tokenize like ClawPump section
- `src/components/agents/ClawPumpTechPanel.tsx` — self-funded + pools venue cards
- `src/app/(app)/tokenize/page.tsx` — WindAgents banner (Confirm also on WA desk)
- `src/app/(app)/launch/page.tsx` — pools venue
- `src/lib/skill-md-append.ts` — `SKILL_MD_APPEND_TOKENIZE_PARITY` + COMBINED
- `src/app/skill.md/route.ts` — wire append

## Intact (unchanged contracts)
- ClawPump.tech tab exists
- `/api/launch`, `/api/launch/self-funded`, `/api/launch/pons`, `/api/launch/pools`, `/api/launch/pump-pairs`, `/api/launch/claw`
- `/api/clawpump/mcp`, PayBox, desk split (`?tab=windagents|clawpump`)
- No shared/platform `cpk_` in source or skill.md
- No Helius/Jupiter inputs restored in Settings UI (still “Server operator sets”)

## skill.md appended?
**Yes** — `SKILL_MD_APPEND_TOKENIZE_PARITY` (dual path WindAgents + ClawPump.tech, Confirm venues, honest cpk_ note).

## Build / restart
- `npm run build` — **OK** (Next 16.2.12); log `preview/build-tokenize-parity.log`
- Restarted `next start -H 0.0.0.0 -p 3000`; **cloudflared left running** (pid 244266)
- Smoke: `/tokenize` `/launch` `/skill.md` `/api/clawpump/mcp` `/settings` → 200
- skill.md contains “Tokenize parity” + `wa-tokenize-like-clawpump`
- `/api/launch` help lists pools + self-funded + fees

## Honest note
Real Partner mints still require the registrant’s Settings `cpk_` + funded wallet / paid quote. Local-only agents without `clawpumpAgentId` are blocked from fake Partner ids.
