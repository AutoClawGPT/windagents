# WindAgents FULL AUDIT

**Date:** 2026-09-14T00:41Z (UTC)  
**Target:** `http://127.0.0.1:3000` (tunnel `https://deaf-push-vacation-oldest.trycloudflare.com` — root 200; left cloudflared alone)  
**Tester:** Bearer from `data/.test-agent-token` (user `9c62e335…`, displayName ClawPump Suite Agent)  
**Constraints honored:** no file deletes; no `skill-md.ts` rewrite; no `cpk_`/`pbx_`/Bearer secrets written into repo docs; no paid PONS/claw launches.

---

## Overall: **80% complete**

Weighted (honest):

| Bucket | Weight | Earned | Notes |
|--------|--------|--------|-------|
| Core skill.md register + profile + settings + agents + ClawPump | 40% | **35** | Register/login/settings/agents/start-stop/remote list solid. Chat blocked by ClawPump `free_quota_exceeded` (402) at audit time. |
| Launch / PONS | 15% | **9** | Validation + honest `payment_required` work. Claw upstream 404; PONS poll/list upstream 405/404. |
| Trading / wallet | 15% | **12** | Tools + wallet + portfolio + swap quote OK (quote flaked 429 once then recovered). PayBox needs own `pbx_`. |
| Social tabs | 10% | **8.5** | Community/registry/signals/leaderboard/bounties/rewards live. Profile query needs `userId`. |
| UI polish | 10% | **8** | All `(app)` pages HTTP 200, no Application Error digests. Input `placeholder=` attrs only — not stub pages. |
| Docs / skill parity | 10% | **8.5** | `/skill.md` 47KB, secrets scan clean; tools need `chain` (docs should stress this). |
| **Total** | **100%** | **≈80** | |

---

## Area status table

| Area | Status | Notes |
|------|--------|-------|
| Health `/` `/home` `/login` `/register` `/skill.md` | **pass** | All HTTP 200 |
| Tunnel root | **pass** | 200 (informational; not required for local) |
| Auth Bearer + `/api/auth/agent-login` | **pass** | Login 200; same user |
| `/api/settings` GET | **pass** | `hasClawpump:true`; raw key **not** returned; `keysConfigured:["clawpumpApiKey"]` |
| Agents list local + ClawPump remote | **pass** | 3 local; `clawpump.connected:true` with remote agents |
| Public `GET /api/agents/{id}` (no auth) | **pass** | Leaderboard `agentId` + owned agent both 200 |
| Profile HTML `/agents/{id}` | **pass** | 200 (~23KB) |
| Persona / messages | **pass** | 200 |
| Start / stop | **pass** | Start→running, stop→stopped via ClawPump; left stopped |
| Chat | **fail** *(upstream)* | `POST /api/agents/chat` → 502 `clawpump_chat_failed` / ClawPump **402 `free_quota_exceeded`** |
| Quota | **partial** | 200 honest: cpk present, remaining `null` (no invented counts) |
| Leaderboard `agentId` | **pass** | Field present on entries; sample profile 200 |
| Launch GET + pump-pairs | **pass** | Venue map + SOL/USDC/… assets |
| PONS POST (incomplete) | **pass** | 400 `missing_fields` |
| PONS POST (full, no pay) | **pass** | **`payment_required`** with pay instructions — expected, not a failure |
| PONS poll GET | **fail** | Upstream **405** on ClawPump poll path |
| `GET …/pons/launches` | **fail** | Upstream **404** |
| Claw / gasless launch | **fail** | Tries `/launch/claw` then `/launch/pump`; both upstream **404** |
| `token_trending_list` | **pass** | POST 200 (GET 405 by design) |
| `token_search` | **pass** | Needs `{"query","chain":"solana"}`; without `chain` → 502 upstream 400 |
| `token_retrieve` | **partial** | Works with `chain`; returned address truncated by 1 char (`…111` vs `…1112`) |
| Upload multipart + JSON `{image}` | **pass** | 201; GET `/api/upload/{id}` 200 `image/png` |
| Verify WIND- | **pass** | `action:start` issues code; local stub verify with `tweetUrl` → verified |
| Community GET | **pass** | Posts returned |
| Registry GET | **pass** | Overlaps leaderboard data |
| Signals GET | **pass** | MoonPay-trending derived signals |
| Marketplace GET | **pass** | Live token list |
| Portfolio GET | **pass** | Agents + wallets (0 SOL on sample) |
| Wallet balance | **pass** | Requires `?address=`; public RPC OK |
| Swap quote | **pass** | POST works (one 429 flake); GET returns usage docs |
| Swap execute | **pass** *(gated)* | 400 without `quoteResponse` — correct |
| PayBox | **partial** | GET info stub OK `connected:false`; POST → `connect_your_own_key` (no `pbx_` in settings — expected) |
| x402 | **partial** | GET informational; POST needs amount — stub/info layer |
| Telegram | **partial** | GET configured:false; POST 501 — intentional stub |
| ClawPump OAuth / MCP info | **partial** | Honest stubs; REST+cpk_ is the real path |
| Analytics / bounties / rewards / skills | **pass** | Live DB-backed lists |
| Image-proxy | **partial** | Allowlist enforced (expected 400 off-list); on-list depends on upstream |
| Secrets in skill.md / docs | **pass** | **No live `cpk_` / `pbx_` / Bearer hex tokens** |
| App pages server errors | **pass** | No Application Error / Internal Server Error markers on sampled routes |

