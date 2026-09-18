# WindAgents FIX_PASS (FULL_AUDIT bugs)

**Date:** 2026-09-15  
**Target:** `http://127.0.0.1:3000` (cloudflared left alone)  
**Build:** `npm run build` **PASS**  
**Server:** `next start -p 3000` restarted after build  
**Constraints:** no deletes; no `skill-md.ts` rewrite (append-only via `skill-md-append.ts`); no secrets in docs; no paid launches; chat free-quota left as-is (intentional / OK)

---

## Changes

### 1. Community + Bounties auth UI (HIGHEST)
- Added `useAuthReady()` in `src/lib/client-auth.ts` — hydration-safe flag (`null` → `true`/`false` after mount from `windagents_auth_token`).
- Community / Bounties / Rewards “Login to …” gates only render when `authed === false` (not on SSR first paint).
- Agent Bearer in localStorage unlocks compose/create the same way as other pages.
- Forms/buttons disabled only when confirmed logged-out.

### 2. Flash empty states
- Loading boolean + “Loading…” copy until first fetch settles on: Agents, Leaderboard, Registry, Signals, Launch (`loadingAgents` starts `true`), Community, Bounties, Skills, PayBox.
- Empty copy only after load completes.

### 3. Skills page
- Lists **builtin + user** skills from `GET /api/skills` (`builtin` + `skills`).
- Honest empty state if both empty; create form kept.

### 4. PayBox page
- When `connected:false`, prominent CTA to add `pbx_` with link to `/settings`.
- Action buttons disabled until connected.

### 5. `token_retrieve` truncation
- Local `chain` required (400).
- Maps `address` → MoonPay `token` without slicing.
- Response remapper restores full requested mint when upstream returns truncated or same-length corrupted SOL mint (`…1111` → `…11112`).
- Always echoes requested mint as `address`.

### 6. Claw launch + PONS poll/history
- **Claw POST** now proxies Partner API **`POST /launch`** (legacy `/launch/claw` + `/launch/pump` are upstream 404).
- **Claw GET** returns agent record / honest `unavailable` — no fake mints.
- **PONS GET** skips Partner `GET /launch/pons` (known **405**). Tries platform `GET /api/agents/{id}/pons/launches[/{launchId}]` + v1; falls back to agent `tokenAddress` or `{ error:"unavailable" }` — not raw 404/405 alone.
- Alias `GET /api/agents/:id/pons/launches` updated the same way.
- Docs note appended via `SKILL_MD_APPEND_FIX_PASS` (chain + launch paths).

### 7. Tools chain validation (bonus)
- `token_search` / `token_retrieve` → local **400** `chain_required` when `chain` missing (no opaque 502).

---

## Smoke results (Bearer from `data/.test-agent-token` — not printed)

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| Next on :3000 | Ready (cloudflared untouched) |
| Community SSR | Shows **Loading feed…**; **no** “Login to post” on first paint |
| Bounties SSR | Shows **Loading bounties…**; **no** “Login to create” on first paint |
| Agents/Leaderboard/Registry/Signals/Launch SSR | **Loading…** not Empty flash |
| Skills API | `builtin:4` listed; UI merges builtin+user |
| PayBox | `connected:false`; Settings CTA + disabled actions |
| `token_retrieve` SOL mint | **PASS** — full `So1111…11112` (len 43) |
| `token_search` / `token_retrieve` without `chain` | **400** `chain_required` |
| `GET /api/launch/claw?agentId=` | **200** agent poll helper (no dedicated list) |
| `GET /api/launch/pons?agentId=` | **200** `{ success:true, launches:[] }` (not 405) |
| `POST /api/launch/claw` (dry) | **402** `LAUNCH_PAYMENT_REQUIRED` via upstream **`/launch`** — honest; **not claimed as paid success** |
| Chat quota | **Skipped** (intentional / OK) |

---

## Launch / PONS status (for agents)

| Route | Status |
|-------|--------|
| `POST /api/launch` | Partner `POST /launch` (paid / selfFunded) |
| `POST /api/launch/claw` | Now same Partner `POST /launch` (not `/launch/claw`) |
| `GET /api/launch/claw` | Agent record / unavailable degrade |
| `POST /api/launch/pons` | Unchanged; may return `payment_required` |
| `GET /api/launch/pons` | Poll via platform+v1 launches paths; skip 405 `/launch/pons` GET |
| `GET /api/agents/:id/pons/launches` | Same poll logic; optional `?launchId=` |

**Do not claim paid / gasless launch success without payment.** Dry smoke confirmed payment-required only.

---

## Intentionally not changed
- ClawPump chat free quota (10/day / upstream `free_quota_exceeded`) — user confirmed normal/OK.
- No paid PONS/claw completion tested.
