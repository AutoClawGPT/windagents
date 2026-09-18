# SKILLS_LAUNCH_GAP — ClawPump / three.ws vs WindAgents

**Date:** 2026-09-15  
**Method:** curl Partner API with Settings `cpk_`; raw.githubusercontent three.ws; clawpump.tech/docs scrape; local `/api/skills` probe.  
**No huge git clones.**

---

## ClawPump (Partner REST `https://clawpump.tech/api/v1`)

### Skills catalog
| Item | ClawPump | WindAgents (before this pass) |
|------|----------|-------------------------------|
| Public catalogue | **`GET /skills`** → 9 slugs (`trading`, `perps`, `token-launch`, `portfolio`, `market-intelligence`, `social`, `sniper`, `wallet`, `image-generation`) | `/api/skills` returned **4 fake builtins** only |
| Docs UI extras | ~15 built-in + ambient (`bitget-intel`, `news`, `x402`, lifestyle…) + community/SendAI registries | Not mirrored (Partner `/skills` does not expose them) |
| Enable on agent | `POST /agents` / `POST /agents/{id}` body `skills: string[]` | Create agent forwards skills; **no Skills UI enable** |
| MCP tools | Docs claim 100+ / 132 OAuth MCP tools | WindAgents uses **REST + cpk_** only (correct; MCP OAuth-only) |

### Launch / tokenize
| Venue | ClawPump | WindAgents |
|-------|----------|------------|
| Pump.fun paid / selfFunded | `POST /launch`, `POST /launch/self-funded`, `GET /pump-pairs` | `/api/launch`, `/api/launch/pump-pairs` ✅ |
| PONS (Robinhood Chain) | `POST /launch/pons` | `/api/launch/pons` ✅ |
| Claw / gasless path | Partner `POST /launch` (legacy `/launch/claw` 404) | `/api/launch/claw` → Partner `/launch` ✅ |
| UI Confirm + agent picker | Dashboard / CLI | `/launch` Confirm flow ✅ — naming was “Launch desk”, not Tokenize |
| Honest payment_required | Yes | Yes (no fake mints) ✅ |

**Required launch fields (FINDINGS / docs):** `agentId`, `name`, `symbol`, `description`, `logoUrl`/`imageUrl`, `payoutWallet` (0x for PONS).

---

## three.ws

| Area | What they have | WindAgents |
|------|----------------|------------|
| `pump-fun-skills/` | create-coin, swap, coin-fees, tokenized-agents, reactive avatar (Agent Skills format + scripts) | Not installed as local skill packs |
| `@three-ws/solana-agent` npm `0.2.2` | keypair/wallet, transfers, swaps, x402-exact, vanity | Not a dependency — future optional |
| Avatar / Forge UI | Text→3D, GLB embed, agent-3d | Partial parity via THREEWS_COOL_PASS (catalog, clips, backdrop) — still missing full Forge pipeline / pump reactive feed |
| Tokenized agent payments | `@three-ws/agent-payments` | Not wired |

**Honest remaining:** three.ws pump-fun skill scripts, solana-agent SDK, reactive PumpPortal avatar gestures, full Forge text→3D — **out of this pass** unless trivial UI only.

---

## Sendai / Solana Agent Kit

- docs.sendai.fun v2 introduction = Solana Agent Kit v2 MCP surface.
- ClawPump docs list SendAI community skills (~45).
- **Future MCP** — do not block install.

---

## Priority gaps for this pass

1. **P0** Mirror live ClawPump `GET /skills` into WindAgents `GET /api/skills` + Skills UI when `cpk_` connected; seed builtins = real Partner slugs/descriptions (not fake).
2. **P0** Launch/Tokenize naming + surface required fields; keep Confirm; no paid success fakes.
3. **P1** Enable skills on ClawPump agent via Partner `POST /agents/{id}` when possible; else honest “install on ClawPump”.
4. **P2** skill.md **append only** if catalog/enable semantics missing from public guide.
5. **Defer** three.ws pump-fun packs, Sendai MCP, full Forge.