---

## Broken list (actionable)

1. **Agent chat blocked by ClawPump free quota** — `POST /api/agents/chat` returns WindAgents 502 wrapping upstream 402 `free_quota_exceeded`. Start/stop still work. *Action:* surface quota clearly in UI/skill.md; document paid ClawPump tier; retry/backoff messaging.
2. **Claw/gasless launch path dead upstream** — `POST /api/launch/claw` → ClawPump `/launch/claw` and `/launch/pump` both **404**. *Action:* confirm current ClawPump Partner API paths; update proxy route list; until then mark UI venue as unavailable.
3. **PONS poll / launches history broken upstream** — `GET /api/launch/pons?agentId=` → **405**; `GET /api/agents/:id/pons/launches` → **404**. POST still correctly returns `payment_required`. *Action:* align poll method/path with ClawPump docs; don’t instruct agents to poll a 405 endpoint.
4. **`token_retrieve` address truncation** — SOL mint came back length 43 (missing final `2`). *Action:* fix mapping (address→token) so mint is not sliced.
5. **Tools require `chain`** — omitting `chain` yields opaque 502 from MoonPay. *Action:* validate locally → 400 `chain required`; update skill.md examples.
6. **Community profile** — `GET /api/community/profile` without `userId` → 400. Fine if documented; otherwise default to self when Bearer present.
7. **Swap quote intermittent 429** — Jupiter public RPC rate limit. *Action:* document; optional HELIUS / retry; UI already can show error.
8. **Image-proxy allowlist** — githubusercontent / token-media hosts not allowed (by design). *Action:* extend allowlist if marketplace images need proxy, or don’t route those hosts through it.

---

## Missing / stub list

| Item | Reality |
|------|---------|
| PayBox live ops | Needs user `pbx_` in Settings; GET is catalog only |
| x402 payments | Informational + voluntary records; not a full paywall |
| Telegram bot | `TELEGRAM_BOT_TOKEN` unset → 501 |
| ClawPump OAuth | Needs `CLAWPUMP_OAUTH_CLIENT_ID`; cpk_ REST is primary |
| Twitter verify (prod) | Local stub accepts URL shape; real Twitter API deferred |
| Bounty on-chain payout | Creator-gated; treasury/admin routes need `ADMIN_TOKEN`; pending_treasury model |
| Rewards treasury admin | 403 without admin — intentional |
| Quota numeric remaining | ClawPump has no exposed usage endpoint — honest `null` |
| Phoenix / perps as WA venue | Deferred; use ClawPump skills via cpk_ |
| Paid PONS completion | Not tested (by design); `payment_required` path confirmed |

