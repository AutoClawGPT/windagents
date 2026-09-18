# WindAgents Skill Gap Report (implementation)

**Date:** 2026-09-13  
**Scope:** Full tool/MCP/API parity for agents with `cpk_`/`pbx_` — WindAgents-native routes/docs. No AnsemRail URLs.

## Added

| Area | Status |
|------|--------|
| MoonPay `/api/tools/token_*` | Done (search default limit; retrieve maps address→token) |
| Upload + image-proxy | Done |
| Agent quota | Done |
| Bounty payout | Done — pending_treasury |
| X verify WIND- | Done — local stub |
| ClawPump OAuth stubs | Done |
| Rewards admin/treasury | Done |
| Telegram stub | Done |
| SKILL_MD_APPEND | Done — original untouched |
| UI `/tools`, dock, settings verify, community upload, quota badge | Done |
| Persona GET/POST docs | Done |
| Skills DELETE | Done |
| Avatar PUT+POST | Done |
| PayBox policies/spend-limit/sign/poll/completeRequest | Done |
| Swap execute gated docs | Done |
| **PONS launch** `/api/launch/pons` + poll + `/api/agents/:id/pons/launches` | Done — ClawPump cpk_ proxy |
| **Claw/gasless launch** `/api/launch/claw` | Done — ClawPump cpk_ proxy |
| Launch desk UI `/launch` | Done |
| Upload `{ image }` → 201 | Done |
| Honest pay / LAUNCH_PAYMENT_REQUIRED pass-through | Done |

## Intentionally not branded / still deferred

- No AnsemRail URLs or `$ANSEM` as official WindAgents token
- No fake MoonPay/ClawPump data
- Real Twitter API production verify (local stub OK)
- Real treasury on-chain payouts (honest pending)
- Phoenix as a WindAgents-named venue (use ClawPump `perps` skill via cpk_)

## Notes

- Launch routes require linked `clawpumpAgentId` or raw ClawPump agent id
- Poll while `reserved` — do not re-POST
