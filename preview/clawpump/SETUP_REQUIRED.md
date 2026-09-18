# SETUP_REQUIRED — CLAWCADE checklist (WindAgents)

> **PER-USER KEYS ONLY:** Every human/agent who registers via skill.md saves **their own** `cpk_` / `pbx_` / Helius in Settings.  
> WindAgents **never** embeds platform/test `cpk_` / `pbx_` / Bearer secrets in source, skill.md, env defaults, or server-wide config.  
> Ops env (`ENCRYPTION_KEY`, `ADMIN_TOKEN`, OAuth client, `TREASURY_KEY`, …) is infra for the host — not a shared ClawPump key.

## Quick path (minimum to see Skills + Launch/Tokenize)

| Step | What | Where |
|------|------|-------|
| 1 | Run app | `npm run build && npm start` on `:3000` (cloudflared optional) |
| 2 | Register / login | `/register` or `/login` → Bearer `authToken` / `agentToken` |
| 3 | Save **ClawPump** key | Settings → `clawpumpApiKey: cpk_…` (from https://clawpump.tech/dashboard/api) |
| 4 | Skills UI | `/skills` → badge **ClawPump connected · live catalog** |
| 5 | Launch / Tokenize | `/launch` or `/tokenize` → pick remote agent → Confirm |

Without `cpk_`: Skills shows Partner **seed** slugs + platform helpers; Launch cannot list remote agents (`connect_your_own_key` / message to Settings).

---

## Credentials & what each unlocks

| Credential | Where to put it | Unlocks |
|------------|-----------------|---------|
| **WindAgents Bearer** (`authToken` / `agentToken`) | `Authorization: Bearer …` / localStorage after register | All authenticated APIs, Settings, local agents, Skills enable POST, Launch Confirm |
| **`cpk_` ClawPump Partner API key** | Settings `PUT /api/settings { clawpumpApiKey }` (encrypted) | Live `GET /skills` catalogue · list/create/chat/start/stop ClawPump agents · `POST /api/launch*` · enable skills on agent · quota probe |
| **`pbx_` PayBox** | Settings `payboxApiKey` | `/paybox` MCP depth, spend-limit, sign/transfer/swap requests |
| **Helius API key** | Settings `heliusApiKey` **or** env `HELIUS_API_KEY` | Richer wallet/token balance reads (else public RPC) |
| **ClawPump OAuth client** | env `CLAWPUMP_OAUTH_CLIENT_ID` (+ secret + redirect) | Official **MCP** host `mcp.clawpump.tech` (OAuth-only — rejects `cpk_`). Optional; Partner REST does not need this |
| **`ADMIN_TOKEN`** | env | `/api/rewards/admin`, `/api/rewards/treasury` |
| **`TREASURY_KEY`** | env | Treasury signing stubs only — **no auto paid launches** |
| **`TELEGRAM_BOT_TOKEN`** | env | `/api/telegram` webhook (else honest 501) |
| **`TWITTER_BEARER_TOKEN`** | env | Production X verify (localhost has stub) |
| **`ENCRYPTION_KEY`** | env (required prod) | Vault for cpk_/pbx_/helius at rest |
| **`WIND_MINT` / `AGENT_MINT`** | env (+ optional `NEXT_PUBLIC_*`) | Project token placeholders for swap examples |

---

## Env defaults (`.env.example`)

| Var | Purpose |
|-----|---------|
| `ENCRYPTION_KEY` | AES-GCM vault |
| `DATABASE_URL` | `file:./data/windagents.db` |
| `SOLANA_RPC_URL` | Fallback RPC (public mainnet if unset/empty Helius) |
| `HELIUS_API_KEY` | Preferred RPC / DAS |
| `CLAWPUMP_API_URL` | `https://clawpump.tech/api/v1` (Partner REST + cpk_) |
| `CLAWPUMP_MCP_URL` | `https://mcp.clawpump.tech` (OAuth MCP) |
| `CLAWPUMP_REST_MCP_URL` | `https://api.clawpump.tech/mcp` (cpk_-tolerant MCP path) |
| `PAYBOX_MCP_URL` | `https://api.paybox.sh/mcp` |
| `JUPITER_QUOTE_URL` | Public Jupiter quote |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL for verify links |

**Do not** hardcode AnsemRail / ClawCade product URLs as deps.

---

## Capability matrix (end-to-end)

| Capability | Needs | Notes |
|------------|-------|-------|
| Register human / Ed25519 agent | None | Issues Bearer once |
| Skills seed list (9 Partner slugs) | None | Offline mirror of public catalogue |
| **Live ClawPump skills in `/skills`** | Bearer + **`cpk_`** | Proxies Partner `GET /skills` |
| Enable skill on remote agent | Bearer + **`cpk_`** + ClawPump `agentId` | `POST /api/skills { action:"enable", … }` |
| Agents list remote | Bearer + **`cpk_`** | Existing `/api/agents` — **kept** |
| Chat / start / stop | Bearer + **`cpk_`** | Existing Partner proxy — **kept** |
| ClawPump MCP JSON-RPC | Bearer + **`cpk_`** (REST MCP) or OAuth env | Existing `/api/clawpump/mcp` — **kept** |
| Launch / Tokenize Confirm UI | Bearer + **`cpk_`** + funded agent/wallet as ClawPump requires | `/launch` → `/api/launch`, `/pons`, `/claw` |
| Successful **paid** mint | ClawPump payment / agent SOL / gasless quota | WindAgents surfaces `payment_required` honestly — **no fake success** |
| Jupiter quote | None | Public |
| Jupiter execute broadcast | PayBox / signed tx | Gated unsigned otherwise |
| Wallet balances | Address; Helius optional | Never mocked |
| Bounty payout / rewards treasury | Bearer (+ `ADMIN_TOKEN` / `TREASURY_KEY`) | Marks pending — no invented tx |
| three.ws Forge / pump-fun-skills scripts | Future | Not required for Skills/Launch parity |
| Sendai Agent Kit MCP | Future | Deferred |

---

## Treasury / funding reality check

- **ClawPump** owns agent wallets & launch billing. Fund per ClawPump docs (agent SOL for `selfFunded`, dashboard wallet, or gasless allowance).
- **WindAgents** does not hold a platform launch treasury for users. `TREASURY_KEY` is only for WindAgents rewards admin stubs.
- PONS may return EVM `pay: { chainId, amountEth, to, from }` — pay upstream, then poll; do not re-POST while `reserved`.

---

## Smoke commands (after setup)

```bash
TOKEN=…  # WindAgents Bearer

curl -s http://localhost:3000/api/settings -H "Authorization: Bearer $TOKEN"
# keys.hasClawpump: true

curl -s http://localhost:3000/api/skills -H "Authorization: Bearer $TOKEN"
# clawpump.connected true, clawpump.live true, clawpump.skills length 9

curl -s http://localhost:3000/api/agents -H "Authorization: Bearer $TOKEN"
# clawpump.connected true, remote agents present

# Do NOT run paid launch in smoke unless intentionally funding
curl -s http://localhost:3000/api/launch/pump-pairs -H "Authorization: Bearer $TOKEN"
```

---

## Still deferred (honest)

- three.ws `pump-fun-skills` local packs / `@three-ws/solana-agent` dependency
- Sendai / Solana Agent Kit v2 MCP install
- ClawPump docs community + SendAI registries beyond Partner `GET /skills` (9 public slugs)
- Full three.ws Forge text→3D pipeline

See `SKILLS_LAUNCH_GAP.md` + `SKILLS_LAUNCH_PASS.md`.

---

## Gap analysis docs (2026-09-15 deep pass)

- `preview/MASTER_GAP_1_TO_100.md` — weighted score vs full ask
- `preview/WHAT_YOU_STILL_NEED.md` — credentials CLAWCADE must provide vs registrant Settings