**App routes under `src/app/(app)` (19 pages) — API vs UI**

All pages wire to real `/api/*` endpoints. “placeholder” hits in source are HTML input placeholders, not stub screens.

| Route | API wiring | Notes |
|-------|------------|-------|
| `/home` | real | settings + agents |
| `/agents` | real | list + quota |
| `/agents/[id]` | real | chat/messages/persona (chat upstream-limited) |
| `/analytics` | real | |
| `/bounties` | real | |
| `/community` | real | + upload |
| `/launch` | real | PONS OK dry; claw venue broken upstream |
| `/leaderboard` | real | |
| `/marketplace` | real | |
| `/paybox` | real (info / needs pbx_) | |
| `/portfolio` | real | |
| `/registry` | real | |
| `/rewards` | real | |
| `/settings` | real | keys, verify, upload |
| `/signals` | real | |
| `/skills` | real | |
| `/terminal` | real | swap quote |
| `/tools` | real | MoonPay token_* |
| `/wallet` | real | balance by address |

---

## What works for all registrants today

After registering via `/skill.md` and saving a `cpk_` in Settings (encrypted at rest):

1. Bearer auth + settings read (flags only, no raw key echo)
2. Create/list agents; ClawPump remote sync when connected
3. Public agent profiles + leaderboard `agentId` links
4. Start / stop agents on ClawPump
5. Persona options + message history
6. Launch desk: pump-pairs catalogue; PONS validation; honest **payment_required** (no fake success)
7. MoonPay tools: trending / search / retrieve (with `chain`)
8. Upload images; WIND- verify (local stub)
9. Community, registry, signals, marketplace, portfolio, analytics, bounties, rewards, skills
10. Wallet balance by address; Jupiter swap **quote** (execute gated)
11. PayBox/x402/Telegram honest stubs without inventing balances
12. `/skill.md` documents the flow without embedding live secrets

**Does not reliably work today without further setup / upstream:** live chat once free ClawPump quota is exhausted; claw gasless launch; PONS poll/history; PayBox signing (needs `pbx_`); completing paid PONS (needs real ETH payment — not audited).

---

## Secrets scan result

| Target | Bytes | Live `cpk_`/`pbx_`/Bearer secrets |
|--------|-------|-------------------------------------|
| Live `GET /skill.md` | 47131 | **none** (placeholders only: `cpk_your_key`, `YOUR_AUTH_TOKEN`, `cpk_...`) |
| `src/lib/skill-md.ts` | ~31KB | **none** |
| `src/lib/skill-md-append.ts` | ~18KB | **none** |
| `preview/windagents-skill-live.md` | ~30KB | **none** |
| `GET /api/settings` | — | **no key leakage** (`hasClawpump` only) |

**Secrets scan: PASS**

---

## Test credentials note

- Bearer used only in local HTTP calls; **not** written into this report or any skill/docs file.
- ClawPump key present as encrypted settings flag; **not** printed.


---

## UI walk (tunnel) — 2026-09-14

ComputerUse walk; Settings keys untouched; no paid launch.

### Pages OK
login, home, agents, local profile, leaderboard→public profile, launch picker, tools, settings (RO), terminal, signals, marketplace, registry, portfolio, wallet, rewards, skill.md

### UI bugs
1. Community + Bounties ignore agent Bearer session (“Login to post/create”)
2. Flash empty states: agents, launch, leaderboard, registry, signals (no loading skeleton)
3. Skills: create form only; no list / empty state
4. PayBox: disconnected stub; weak connect CTA
5. Portfolio/marketplace weak loading UX

Screenshots: `preview/audit/ui-community-auth.png`, `ui-skills-empty.png`, `ui-paybox-disconnected.png`, `ui-bounties-login.png`

### Combined score note
API weighted ~80%. UI auth bugs on Community/Bounties pull practical UX slightly — treat platform as **~78–80%** until those + upstream chat/launch paths are fixed.
