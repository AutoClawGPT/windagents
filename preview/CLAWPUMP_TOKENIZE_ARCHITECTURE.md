# CLAWPUMP_TOKENIZE_ARCHITECTURE — WindAgents mapping

**Date:** 2026-09-15  
**Sources:** `clawpump.tech/docs`, `clawpump.tech/developers`, local notes (`LAUNCH_PARITY_NOTES`, `MASTER_GAP_1_TO_100`, `SPLIT_DESKS_PASS`, `WINDAGENTS_AGENTS_DESK_PASS`), inventory of `/workspace/windagents/src`.  
**Rules:** Per-user `cpk_` only. No shared/platform keys. Dig-first; additive only. Do not delete ClawPump.tech tab, `/api/launch/*`, `/api/clawpump/mcp`, PayBox, or desk split.

---

## 1. ClawPump full tokenize flow

Homepage “tokenize” is **not** a separate Partner path. It is:

```
create agent → enable token-launch → (optional) GET pump-pairs
  → POST /launch | /launch/self-funded | /launch/pons | /launch/pools
  → poll status / tokenAddress
  → fees/earnings (platform, not Partner v1)
```

| Step | What happens | Auth |
|------|----------------|------|
| **1. Create agent** | `POST /api/v1/agents` — `name` required; `skills` may include `token-launch`. Base bundle always includes portfolio, market-intelligence, wallet, image-generation, x402, perps, news, bitget-intel. | Bearer `cpk_` |
| **2. Enable token-launch** | `POST /api/v1/agents/{id}` with skills including `token-launch` (or create with it). Partner public slugs: trading, perps, **token-launch**, portfolio, market-intelligence, social, sniper, wallet, image-generation. | `cpk_` |
| **3. Discover pairs** | `GET /api/v1/pump-pairs` → `assets[]` + `creatorFeeBps` `{min:100,max:300,default:100}`. | `cpk_` |
| **4a. Agent-wallet launch** | `POST /api/v1/launch` with `agentId`, `symbol`, `description`, optional `selfFunded:true`, `pumpQuoteMint`, `pumpCreatorFeeBps` (100–300, custom pairs only), `imageUrl`, `payoutWallet`, `metaplexGenesis*`. 402 = self-funding guidance (not fatal). | `cpk_` |
| **4b. External-wallet / x402** | `GET` cost discovery + `POST /launch/self-funded`: `preflight:true` → pay exact lamports → retry with `txSignature` + `preflightToken` (or x402 `PAYMENT-SIGNATURE`). | `cpk_` |
| **4c. PONS** | `POST /launch/pons` — Robinhood Chain; required `payoutWallet` **0x EVM**, `logoUrl`. `Idempotency-Key`. Poll platform `GET /api/agents/{id}/pons/launches/{id}` until `finalized`. | `cpk_` |
| **4d. Pools** | `POST /launch/pools` — Uniswap via pools.trade. `Idempotency-Key`. | `cpk_` |
| **5. Poll** | Agent `tokenAddress` via `GET /agents/{id}`; PONS via pons launches poll. One token per agent (`409 AGENT_ALREADY_HAS_TOKEN`). | `cpk_` |
| **6. Fees** | Split **75% creator / 25% platform** (pump.fun paired asset). Platform `GET /api/fees/earnings?agentId=` (not on Partner v1). Payout set at launch via `payoutWallet`; ClawPump **retains creator wallet**. Pons: EVM payout gets **50%** of trade fees per docs. | `cpk_` / platform |

### MCP (docs — parallel to Partner)

| Surface | Tools |
|---------|--------|
| Launchpad MCP `https://clawpump.tech/api/mcp` | `launch_token`, `launch_token_self_funded`, `launch_metaplex_genesis_token`, `launch_pons` |
| Agent MCP `@clawpump/agents` | `get_launch_status`, `launch_token_gasless` (**legacy**), `launch_metaplex_genesis_token` |
| Hosted `mcp.clawpump.tech` | OAuth-only — **rejects `cpk_`** |

**Reality 2026:** all Partner venues are **payment-required**. Gasless first-3 is retired.

---

## 2. Exact Partner + MCP endpoints & required fields

**Base:** `https://clawpump.tech/api/v1` · Auth: `Authorization: Bearer cpk_…` · Host: apex only (not `agents.clawpump.tech`).

| Method | Path | Required fields | Notes |
|--------|------|-----------------|-------|
| `POST` | `/agents` | `name` | Optional `skills[]`, `model`, `persona`, `strategy` |
| `GET` | `/agents` | — | List owned agents |
| `GET` | `/agents/{agentId}` | — | Includes `tokenAddress` (Robinhood CA wins if both) |
| `POST` | `/agents/{agentId}` | partial body | Update skills etc. (POST not PATCH) |
| `GET` | `/skills` | — | Public catalogue |
| `GET` | `/pump-pairs` | — | Catalogue + fee range |
| `POST` | `/launch` | `agentId`, `symbol`, `description` | `imageUrl` unless agent has avatar; `selfFunded`, pair/fee fields optional |
| `GET` | `/launch/self-funded` | — | `?quoteMint=` optional |
| `POST` | `/launch/self-funded` | `name`, `symbol`, `description`, `imageUrl`, `agentId`, `agentName`, `walletAddress` | + `preflight` / `txSignature`+`preflightToken` |
| `POST` | `/launch/pons` | `agentId`, `symbol`, `description`, `logoUrl`, `payoutWallet` (0x) | Idempotency-Key |
| `POST` | `/launch/pools` | `agentId`, `symbol` | Idempotency-Key |

