# MASTER_GAP_1_TO_100 — WindAgents deep dig (2026-09-15)

**Date:** 2026-09-15 (overwrite — deep dig, not skim)  
**Project:** `/workspace/windagents`  
**Method:** Local inventory of `src/lib/*`, `src/app/api/**`, `(app)` desks, `skill.md` + appends; ClawPump `clawpump.tech/docs` + Partner `developers`; three.ws STRUCTURE.md + docs hashes (agents-vs-avatars, voice-lab, walk, integrations) + pump-fun-skills raw SKILL.md ×5 + gcp-production + HA README + npm `@three-ws/solana-agent@0.2.2`; Sendai v2 intro + solana-mcp + solana-agent-kit READMEs; mcp.solana.com; solana.com/skills; jakubkrehel/skills packaging; secret scan.  
**Rules honored:** No shared `cpk_`/`pbx_`/Helius/Jupiter secrets added. Additive analysis only. skill.md not edited.

### Overall weighted score: **60 / 100**

| Section | Weight | Score | Contribution |
|---------|--------|-------|--------------|
| A ClawPump skills/MCP/launch/PONS | 22 | 80% | 17.6 |
| B PayBox / treasury / rewards | 12 | 55% | 6.6 |
| C three.ws body/avatar/walk/voice | 15 | 42% | 6.3 |
| D Tokenize / create-coin / swap / fees | 15 | 60% | 9.0 |
| E x402 / workers / walk-sdk / HA | 10 | 25% | 2.5 |
| F Sendai / Solana MCP | 8 | 22% | 1.8 |
| G skill.md completeness | 10 | 80% | 8.0 |
| H Per-user key model | 8 | PASS (100%) | 8.0 |
| **Total** | **100** | | **≈60** |

Honest: **not done**. Launch/Tokenize Partner path is strong; full ClawPump MCP surface, fee dashboards, self-funded quote UX, three.ws walk/voice/character-studio, and Sendai runtime are still Missing / Phase-2 / Upstream.

**Legend:** DONE · PARTIAL · MISSING · PHASE-2-STUB · UPSTREAM

---

## Explicit: what WindAgents must NEVER put on the server

| Never | Why |
|-------|-----|
| Platform-wide `cpk_` | Every registrant uses own Settings vault; shared key = shared agents/wallets/launches |
| Platform-wide `pbx_` | Same for PayBox MCP |
| Shared Helius / Jupiter API secrets in skill.md or defaults | Operator may set optional `HELIUS_API_KEY` in **server env**; never commit live values; users may also store personal Helius in Settings |
| Live Bearer `agentToken` / `authToken` in repo, skill.md, preview HTML | Shown once at register |
| Fake mint addresses / tx hashes / balances | Honest `connect_your_own_key` / `payment_required` only |

`.env.example` keeps **empty** key slots. Secret scan 2026-09-15: **no live `cpk_*` / `pbx_*` patterns in `src/` / `.env.example` / `public/`**.

---

## Gap matrix (required areas)

