# LAUNCH_PARITY_NOTES

**Date:** 2026-09-15  
**Purpose:** Additive mirror of ClawPump token launch / tokenize and three.ws create-coin for WindAgents.  
**Sources:** `https://clawpump.tech/developers` (Partner REST contract), `https://clawpump.tech/docs` (MCP + platform REST), `nirholas/three.ws` pump-fun-skills SKILL.md files, npm `@three-ws/solana-agent@0.2.2`, local `/workspace/windagents/src/app/api/launch/*`.  
**Rules:** No application source changes. No secrets. Per-user `cpk_` only.

---

## 1. ClawPump Partner endpoints (launch / tokenize / fees)

**Contract:** Partner REST is the versioned, response-shape-stable API WindAgents already proxies.

| | |
|---|---|
| Base URL | `https://clawpump.tech/api/v1` |
| Auth | `Authorization: Bearer cpk_…` on every request |
| Content-Type | `application/json` |
| Host rule | Use apex `clawpump.tech`. `agents.clawpump.tech` 308-redirects and **drops Authorization** → 401 |

There is **no** Partner path named `/tokenize`. Homepage “tokenize” = `POST /agents` (create launcher) then `POST /launch`.

### 1.1 Launch / tokenize (Partner v1)

| Method | Path | Role |
|--------|------|------|
| `POST` | `/agents` | Create launcher agent (required `name`; optional `skills` including `token-launch`) |
| `GET` | `/agents/{agentId}` | Fetch agent **including `tokenAddress`** (null until linked). Robinhood CA wins if both exist |
| `GET` | `/pump-pairs` | Live Pump.fun creation pairs + `creatorFeeBps` `{ min:100, max:300, default:100 }` |
| `POST` | `/launch` | **Paid pump.fun launch** (this is tokenize). `selfFunded: true` pays from the **agent SOL wallet** |
| `GET` | `/launch/self-funded` | Cost discovery. Query `quoteMint` optional (same mint as `pumpQuoteMint`) |
| `POST` | `/launch/self-funded` | External-wallet / x402 paid launch: preflight quote → pay → retry with proof |
| `POST` | `/launch/pons` | Robinhood Chain (EVM) Pons launch. `Idempotency-Key` header |
| `POST` | `/launch/pools` | Uniswap via pools.trade. `Idempotency-Key` header |

**Not on Partner v1 (404 / retired):** `POST /launch/claw`, `POST /launch/pump`, gasless first-3. Docs MCP still lists `launch_token_gasless` as **legacy — use the paid launch flow**.

#### `POST /api/v1/launch` body

| Field | Required | Notes |
|-------|----------|-------|
| `agentId` | yes | Owned by the key |
| `symbol` | yes | |
| `description` | yes | |
| `name` | no | Defaults to symbol |
| `imageUrl` / `image_url` | no* | Required unless the agent already has an avatar |
| `payoutWallet` | no | Solana base58; **75% creator-fee share only**. ClawPump **retains the creator wallet** |
| `twitter` / `twitterUrl` / `xHandle` / `xLink` | no | |
| `selfFunded` | no | `true` authorizes payment from the agent wallet |
| `pumpQuoteMint` | no | From `GET /pump-pairs`. Omit / wrapped SOL = standard SOL pair |
| `pumpCreatorFeeBps` | no | Custom pairs only: integer **100–300**. Default 100. SOL pairs **cannot** set this |
| `initialBuySol` / `devBuySol` | no | Dev buy in SOL; `0` = none |
| `metaplexGenesis` | no | `true` → Metaplex Genesis curve instead of pump.fun |
| `metaplexFirstBuyAmountSol` | no | |

402 on this endpoint is **self-funding guidance** (`code`, `selfFunded.fundWallet`, `requiredSol`) — not fatal.

Success includes `status: "launched"`, `mintAddress`, `txHash`, optional `pumpQuoteAsset`, `payoutWallet`. One token per agent (`409 AGENT_ALREADY_HAS_TOKEN`).

#### `POST /api/v1/launch/self-funded` (quoted payment — two/three calls)

Required body: `name` (1–32), `symbol` (1–10), `description` (20–500), `imageUrl`, `agentId`, `agentName`, `walletAddress` (payer **and** 75% beneficiary).

**SOL path**

