# Launch Parity Pass — 2026-09-15

**Source notes:** `preview/LAUNCH_PARITY_NOTES.md`  
**Scope:** Additive Partner gaps only. Per-user `cpk_` via Settings vault. No shared keys. Existing `/api/launch`, `/api/launch/pons`, `/api/launch/claw`, clawpump MCP, PayBox unchanged in contract.

## Build / runtime

- `npm run build` — **OK** (routes include new venues)
- Restarted `next start -H 0.0.0.0 -p 3000` — Ready; **cloudflared left running**
- Smoke: `GET /api/launch` → 200 with new venue map; unauthenticated new routes → 401; `/launch` → 200
- Secret scan: **no hardcoded `cpk_` / `pbx_` values in `src`**

## Shipped APIs

| WindAgents | Upstream | Notes |
|------------|----------|-------|
| `GET`+`POST /api/launch/self-funded` | Partner `/launch/self-funded` | Quote `?quoteMint=`; POST preflight / pay+retry; 120s timeout; honest 402s; `PAYMENT-SIGNATURE` + `Idempotency-Key` passthrough |
| `POST /api/launch/pools` | Partner `/launch/pools` | Uniswap via pools.trade; `Idempotency-Key` passthrough |
| `GET /api/fees/earnings?agentId=` | Platform `/api/fees/earnings` | via `proxyClawpumpPlatformJson`; honest errors if missing |
| `POST /api/launch` | Partner `/launch` | Also forwards `metaplexGenesis` / `metaplexFirstBuyAmountSol` (additive) |
| `POST /api/launch/pons` | Partner `/launch/pons` | Additive: `Idempotency-Key` + `paymentTxHash` passthrough |

All use `requireCpk` → `extractClawpumpKey` (user Settings vault). Payment / `LAUNCH_PAYMENT_REQUIRED` / `PAYMENT-REQUIRED` pass through honestly.

## UI `/launch`

- Loads **pump-pairs** from `GET /api/launch/pump-pairs` → pair picker (`pumpQuoteMint`) + `pumpCreatorFeeBps` when custom (not SOL)
- **Self-funded quote** venue: Preflight → show `amountLamports` / `payTo` / `preflightToken` → paste `txSignature` → Retry
- Claw copy: **not gasless** — Partner `POST /launch`, payment may be required; gasless first-3 retired
- **Poll on pump** now hits `GET /api/launch/claw?agentId=` (tokenAddress), not PONS
- Existing pump / pons / claw Confirm flow preserved

## skill.md

Short additive append `SKILL_MD_APPEND_LAUNCH_PARITY` documents the new endpoints for registrants (no secrets).

## Left alone

- Tokenize hub (`/tokenize`) — already expanded by prior pass (`TOKENIZE_HUB_PASS.md`)
- No three.ws create-coin / user-signed mint path (different custody model)
- No platform `cpk_` / `pbx_` / Helius / Jupiter secrets in source or skill.md

## Success checklist

- [x] Build OK  
- [x] New routes exist (`self-funded`, `pools`, `fees/earnings`)  
- [x] UI uses pump-pairs + self-funded  
- [x] No shared keys  
- [x] Existing launch / pons / claw / MCP / PayBox not broken  