| Area | Status | Evidence in WindAgents | What ClawPump / three.ws / Sendai has | Gap to close | Needs user key? |
|------|--------|------------------------|--------------------------------------|--------------|-----------------|
| **Register / Bearer** | DONE | `/api/register/human`, `/api/register/agent` (Ed25519 + skill.md), `/api/auth/agent-login`, `/register` UI | ClawPump: Ed25519 agent signup + OAuth dashboard | None for core path | No (optional cpk_/pbx_ at human register) |
| **Settings per-user keys** | DONE | `/api/settings` AES-GCM vault; flags `hasClawpump`/`hasPaybox`/`hasHelius`; `/settings` + `/integrations` | ClawPump dashboard API keys; PayBox app keys | Optional: surface “keysConfigured” names only in Integrations | Yes — each user |
| **ClawPump MCP proxy** | PARTIAL | `/api/clawpump/mcp` info + JSON-RPC proxy; OAuth routes stub without env | Agent MCP ~122–126 tools; Launchpad MCP 78 @ `clawpump.tech/api/mcp`; hosted `mcp.clawpump.tech` OAuth-only (rejects cpk_) | Full MCP tool browser UI; OAuth connector only if `CLAWPUMP_OAUTH_*` set | cpk_ for REST MCP; OAuth for official host |
| **ClawPump skills catalogue** | DONE (Partner) / PARTIAL (docs+community) | Seed 9 Partner slugs; live `GET /skills` when cpk_; docs extras + three.ws install cards; enable via `POST /api/skills {action:enable}` | Partner 9 public slugs; docs ~15 built-in; community 5 + SendAI ~45 | Live install of community/SendAI registries (not Partner-enableable) | cpk_ for live + enable |
| **ClawPump chat / agents** | DONE | `/api/agents` local+remote; chat/start/stop/messages; persona; quota honest | Partner agents CRUD + chat (402 free_quota); MCP chat tools | Streaming chat UI; automations UI | cpk_ for remote |
| **Launch / Tokenize** | DONE (core venues) | `/launch` Confirm desk; `/tokenize` → `/launch`; `POST /api/launch`, `/launch/pons`, `/launch/claw`, `GET /launch/pump-pairs` | Partner `/launch`, `/launch/self-funded`, `/launch/pons`, `/launch/pools`; docs: all venues payment-required (gasless legacy) | Dedicated **self-funded preflight→pay→retry** UX; `/launch/pools`; fee earnings desk | cpk_ + funded wallet / paid quote |
| **PONS / claw** | DONE | PONS required fields + poll aliases; claw → Partner `/launch`; honest 402/`pay` | PONS Robinhood 4663 + `payoutWallet` 0x; pump.fun paid/selfFunded | Confirm PONS availability with ClawPump before prod marketing; v2 pairToken fields optional UI | cpk_ + EVM payout for PONS |
| **PayBox** | PARTIAL | `/api/paybox` actions (credentials, tools, policies, spend-limit, sign, transfer, swap, poll); `/paybox` UI | PayBox MCP at `api.paybox.sh/mcp` | Deeper policy UX; broadcast path still gated | pbx_ |
| **Tokenize / create-coin / swap / fees** | PARTIAL | Jupiter quote + gated execute; Launch Confirm; three.ws pump-fun SKILL.md **pointers** only | three.ws create-coin/swap/coin-fees/tokenized-agents scripts; ClawPump fee split 75/25 + `/api/fees/earnings` | Wire fee earnings proxy UI; optional local create-coin is **upstream skill for registrant runtime**, not WA server | cpk_ for ClawPump fees; signer for three.ws scripts |
| **three.ws agent-3d / avatars / clips** | PARTIAL | `Agent3D`, VisionDesk, avatar catalog (idle/wave/dance/…), forge via `three.ws/api/mcp-studio` `forge_avatar` | Full `<agent-3d>`, 50+ clips, marketplace bodies, agents-vs-avatars pairing | Deeper clip library parity; agent↔avatar Studio pairing | No for catalog; forge may rate-limit |
| **character-studio** | PHASE-2-STUB / MISSING | Documented Missing in skills meta + skill append | `character-studio/` fork of M3 CharacterStudio | Do not half-embed; Phase B iframe/modal later | No |
| **walk / walk-sdk** | MISSING | Not a dependency; docs pointers only | `@three-ws/walk`, walk-embed, companion, `/temporary` world | Phase B: optional one-tag `walk-embed-sdk.js` on profile | No |
| **voice / lipsync** | MISSING | No MediaPipe / Voice Lab | Voice Lab, TTS rungs, ARKit visemes, home-voice | Phase C — do not break Agent3D | Optional ElevenLabs BYOK upstream |
| **x402 (WA + three.ws)** | PARTIAL / MISSING | `/api/x402` info + voluntary records; `/x402` page; ClawPump x402 skill pointer | ClawPump Pay.sh skill; `@three-ws/solana-agent/x402-exact`; x402-modal; agent-payments invoices | Exact USDC pay for launches/intel; agent-payments verify | User wallet / cpk_ |
| **workers / HA** | UPSTREAM | None | GCP Cloud Run workers, model workers, Home Assistant LAN bridge | Out of WindAgents product scope unless productizing | N/A |
| **Solana MCP (mcp.solana.com)** | UPSTREAM | Noted in `AGENTS.md` for builders | Docs retrieval + program_autofixer (5 tools) | Contributor Cursor/Claude only — **not** end-user Skills runtime | No |
| **Sendai kit / solana-mcp** | MISSING (runtime) / DONE (docs) | AGENTS.md links; no npm dep | Solana Agent Kit v2 plugins; sendaifun/solana-mcp; ~45 sendaifun/skills | Optional Phase C plugin; keep contributor-only | Operator wallet if runtime |
| **skill.md completeness** | DONE (sufficient) | Core `SKILL_MD` + appends (FIX, SKILLS_LAUNCH, GAP, SETTINGS_TABS) | — | **No edit this pass** — registrants not blocked; Launch/PONS/skills/Settings documented | — |
| **jakubskills packaging lesson** | PARTIAL | Skills UI installUrl cards + local save | jakubkrehel/skills SKILL.md packs | Continue card pattern for SendAI/community | No |

---

## A — ClawPump (detail)

**Partner public enableable slugs (live):**  
`trading`, `perps`, `token-launch`, `portfolio`, `market-intelligence`, `social`, `sniper`, `wallet`, `image-generation`

**Docs built-in (~15) mirrored as non-enableable pointers:**  
defi-trading, perps-trading, market-intel, token-sniper, bitget-intel (ambient), news, twitter, marketplace, wallet-ops, image-generation, x402, agent-weed, pumprpg (+ Partner overlaps)