1. `POST` with `preflight: true` → 200 `{ payment: { amountLamports, payTo, payFrom, validForSeconds: 900 }, retryWith: { preflightToken } }`
2. Send **exactly** `amountLamports` from `walletAddress` to `payTo`
3. Repeat **identical body** (no `preflight`) plus `txSignature` + `preflightToken`

**USDC / x402 path:** POST with no payment → 402 `PAYMENT-REQUIRED` → pay `accepts[0]` (USDC Solana mainnet) → retry with `PAYMENT-SIGNATURE`. Min ~$1.50.

Idempotent on `txSignature`. After paying, never change the body. `GET /launch/self-funded` is estimate only; the signed preflight pins the amount.

#### `POST /api/v1/launch/pons`

Required: `agentId`, `symbol` (1–12 alnum), `description`, `logoUrl` (https or ipfs; also `imageUrl`), `payoutWallet` (**0x EVM**, 40 hex). Optional: `name`, socials, v2 `pairToken` / `creatorTaxBps` / `buybackEnabled` / `devBuyQuoteIn` (STRING). Poll platform `GET /api/agents/{agentId}/pons/launches/{id}` until `finalized`. 402 without payment; retry same `Idempotency-Key` + `paymentTxHash`.

#### `POST /api/v1/launch/pools`

Wallet-funded Uniswap via pools.trade. `agentId`/`agent_id` + `symbol` required. Same idempotency semantics as Pons.

### 1.2 Fees / earnings

**Not on Partner v1.** `clawpump.tech/developers` has no `/fees/*`. Payout is set at launch via `payoutWallet` (75% of creator fees in the **paired asset**; 25% platform). Fixed once the agent’s token exists.

Platform / docs surface (use `https://clawpump.tech/api`, not `/api/v1`):

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/fees/earnings?agentId=` | `{ totalEarned, totalSent, totalPending, totalHeld, recentDistributions }` |
| `PUT` | `/fees/wallet` | Register payout wallet. Body: `agentId`, `walletAddress`, `signature`, `timestamp` (Ed25519) |
| `GET` | `/agents/{agentId}/earnings` | Homepage / MCP resource `clawpump://agent/{agentId}/earnings` |
| MCP | `fee_earnings`, `fee_stats`, `agent_earnings` | Launchpad MCP; `fee_earnings` unauthenticated in docs |
| MCP | `set_external_wallet` | Dashboard / MCP payout registration |
| Internal | `/api/internal/fees/collect` | Hourly cron — not a partner integration |

Split (current Token Launch + Revenue docs): **75% agent creator / 25% platform**. Older search snippets still say 65/35 — ignore those; Partner copy and `/docs` Token Launch section both say 75/25. Pons docs: agent EVM `payoutWallet` gets **50% of every trade fee**.

Custody: ClawPump creates and **controls the creator wallet**; partner `payoutWallet` is a forwarding share only.

### 1.3 MCP launch tools (docs — not Partner REST)

Launchpad MCP `https://clawpump.tech/api/mcp`: `launch_token`, `launch_token_self_funded`, `launch_metaplex_genesis_token`, `launch_pons`.  
Agent MCP (`@clawpump/agents` / `https://mcp.clawpump.tech/mcp` OAuth): `get_launch_status`, `launch_token_gasless` (legacy), `launch_metaplex_genesis_token`. Official connector is OAuth-only and **rejects `cpk_`**.

---

## 2. three.ws skill steps — create-coin

**Repo:** `https://github.com/nirholas/three.ws/tree/main/pump-fun-skills`  
**Canonical skill:** `pump-fun-skills/create-coin/SKILL.md`  
(also mirrored at `pump-fun/pump-fun-skills`). Sibling skills: `swap`, `coin-fees` (not `fees/`), `tokenized-agents`, `reactive`. There is **no** `fees/SKILL.md`.

This is a **different model** from ClawPump: the **user wallet co-signs**; mint keypair is generated/partial-signed; creator custody stays with the signer. ClawPump is custodial-creator + payout share.

### 2.1 Mandatory questions (do not assume defaults)

RPC URL · signer pubkey (fee payer / creator) · framework · name/symbol/metadata URI · initial buy (SOL lamports) · cashback? · mayhem? · tokenized agent? (+ buyback bps) · front-runner protection? (+ Jito tip, default 0.0001 SOL).