**Platform (not v1):** `GET /api/fees/earnings?agentId=` · `PUT /api/fees/wallet` (Ed25519).

---

## 3. WindAgents mapping (DONE / PARTIAL / MISSING)

| ClawPump step | WindAgents | Status | Evidence |
|---------------|------------|--------|----------|
| Create agent | `POST /api/agents` (local + Partner when cpk_) | **DONE** | AgentsDeskPanel create; links `clawpumpAgentId` |
| Enable token-launch | `POST /api/skills {action:enable}` + local PATCH | **DONE** | Desk skills toggle; default create includes `token-launch` |
| GET pump-pairs | `GET /api/launch/pump-pairs` | **DONE** | Proxy + Confirm picker |
| POST /launch | `POST /api/launch` (+ metaplex fields) | **DONE** | Confirm venue `pump` |
| Self-funded quote→pay→retry | `GET/POST /api/launch/self-funded` + Confirm venue | **DONE** | Launch page self-funded flow |
| POST /launch/pons + poll | `POST/GET /api/launch/pons`, agents pons alias | **DONE** | Confirm + poll |
| POST /launch/pools | `POST /api/launch/pools` | **DONE** (API) / **PARTIAL** (UI) | API + Idempotency-Key; Confirm lacked pools venue until this pass |
| Poll tokenAddress | `GET /api/launch/claw?agentId=` | **DONE** | Confirm poll for pump/claw |
| Fees earnings | `GET /api/fees/earnings?agentId=` | **DONE** (API) / **PARTIAL** (UI) | On ClawPump.tech tab; WindAgents desk lacked inline earnings until this pass |
| ClawPump.tech tab venues + MCP | `ClawPumpTechPanel` | **DONE** | Keep intact |
| WindAgents desk same Confirm flow | `AgentsDeskPanel` | **PARTIAL → closing** | Split pass deferred launch to ClawPump tab only; desk needs “Tokenize like ClawPump” CTAs without removing that tab |
| get_launch_status MCP | — | **MISSING** | Nice-to-have readiness panel |
| PUT /fees/wallet | — | **MISSING** | Ed25519 rotation; launch-time `payoutWallet` covers first set |
| Shared/platform cpk_ | — | **FORBIDDEN** | Never |

---

## 4. What “launch exact like clawpump.tech” means (split desks)

| Desk | Role | Must keep |
|------|------|-----------|
| **ClawPump.tech tab** (`/tokenize?tab=clawpump`) | Partner proxy UX with **user** `cpk_`: venue cards, Confirm, fees, MCP tools/list, three.ws pointers | Intact — do not delete |
| **WindAgents desk** (`/tokenize?tab=windagents`) | Registry agents (Bearer). Must **also** offer the **same** launch Confirm path for registry agents that are linked (`clawpumpAgentId`) **or** create-then-launch (create with `token-launch` + cpk_ → link → Confirm) | Additive “Tokenize like ClawPump” section; still uses **user’s** `cpk_` for real mints |

Honest constraint: **real mints need Partner + user `cpk_`**. Local-only agents without link never get fake Partner ids. WindAgents proxies; ClawPump retains creator custody; 75% share to `payoutWallet`.

Dual path for registrants (Hermes/chat + dashboard):

1. Dashboard: Tokenize → WindAgents desk → create launcher → Confirm `/launch?venue=…`
2. Dashboard: Tokenize → ClawPump.tech tab → same Confirm / MCP / fees
3. skill.md / chat: `POST /api/agents` → enable skills → `POST /api/launch*` with Bearer; Settings vault holds `cpk_`

---

## 5. Prioritized additive fix list (pre-implement)

### P0 — this pass (clearly additive)

1. **UI — WindAgents desk:** full “Tokenize like ClawPump” section — create launcher with `token-launch`, open Confirm with agent preselected (`sessionStorage` + `/launch?venue=`), links for pump / self-funded / pons / pools, show earnings when linked + cpk_.
2. **UI — Confirm:** add `pools` venue wired to existing `POST /api/launch/pools` (API already present).
3. **skill.md append only:** `SKILL_MD_APPEND_TOKENIZE_PARITY` — dual path WindAgents + ClawPump.tech.
4. **No** Helius/Jupiter back into Settings UI.
5. **No** new Partner proxy needed if pools/self-funded/pump-pairs/fees already exist (they do).

### P1 — later

6. `get_launch_status` readiness analogue before Confirm.
7. `PUT /api/fees/wallet` proxy + UI.
8. PONS v2 optional fields UI (`pairToken`, `creatorTaxBps`, `devBuyQuoteIn` as string).

### P2 — different custody (do not mix)

9. three.ws `fun-block.pump.fun` create-coin (user co-sign) — separate from ClawPump custodial tokenize.

---

## 6. Post-implement note

See `preview/TOKENIZE_LIKE_CLAWPUMP_PASS.md` for files changed, build, and skill append verification.
