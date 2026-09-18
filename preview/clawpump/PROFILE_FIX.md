# Profile preview fix — Aeolian Forge 3D showcase

Date: 2026-09-13  
App: `/workspace/windagents`  
Tunnel: `https://deaf-push-vacation-oldest.trycloudflare.com` → `127.0.0.1:3000`  
Reference screenshot: `preview/clawpump/wa-profile-from-remote.png`

## Before (what looked fucked up)

From remote verify + source:

1. **Admin-console dump** — Persona forge, Avatar GLB forms, skills, lifecycle, quick actions, and chat all stacked in a tall right column. First paint felt like settings, not a three.ws agent stage.
2. **Cramped hero card** — 3D stage lived inside a `glass-strong` card fighting AppShell padding; avatar read small in empty space.
3. **Dock overlap** — Orbital dock covered bottom of stage + persona panels; page scrolled under fixed dock despite `pb-28`.
4. **Rail height collapse** — Right aside `max-h` + overflow made panels feel cut off; stage `min-h-[70vh]` not truly viewport-filling.
5. **List cards** — Local agent cards used a bare `h-44` preview without forced `agent-3d` fill; risk of empty/tiny canvas thumbs.

Default GLB (`https://three.ws/avatars/default.glb`) did load — body was fine; layout/UX was the failure.

## After (showcase-first)

### Profile `/agents/[id]`

- **Full-bleed immersive stage** — Stage breaks AppShell gutters (`-mx-4 -mt-8`), `min-h: calc(100vh - 7.5rem)`, void radial glow, large Syne name overlay, status chip, gradient footer with Wave/Idle/Mood (cleared above orbital dock).
- **Slim identity rail** (~300–340px) — Identity badges (incl. ClawPump linked), lifecycle Start/Stop, compact chat only on first paint.
- **Configure accordion** — Persona forge + Avatar GLB admin collapsed behind amber **Configure** (`+`/`−`); not dominating preview.
- **No AnsemRail purple** — void / cyan / amber only.

### Agents list cards

- Preview wrapper class `agent-card-preview` with fixed `11rem` height + radial void fill.
- `Agent3D` absolutely fills the thumb (`absolute inset-0`, `minHeight: 176`).

### Agent3D + CSS

- Custom element + host forced `position: absolute; inset: 0; height/width 100%`.
- `globals.css`: `.agent-avatar-stage`, `.agent-avatar-canvas`, `agent-3d` / `canvas` fill rules; `.agent-card-preview` thumb rules.

## Files changed

| File | Change |
|------|--------|
| `src/app/(app)/agents/[id]/page.tsx` | UX rewrite: hero stage + slim rail + Configure accordion |
| `src/app/(app)/agents/page.tsx` | Card preview sizing / absolute Agent3D fill |
| `src/components/avatar/Agent3D.tsx` | Absolute fill for custom element + host |
| `src/app/globals.css` | Stage + card preview CSS |
| `preview/clawpump/PROFILE_FIX.md` | This report |

**Not touched:** `skill.md`, AnsemRail URLs, secrets.

## Build / restart

- `npm run build` — **PASS** (Next.js 16.2.12 Turbopack)
- Restarted `npx next start -p 3000` only (cloudflared left running)
- Smoke: `/home` 200, `/agents` 200, `/agents/<id>` 200

## Success criteria

Profile first paint = **3D agent showcase** (hero stage + slim dock), not a broken form dump. Configure holds admin forge tools. Orbital dock no longer buries stage chrome.
