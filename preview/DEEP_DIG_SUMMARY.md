# DEEP_DIG_SUMMARY — top missing items (2026-09-15)

**Overall WindAgents completeness vs full ask: ~60%**

Focus: Launch/Tokenize + skills parity. Ranked by **user impact** (registrant can launch / enable skills / get paid).

---

## Top 15 missing / partial — actionable

| Rank | Item | Status | Why it matters | Suggested close |
|------|------|--------|----------------|-----------------|
| 1 | Self-funded launch preflight → pay → retry | MISSING dedicated UX | Partner requires payment; WA has `selfFunded` flag but not full quote/`preflightToken`/`txSignature` loop | Additive `/api/launch/self-funded` + Launch desk steps |
| 2 | Creator fee earnings panel | MISSING | Users launch but cannot see 75% fee share in WA | Proxy ClawPump fees/earnings with user’s `cpk_` |
| 3 | Honest payment UX polish on Confirm | PARTIAL | 402/`pay` already returned; UI should guide SOL vs x402 clearly | Launch desk banners + copy-from-quote |
| 4 | MCP tools browser (list/call) | PARTIAL | Proxy exists; no UI over ~122 tools | Read-only tools/list on `/integrations` |
| 5 | `POST /launch/pools` venue | MISSING | Partner Uniswap path unused | Optional Confirm venue + proxy |
| 6 | Partner skills enable success feedback | PARTIAL | Enable API works; UX clarity for non-Partner slugs | Already refuses `not_partner_enableable` — tighten UI copy |
| 7 | Community + SendAI skill install | MISSING | Docs show 50 community skills; WA has pointers only | InstallUrl cards → local DB save (no fake enable) |
| 8 | PONS v2 optional fields | PARTIAL | `pairToken` / string `devBuyQuoteIn` / tax bps | Additive form fields |
| 9 | Pump-pairs + creator fee bps in review | PARTIAL | API supports; Confirm should show fee asset | Review step binding |
| 10 | Swap execute → PayBox/signer path | PARTIAL | Unsigned tx / gated; no one-click with `pbx_` | Wire PayBox `request_swap` from Terminal |
| 11 | three.ws walk companion on profile | MISSING | Body presence gap vs three.ws | One-tag walk-embed (Phase B) |
| 12 | Character-studio / AvatarCreator modal | MISSING | Forge prompt only; no selfie/studio | Iframe modal → GLB PUT (Phase B) |
| 13 | `@three-ws/agent-payments` verify | MISSING | Tokenized-agent monetization | Optional server verify helper (Phase C) |
| 14 | Treasury auto-payout for bounties | MISSING | Stays `pending_treasury` | Operator `TREASURY_KEY` + signed send (Phase C) |
| 15 | Sendai / mcp.solana runtime | UPSTREAM / MISSING | Builder tools, not registrant runtime | Keep AGENTS.md only unless productizing |

---

## Already strong (do not remix)

- Per-user Settings vault (`cpk_` / `pbx_` / Helius) — no platform keys  
- Partner Launch/PONS/claw + `/tokenize` alias + pump-pairs  
- Skills seed + live catalogue + enable Partner slugs  
- Agent3D + forge_avatar + clip aliases  
- skill.md + appends sufficient for registrants  
- Secret scan clean in `src/` / `.env.example`  

---

## skill.md

**Needs edits: No** — registrants are not blocked; Launch/skills/Settings already documented in appends.
