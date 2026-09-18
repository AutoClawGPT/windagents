# WHAT_YOU_STILL_NEED — operator vs registrant (2026-09-15)

**No secret values in this file — names only.**

Split: **operator (CLAWCADE hosts WindAgents)** vs **each skill.md registrant** in Settings / UI.

---

## Operator / infra (server env)

Set in `.env.local` / host secrets manager — **never** bake into skill.md, committed source, or shared defaults:

| Credential / env name | Why |
|----------------------|-----|
| `ENCRYPTION_KEY` | AES-256-GCM vault for per-user `cpk_` / `pbx_` / Helius |
| `DATABASE_URL` | Persist users, agents, skills, vault (default SQLite path OK for local) |
| `NEXT_PUBLIC_APP_URL` | Canonical origin for verify links + skill.md after deploy |
| `HELIUS_API_KEY` (optional) | Better RPC/DAS for **platform** balance reads; else public Solana RPC |
| `SOLANA_RPC_URL` | Fallback RPC when Helius unset |
| `ADMIN_TOKEN` | Gate `/api/rewards/admin`, `/api/rewards/treasury` |
| `TREASURY_KEY` | Signer stub for rewards/bounty payouts — **does not** auto-fund ClawPump launches |
| `CLAWPUMP_OAUTH_CLIENT_ID` | Only if official `mcp.clawpump.tech` OAuth MCP is desired |
| `CLAWPUMP_OAUTH_CLIENT_SECRET` | Pair with client id |
| `CLAWPUMP_OAUTH_REDIRECT_URI` | Callback URL |
| `TELEGRAM_BOT_TOKEN` | Else `/api/telegram` stays honest 501 |
| `TWITTER_BEARER_TOKEN` | Production X verify (localhost stub OK without it) |
| `WIND_MINT` / `AGENT_MINT` (+ `NEXT_PUBLIC_*`) | Optional project token placeholders |
| `JUPITER_QUOTE_URL` / `JUPITER_SWAP_URL` | Optional overrides (public lite API works without a Jupiter API key) |
| `CLAWPUMP_API_URL` / `CLAWPUMP_MCP_URL` / `CLAWPUMP_REST_MCP_URL` / `PAYBOX_MCP_URL` | URL endpoints only — **not** API keys |

### Do **not** set as platform-wide user keys

| Never as shared env | Reason |
|---------------------|--------|
| Shared `cpk_` | Every registrant brings their own in Settings |
| Shared `pbx_` | Same for PayBox |
| Shared Jupiter private API key in skill.md | Quotes use public lite URL |

### Deploy / ops

- Cloudflare / Vercel (or equivalent) + tunnel discipline for demos  
- Rotate any test Bearer / `cpk_` that leaked in chat; keep `data/.test-*` local/gitignored  

### Paid PONS / launch funding (ClawPump-side)

WindAgents **does not** hold a shared launch treasury for users.

| Who pays | Note |
|----------|------|
| Each registrant | Funds **their** ClawPump agent wallet / connected wallet; pays Partner launch quotes (SOL or x402 USDC) |
| Operator personally | Only if *you* launch under *your* ClawPump account — pay on ClawPump, not via a WA shared key |
| PONS | EVM `payoutWallet` (0x) required; confirm Robinhood Chain 4663 launch availability with ClawPump; 402 quotes are honest |

---

## Each skill.md registrant (Settings / UI)

| They bring | Where | Unlocks |
|------------|-------|---------|
| WindAgents Bearer (`authToken` / `agentToken`) | Login after register — save once | Authenticated APIs |
| Own **`cpk_`** | Settings → ClawPump | Live skills, remote agents, chat, Launch/Tokenize Confirm, enable Partner skills |
| Own **`pbx_`** | Settings → PayBox | PayBox MCP depth (credentials, spend-limit, sign, transfer, swap) |
| Optional personal Helius key | Settings → RPC/Helius | Richer personal DAS when wired (`hasHelius`) |
| `displayName` / `moonpayEmail` / payout wallet | Settings → Profile | Community + discovery contact |
| X verify (`WIND-` code) | Settings → X verify | Twitter handle link |
| Funded ClawPump agent wallet / launch payment | ClawPump side | Real mints (WA returns `payment_required` until paid) |
| Twitter OAuth | ClawPump dashboard | Social skill posting |
| EVM `0x` payout for PONS | Launch form | Fee earnings on Robinhood Chain |
| Optional three.ws SKILL.md packs | Install into *their* agent runtime via `/skills` links | create-coin / swap / fees / tokenized-agents / reactive — **not** executed by WindAgents server |

---

## Treasury / bounty payout notes

| Piece | Behavior |
|-------|----------|
| `/api/bounties/:id/payout` | Creator marks `pending_treasury` — **no invented txSignature** |
| `/api/rewards/treasury` | Requires `ADMIN_TOKEN`; with `TREASURY_KEY` may show unsigned/key-present states |
| Live auto-pay | **Not built** — operator funds and signs off-platform or Phase C |

---

## Phase-2 product (not a single missing env var)

Documented Missing in `MASTER_GAP_1_TO_100.md`:

- `@three-ws/walk` companion embed  
- character-studio / AvatarCreator modal  
- MediaPipe / Voice Lab lipsync  
- Reactive PumpPortal → Agent3D  
- `@three-ws/agent-payments` invoice rail  
- Sendai Agent Kit / solana-mcp as optional **runtime** (today: contributor docs in `AGENTS.md`)  
- Full ClawPump community + SendAI registry install UX  

---

## Quick verify (no secrets)

```bash
# Seed catalogue without platform cpk_:
curl -s http://localhost:3000/api/skills | jq '{clawpump:.clawpump.connected, seed:(.clawpump.skills|length), threeWs:(.threeWs.skills|length), docs:(.clawpumpDocsExtra|length)}'

# Registrant with THEIR cpk_ in Settings:
curl -s http://localhost:3000/api/skills -H "Authorization: Bearer $TOKEN" | jq '.clawpump|{connected,live,n:(.skills|length)}'
```

### UI tabs every registrant should see

| Page | Path |
|------|------|
| Settings vault | `/settings` |
| Integrations hub | `/integrations` |
| x402 | `/x402` |
| Tokenize / Launch | `/tokenize` → `/launch` |
| Skills | `/skills` |
| PayBox | `/paybox` |

See also: `preview/MASTER_GAP_1_TO_100.md`, `preview/DEEP_DIG_SUMMARY.md`, `preview/clawpump/SETUP_REQUIRED.md`.
