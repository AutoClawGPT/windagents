# THREEWS_ONLY_PASS — visual / three.ws layer only

**Date:** 2026-09-15  
**Build:** `npm run build` PASS  
**Server:** `next start :3000` restarted only (cloudflared left running)  
**Smoke:** home `200` · `GET /api/clawpump/mcp` `200` (unchanged)  
**skill.md / Settings cpk_/pbx_:** untouched  

---

## Hard lock — ClawPump / PayBox files UNTOUCHED

Pre/post `md5sum` identical for:

- `src/lib/clawpump.ts`, `src/lib/clawpump-*.ts`
- `src/app/api/clawpump/**`, `src/app/api/paybox/**`, `src/app/api/launch/**`
- `src/app/api/agents/**` (API routes — not edited)
- `src/app/api/settings/route.ts`
- `src/lib/skill-md.ts`, `src/lib/skill-md-append.ts`

Result: **`LOCKED_FILES_UNCHANGED`**

ClawPump Settings connection model (cpk_/pbx_) unchanged.

---

## What improved (three.ws UX only)

### 1. AppBackdrop / aurora CSS
- Extra shear layer + horizon glow + 4th soft orb
- Smoother multi-stop aurora / particle / floater motion
- `prefers-reduced-motion` + mobile particle/orb culls for FPS

### 2. FloatingAgents
- Distinct public bodies: **Fox · Michelle · Robot Expressive · X Bot**
- Smoother cubic drift + cyan drop-shadow
- Default count 4 (AppShell still uses 2)

### 3. Clip button reliability (VisionDesk / Agent3D)
- Expanded aliases from three.ws playground (`av-*`, rumba, cheer, samba, …)
- `tryPlayClip`: `play()` → `playAnimationByHint` → `playClip` decoration slots
- VisionDesk: playing lock, status line, mood-pulse soft fallback

### 4. Avatar catalog (curl-checked 200 `model/gltf-binary`)
| id | bodyUrl |
|---|---|
| default | `https://three.ws/avatars/default.glb` |
| forge-agent | R2 forge GLB (+ API src) |
| robot-expressive | `…/animations/robotexpressive.glb` |
| soldier | `…/animations/soldier.glb` |
| cz | `…/avatars/cz.glb` |
| **fox** | `…/avatars/fox.glb` (~163KB) |
| **xbot** | `…/avatars/xbot.glb` |
| **michelle** | `…/avatars/michelle.glb` |

Skipped `brainstem.glb` (~3.2MB — too heavy for picker/floaters).

### 5. LandingHero polish
- Showcase frame + Wave / Dance / Jump / Celebrate demos
- 4 floaters behind hero; name-plate on showcase widget

### 6. Profile Agent3D (kiosk)
- `name-plate=on` + `avatar-chat=on` with WindAgents cyan accent
- Stage quick Dance/Celebrate pass `userInitiated: true`

---

## Files touched

**Updated**
- `src/lib/avatar-catalog.ts`
- `src/components/scene/AppBackdrop.tsx`
- `src/components/scene/FloatingAgents.tsx`
- `src/components/scene/LandingHero.tsx`
- `src/components/avatar/Agent3D.tsx`
- `src/components/avatar/agent-3d-types.ts`
- `src/components/avatar/VisionDesk.tsx`
- `src/app/globals.css`
- `src/app/(app)/agents/[id]/page.tsx` (avatar UI attrs only)

**Added**
- `preview/clawpump/THREEWS_ONLY_PASS.md`

**Not touched**
- All ClawPump / PayBox / launch / settings / skill-md integration files (see lock list)

---

## Verify checklist

- [x] build PASS  
- [x] restart next `:3000` only  
- [x] `GET /api/clawpump/mcp` → 200 unchanged  
- [x] ClawPump file hashes unchanged  
- [x] Cooler three.ws UX; Settings cpk_/pbx_ model unchanged  