**Launch reality (2026 Partner docs):** all venues **payment-required**; gasless is legacy. WindAgents already surfaces 402 / `LAUNCH_PAYMENT_REQUIRED` / `pay` honestly — keep that.

**Missing Partner proxies (high impact):**
1. Dedicated `/api/launch/self-funded` preflight + pay + retry (GET cost discovery + POST with `preflightToken`/`txSignature`)
2. `POST /api/launch/pools` (Uniswap / pools.trade)
3. Fee earnings: proxy ClawPump fees/earnings for linked agents
4. Automations CRUD UI (Partner `/automations` exists)

---

## B — PayBox / treasury

| Item | Status |
|------|--------|
| Settings `pbx_` + `/paybox` | PARTIAL |
| Spend-limit / policies / sign / transfer / swap | PARTIAL |
| Bounty payout → `pending_treasury` | DONE (honest, no fake tx) |
| Rewards admin / treasury signing | PARTIAL — needs `ADMIN_TOKEN` + `TREASURY_KEY` |
| Auto-funded treasury payouts | MISSING |

---

## C — three.ws (STRUCTURE-informed)

WindAgents has a **control-plane slice** of three.ws (Agent3D + forge + catalog), not the platform.

| three.ws surface | WA |
|------------------|----|
| agent-3d / GLB catalog / clips | PARTIAL |
| forge_avatar MCP Studio | PARTIAL |
| character-studio | MISSING |
| walk companion / embed / playground | MISSING |
| Voice Lab / lipsync | MISSING |
| docs-world / agent-shell / PROTOCOL vanity | UPSTREAM |
| pump-fun-skills (5 packs) | PARTIAL (install URLs only) |
| `@three-ws/solana-agent` 0.2.2 | MISSING as dependency |
| workers / HA | UPSTREAM |

---

## Prioritized build order (additive only)

### Phase A — Launch/Tokenize + skills parity (user impact)
1. Self-funded launch desk: quote → pay → retry with `preflightToken` (Partner `/launch/self-funded`)
2. Fee earnings panel for launched agents (ClawPump earnings API)
3. Launch `/pools` optional venue (if ClawPump confirms availability)
4. MCP tools/list browser on `/integrations` or `/skills` (read-only list + call proxy — no platform key)
5. PONS v2 optional fields in UI (`pairToken`, `creatorTaxBps`, `devBuyQuoteIn` as **string**)
6. Pump-pairs + creator fee bps clarity in Confirm review (already partially wired)

### Phase B — three.ws body polish (no half-breaks)
1. Optional walk-embed one-tag on `/agents/[id]` (iframe/script — no fork)
2. Character-studio **iframe modal** via `@three-ws/avatar` AvatarCreator pattern (export GLB → PUT avatar)
3. Richer clip palette from three.ws animations manifest (still Agent3D)
4. Reactive PumpPortal → gesture hooks (document + feature-flag)

### Phase C — economy / builders
1. `@three-ws/agent-payments` invoice verify for tokenized-agent rails
2. Optional `@three-ws/solana-agent` plugin path (not harddep for all users)
3. Sendai Agent Kit as **optional** operator runtime (AGENTS.md already)
4. Live SendAI/community skill pack cards with install-to-local-DB
5. Funded treasury auto-payout (operator `TREASURY_KEY` only)

**Intentionally not Phase A:** MediaPipe lipsync, HA, GCP workers, docs-world, vanity grind, embedding Sendai as required runtime.

---

## Research link checklist

| Source | Covered |
|--------|---------|
| clawpump.tech/docs (skills, MCP 122/78, launch, fees) | Yes |
| clawpump.tech/developers Partner REST | Yes |
| three.ws/docs + agents-vs-avatars, voice-lab, walk, integrations | Yes (SPA + raw docs + search) |
| three.ws/awesome | Yes (curated list page) |
| github.com/nirholas/three.ws STRUCTURE, pump-fun-skills, gcp-production, HA | Yes (raw) |
| npm `@three-ws/solana-agent` | Yes 0.2.2 |
| jakub.xz/skills + jakubkrehel/skills | Yes (packaging lesson) |
| kit.sendai.fun + docs.sendai.fun v2 | Yes |
| sendaifun/solana-mcp + solana-agent-kit | Yes README |
| solana.com/skills + mcp.solana.com | Yes (builder MCP) |
| Local WA inventory + secret scan | Yes |

---

## skill.md edit decision

**No** — do not change skill.md this pass.  
Appends already cover Launch/PONS/claw, skills enable, Settings vault, per-user keys, three.ws pointers, tokenize alias. Nothing missing that **blocks** a registrant from registering, saving keys, enabling Partner skills, or hitting Launch Confirm. Stale “gasless ~3 sponsored” wording is mitigated by honest payment_required responses; changing it is polish, not a blocker.