### 2.2 Preferred API — `https://fun-block.pump.fun`

`POST /agents/create-coin`

Required: `user`, `name`, `symbol`, `uri`, `solLamports`.  
Optional: `mayhemMode`, `cashback`, `tokenizedAgent`, `buybackBps`, `frontRunningProtection`, `tipAmount` (SOL, not lamports), `encoding` (**always `"base64"`**), `feePayer`, `creator`.

Response: base64 **partial-signed** `VersionedTransaction` + `mintPublicKey` (script path stamps `3ws…` vanity; hosted API mint is **not** guaranteed to carry the mark).

Then:

1. `VersionedTransaction.deserialize`
2. User wallet co-signs (never sign for the user; never log secrets)
3. If `frontRunningProtection`: send **only** to Jito block-engine endpoints  
   Else: `sendRawTransaction` + `confirmTransaction`

### 2.3 Script path (only if user explicitly requests)

`scripts/build-create-coin-tx.mjs` — grinds vanity mint (`THREE_WS_MARK` = `3ws`), `createV2AndBuyInstructions` via `@pump-fun/pump-sdk`. Tokenized agent appends `PumpAgentOffline.load(mint).create(...)` from `@three-ws/agent-payments` (`--buyback-bps`, default 5000). Tokenized-agent coins **must** have initial buy > 0.

Program: Pump `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`.

### 2.4 Sibling skills (context, not create-coin)

| Skill | Preferred API |
|-------|----------------|
| **swap** | `POST https://fun-block.pump.fun/agents/swap` (`inputMint`/`outputMint`/`amount`/`user`; NATIVE_MINT = buy vs sell) |
| **coin-fees** | `POST /agents/collect-fees`, `POST /agents/sharing-config` |
| **tokenized-agents** | `@three-ws/agent-payments` `PumpAgent.buildAcceptPaymentInstructions` → user signs → `validateInvoicePayment` |

### 2.5 `@three-ws/solana-agent` (npm 0.2.2)

**Does not create coins.** Wallet + actions only: `fromKeypair` / `fromBrowserWallet`, SOL/SPL transfer, Jupiter swap, stake, x402 exact USDC, AgenC task helpers, vanity grind (`/vanity`). Sibling: `@three-ws/agent-payments`. WindAgents does not depend on it.

---

## 3. What WindAgents already proxies

All under Bearer + **user’s own Settings `cpk_`** via `proxyClawpumpJson` → `https://clawpump.tech/api/v1`. Payment-required / 401/402 / `LAUNCH_PAYMENT_REQUIRED` pass through. No fake mints.

| WindAgents | Upstream | Notes |
|------------|----------|-------|
| `GET /api/launch` | help JSON | Lists venues |
| `POST /api/launch` | `POST /launch` | Forwards `agentId`, `symbol`, `description`, `name`, `imageUrl`, `payoutWallet`, `selfFunded`, `pumpQuoteMint`, `pumpCreatorFeeBps`, `initialBuySol`/`devBuySol`, `twitter` |
| `GET /api/launch/pump-pairs` | `GET /pump-pairs` | Catalogue only |
| `POST /api/launch/pons` | `POST /launch/pons` | Requires `payoutWallet` 0x + `logoUrl`; wraps poll hint |
| `GET /api/launch/pons?agentId=&launchId=` | platform `GET /api/agents/{id}/pons/launches/{id}` then v1, then agent record | Skips known-405 `GET /launch/pons` |
| `GET /api/agents/:id/pons/launches` | same poll alias | |
| `POST /api/launch/claw` | `POST /launch` | Legacy `/launch/claw` 404; `mode: paid` → `selfFunded: true` |
| `GET /api/launch/claw?agentId=` | `GET /agents/{id}` (+ list fallbacks) | |
| UI `/launch` (alias `/tokenize` 307) | those POSTs | Agent picker, Confirm, honest errors |
| `GET /api/agents` | `GET /agents` | Remote list for picker |
| `POST /api/skills` `action:enable` | `POST /agents/{id}` | Can enable `token-launch` |

`skill.md` already documents PONS + claw + Partner launch desk. `SKILL_MD_APPEND_SKILLS_LAUNCH` covers `/launch` / `/tokenize` / skills catalogue.

---

## 4. Concrete additive API / UI gaps (no shared keys)

