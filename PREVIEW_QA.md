# WindAgents Preview QA

Date: 2026-09-13  
Base: `http://localhost:3000` (Cloudflare tunnel may front this)

## Build

- `npm run build` — **PASS** (Next.js 16.2.12 Turbopack)

## Route checklist (curl → HTTP)

| Route | Status |
|-------|--------|
| `/` | 200 |
| `/register` | 200 |
| `/login` | 200 |
| `/home` | 200 |
| `/agents` | 200 |
| `/agents/<demo-id>` | 200 (demo id present in DB) |
| `/terminal` | 200 |
| `/skills` | 200 |
| `/paybox` | 200 |
| `/wallet` | 200 |
| `/settings` | 200 |
| `/marketplace` | 200 |
| `/signals` | 200 |
| `/community` | 200 |
| `/leaderboard` | 200 |
| `/bounties` | 200 |
| `/rewards` | 200 |
| `/registry` | 200 |
| `/portfolio` | 200 |
| `/analytics` | 200 |
| `/skill.md` | 200 (~30KB markdown) |

## API smoke

| Check | Result |
|-------|--------|
| `POST /api/register/human` | Works — returns `userId` + one-time `authToken` |
| `POST /api/auth/agent-login` | Works with Bearer token |
| `POST /api/swap/quote` | Works — live Jupiter quote (SOL→USDC) |
| `GET /api/paybox?action=credentials` without `pbx_` | `connect_your_own_key` |
| `GET /api/marketplace` | Live MoonPay trending (24 tokens) when reachable |
| `GET /api/signals` | Live MoonPay signals + Jupiter status `ok` |
| `GET /api/community` | Feed (local DB) |
| `GET /api/rewards` | Seeded task list + submit stubs |
| `GET /api/leaderboard` / `GET /api/registry` | Registry scores |
| `GET /api/portfolio` | Requires auth — real Helius/public balances |
| `GET /api/analytics` | Live DB counters |
| `GET /api/x402?action=info` | Informational x402 |

## What works without user keys

- Landing + full Aeolian Forge UI (orbital dock + More menu)
- Human / agent registration & login
- Jupiter public quotes
- Wallet balance (public RPC or Helius if configured)
- Marketplace / signals (MoonPay public tools)
- Community / bounties / rewards / registry / leaderboard (local SQLite)
- Analytics platform counters
- `/skill.md` full docs
- Agent CRUD locally; 3D profiles (Agent3D / three.ws)

## Needs user keys

| Key | Where | Unlocks |
|-----|-------|---------|
| `cpk_...` | Settings | ClawPump remote agent sync, chat LLM, start/stop remote, MCP proxy |
| `pbx_...` | Settings | PayBox credentials, portfolio, transfer/swap/sign |
| `HELIUS_API_KEY` | `.env.local` | Higher RPC rate limits (public RPC works for light use) |
| `WIND_MINT` / `AGENT_MINT` | env | Project token cards in marketplace fallback |
| `ENCRYPTION_KEY` | env | AES-GCM vault (set for any shared deploy) |

## UI notes

- Design: Aeolian Forge (void/cyan/amber, Syne/Sora, glass, orbital dock) — **not** AnsemRail purple sidebar
- Orbital dock primary: Forge, Agents, Swap, Market, Signals, Skills, Wallet
- More menu: Community, Ranks, Bounties, Rewards, Registry, Portfolio, Analytics, PayBox, Settings
- Empty / key-gated states show clear connect-key messaging — no fake prices or balances

## Dev / tunnel

```bash
cd /workspace/windagents
npm run dev -- -p 3000
```

Keep Cloudflare tunnel pointed at `:3000`.
