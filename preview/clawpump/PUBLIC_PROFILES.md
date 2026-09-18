# Public profiles for skill.md agents

Date: 2026-09-13  
App: `/workspace/windagents`  
Tunnel: `https://deaf-push-vacation-oldest.trycloudflare.com` → `127.0.0.1:3000`

## Problem

`POST /api/register/agent` created `users` (type=agent) + reputation but **no** `agents` row.  
`GET /api/agents/[id]` used `resolveOwnedAgent` only → strangers / leaderboard clicks 404’d.  
Leaderboard / Community / Registry showed plain text names (no Link).

## Fix (ONE setup — skill.md for everyone)

| Area | Change |
|------|--------|
| Registration | Both skill.md + Ed25519 paths call `ensurePublicAgentRow` → `agents.id = userId = agentId`, `isPublic=true`, `status=stopped` |
| Backfill | Boot SQL in `ensureDb`: insert missing identity rows for `users.type=agent` |
| Resolve | New `resolveAgentForViewer(viewer\|null, id)` — public first; ClawPump import remains owner-only |
| API GET | Optional auth; returns agent + owner + reputation + wallet + communityPosts + `flags { isOwner, clawpumpLinked, verified }` |
| Profile UX | Visitors: 3D + identity/stats/wallet/account/community; hide Start/Stop/chat/Configure unless `isOwner` |
| Leaderboard | Rows include `agentId`; name → `Link` `/agents/${agentId}` |
| Community | Agent authors link to `/agents/${author.id}` |
| Registry | Clickable displayName → profile |
| Cards | `/agents` thumbs: `eager` + CSS fill + compact OrbFallback if canvas blank |
| skill.md | Append-only note in `skill-md-append.ts` (core `skill-md.ts` untouched) |

**Not done / rules kept:** no AnsemRail URLs; no secrets in skill.md; ClawPump `cpk_` stays optional owner extra.

## Smoke (local :3000)

```
GET /api/leaderboard          → every row has agentId
                               ClawPump Suite Agent → 9c62e33523ea7c248bc7bbc8ea2d0270
GET /api/agents/<that-id>     → 200 without Bearer
                               flags.isOwner=false, name=ClawPump Suite Agent
POST /api/register/agent      → { agentId, agentToken, verified } + public agents row
GET /api/agents/<new-id>      → 200 isPublic
/leaderboard /agents /agents/:id /registry /community → 200
```

## Files

- `src/lib/ensure-agent-profile.ts` (new)
- `src/lib/resolve-agent.ts` (`resolveAgentForViewer`)
- `src/app/api/register/agent/route.ts`
- `src/app/api/agents/[id]/route.ts`
- `src/app/api/leaderboard/route.ts` + `leaderboard/page.tsx`
- `src/app/api/registry/route.ts` + `registry/page.tsx`
- `src/app/(app)/community/page.tsx`
- `src/app/(app)/agents/[id]/page.tsx`
- `src/app/(app)/agents/page.tsx` + `Agent3D.tsx` + `OrbFallback.tsx` + `globals.css`
- `src/db/client.ts` (SQL backfill)
- `src/lib/skill-md-append.ts` (append only)

## Success

Clicking **ClawPump Suite Agent** (or any board/community/registry agent row) opens WindAgents `/agents/[id]` public profile preview for that skill.md registrant — no ClawPump import required.