Do **not** add a platform `cpk_`. Every launch still uses the registrant’s Settings key.

### P0 — Partner launch surface WindAgents does not proxy

1. **`GET` + `POST /api/v1/launch/self-funded`**  
   UI checkbox `selfFunded` only hits `POST /launch` (agent-wallet debit). Registrants who need to **pay from an external wallet** (SOL quote / x402 USDC) have no WindAgents quote → pay → `txSignature`+`preflightToken` retry. Empty agent wallet → 402 with no in-app completion path.

2. **Forward `metaplexGenesis` / `metaplexFirstBuyAmountSol`** on `POST /api/launch` (Partner fields exist; WindAgents drops them).

3. **`POST /launch/pools`** — Uniswap venue missing entirely.

4. **`Idempotency-Key` on PONS (and future pools)** — Partner says retries without it can double-mint.

### P0 — UI gaps against already-proxied APIs

5. **`/launch` never calls `GET /api/launch/pump-pairs`.** API already accepts `pumpQuoteMint` / `pumpCreatorFeeBps`; UI cannot pick a custom pair or 1–3% creator fee.

6. **Pump venue “Poll status” GETs `/api/launch/pons`** (`page.tsx` fallback). Pump launches should poll `GET /api/launch/claw?agentId=` or `GET /api/agents/:id` `tokenAddress`.

7. **Claw tab still offers `mode: gasless`.** Partner + current docs: all launches are payment-required; gasless is retired. Misleading for registrants.

### P1 — fees / tokenize completeness

8. **No proxy for platform `GET /api/fees/earnings` or `PUT /api/fees/wallet`.** Launch can set `payoutWallet` once; there is no WindAgents read of accrued fees or Ed25519 wallet rotation.

9. **No `get_launch_status` analogue** (MCP readiness: metadata, funding options, wallet balance) before Confirm.

10. **PONS poll** still degrades to 503 when Partner list paths 404/405 — already honest, but UI does not require `launchId` from POST.

### P2 — three.ws create-coin (optional additive, different custody)

11. No `fun-block.pump.fun` `POST /agents/create-coin` (or swap / collect-fees) proxy. Would be **user-signed**, not ClawPump-custodial — do not mix mint authority models in one button.

12. No `@three-ws/solana-agent` / `@three-ws/agent-payments` / `@pump-fun/pump-sdk` in the app. Needed only if WindAgents wants user-signed 3ws-marked mints or tokenized-agent invoices.

13. **Do not** grind vanity keys or hold mint keypairs server-side unless a future pass explicitly designs non-custodial signing.

### Docs drift (do not copy into product copy)

- `/docs` MCP tables still mention sponsored / gasless first-3; Partner + Token Launch section say **wallet payment required**.
- Fee split snippets in the wild (65/35) conflict with current 75/25.
- `skill.md` claw section still says “~3 sponsored gasless launches” — stale vs Partner.

---

## 5. Recommended skill.md append

**None.** Registrants are not blocked:

- `POST /api/register/agent` (or human register) works without ClawPump.
- Saving **their own** `cpk_` in Settings + `POST /api/agents` + `POST /api/launch` (or UI `/launch`) is already documented in existing skill.md appends.
- Missing self-funded quote flow / pairs picker / fees read are **additive product gaps**, not missing install instructions.

Do **not** append secrets, shared keys, or three.ws RPC defaults.

Optional later (only if a pass ships the P0 proxies): a short additive note that gasless is retired, self-funded is `POST /api/launch/self-funded` (preflight → pay → retry), and custom pairs come from `GET /api/launch/pump-pairs`. Until those routes exist, an append would document endpoints that WindAgents does not serve.

---

## 6. Suggested additive order (implementation later — not this pass)

1. UI: pump poll → claw/agent `tokenAddress`; hide “gasless”; load pump-pairs into the form.  
2. `GET`/`POST /api/launch/self-funded` proxy (user `cpk_`, 120s timeout, pass 402/headers, never fake mint).  
3. Forward `metaplexGenesis*`; optional `POST /api/launch/pools` + `Idempotency-Key` on pons.  
4. Optional platform `GET /api/fees/earnings` proxy (read-only).  
5. three.ws create-coin only if a **non-custodial, user-signed** venue is explicitly wanted — separate from ClawPump tokenize.
