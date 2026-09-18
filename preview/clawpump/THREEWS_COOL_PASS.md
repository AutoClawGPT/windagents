# THREEWS_COOL_PASS — WindAgents UI/3D closer to three.ws

**Date:** 2026-09-15  
**Build:** `npm run build` PASS  
**Server:** `next start :3000` restarted (cloudflared left running)  
**Tunnel:** https://bugs-sector-author-foods.trycloudflare.com → 127.0.0.1:3000  
**Smoke:** home 200 · `/agents` 200 · `/agents/[id]` 200 · tunnel home/profile 200  
**skill.md:** untouched (`skill-md.ts` / `skill-md-append.ts` not edited)  
**Branding:** Aeolian void / cyan `#5eead4` / amber `#fbbf24` (no three.ws purple)

---

## Public avatar catalog (`src/lib/avatar-catalog.ts`)

| id | name | bodyUrl |
|---|---|---|
| `default` | Default | `https://three.ws/avatars/default.glb` |
| `forge-agent` | Forge Agent | Resolved R2 GLB from API `566a4f1b-7dac-4c54-bc9d-7bd7b9a18a9a` (`srcUrl` = API URL as fallback) |
| `robot-expressive` | Robot Expressive | `https://three.ws/animations/robotexpressive.glb` |
| `soldier` | Soldier | `https://three.ws/animations/soldier.glb` |
| `cz` | CZ | `https://three.ws/avatars/cz.glb` |

Forge Agent API (`/api/avatars/566a4f1b-…`) returns JSON with `model_url` / `url` pointing at the R2 `.glb` — catalog uses that GLB as `body=` and keeps the API URL as optional `src=`.

---

## Animation clips wired

Buttons / `playClip` aliases (tried in order):

| id | aliases |
|---|---|
| idle | idle, Idle, Idle Breath, Male Idle |
| wave | wave, Wave (+ `wave()` helper) |
| dance | dance, Dance, Shuffle Dance, Rumba |
| capoeira | capoeira, Capoeira |
| jump | jump, Jump |
| thriller | thriller, Thriller |
| celebrate | celebrate, celebration, Celebrating, Celebrate, Cheering |

Mood ↑ / Mood ↓ still use `setMood` / `expressEmotion`.

---

## What changed

### A) Cooler backdrop
- `AppBackdrop.tsx` — CSS-only aurora + grid + soft cyan/amber orbs + particles (no heavy R3F)
- `globals.css` — `.wa-aurora`, `.wa-grid`, `.wa-orb*`, `.wa-particle`, `.wa-vignette`

### B) Floating mini agents
- `FloatingAgents.tsx` — 2–4 compact `agent-3d` widgets (`mode=widget`, `eager=false`, low opacity, `pointer-events-none`)
- Mounted on landing + `AppShell` background

### C) Avatar catalog + picker
- `avatar-catalog.ts` — labeled public bodies + `randomCatalogBody()`
- Profile **Vision desk → Avatars** + Configure grid — owner PATCH `/api/agents/[id]` `{ avatarGlbUrl }`
- Create agent (`/agents`) — random catalog body when no avatar prompt
- Owner first profile open — if `avatarGlbUrl` null, UI assigns random catalog body (no register/API breakage)

### D) Vision desk / animation panel
- `VisionDesk.tsx` — mini tabs **Stage | Clips | Avatars | Eye**
- Clips: Idle Wave Dance Capoeira Jump Thriller Celebrate
- Eye: `lookAt('camera')` + Thriller preview
- Stage quick actions also gained Dance / Celebrate

### E) Agent3D enhancements
- Optional `src` attribute (body first; src for API / alternate)
- `mode="widget"` for floaters / hero showcase
- Reliable `playClip` with alias fallbacks (`celebrate→celebration`, etc.)

### F) LandingHero polish
- Showcase `agent-3d` (Robot Expressive) + Wave / Dance demo buttons
- FloatingAgents behind hero
- Aeolian copy line: `AEOLIAN VOID · THREE.WS AVATARS · CLIP STAGE`

---

## Files touched / added

**Added**
- `src/lib/avatar-catalog.ts`
- `src/components/scene/FloatingAgents.tsx`
- `src/components/avatar/VisionDesk.tsx`
- `preview/clawpump/THREEWS_COOL_PASS.md`

**Updated**
- `src/components/scene/AppBackdrop.tsx`
- `src/components/scene/LandingHero.tsx`
- `src/components/hud/AppShell.tsx`
- `src/components/avatar/Agent3D.tsx`
- `src/components/avatar/agent-3d-types.ts` (`src?`)
- `src/app/(app)/agents/[id]/page.tsx`
- `src/app/(app)/agents/page.tsx`
- `src/app/globals.css`

**Not touched**
- `src/lib/skill-md.ts`, `src/lib/skill-md-append.ts`
- ClawPump / auth / register API routes (create already accepted `avatarGlbUrl`; UI now sends it)

---

## Hard rules check

- [x] No skill.md churn  
- [x] three.ws CDN only in UI/avatar (not ClawPump/API routes)  
- [x] APIs/auth/register/profiles intact  
- [x] Aeolian cyan/amber branding  
- [x] Tunnel left running; next :3000 only restarted  
