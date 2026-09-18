# SKILLS_LAUNCH_PASS — what shipped

**Date:** 2026-09-15  
**Build:** `npm run build` PASS  
**Server:** `next start :3000` restarted (pid fresh); **cloudflared left running**  
**Rules honored:** Existing ClawPump MCP + Partner `cpk_` paths **kept** (ADD only). No secrets in skill.md. No paid launches. `skill-md.ts` untouched.

---

## Shipped

### 1. Real ClawPump skills catalogue
- Added `src/lib/clawpump-skills.ts` — Partner public seed (9 slugs) + live `fetchClawpumpSkillsCatalog` via existing `clawpumpFetch`
- `GET /api/skills` now returns:
  - `builtin`: 9 real ClawPump public skills + 3 WindAgents platform helpers
  - `skills`: local user DB rows (unchanged CRUD)
  - `clawpump`: `{ connected, live, skills, message, installHint }` when Bearer + `cpk_`
- `POST /api/skills` **ADD** `action:"enable"` → Partner `POST /agents/:id` with skills array (real API; honest upstream errors)
- UI `/skills`: ClawPump-connected badge, remote catalogue section, enable-on-agent picker

### 2. Launch / Tokenize
- `/launch` retitled **Launch / Tokenize**; required-field callouts (logoUrl, payout)
- `/tokenize` → 307 redirect to `/launch` (same Confirm + APIs)
- Orbital dock: primary **Tokenize** tab → `/launch`
- Existing `/api/launch`, `/api/launch/pons`, `/api/launch/claw`, `/api/launch/pump-pairs` unchanged

### 3. skill.md append only
- New `SKILL_MD_APPEND_SKILLS_LAUNCH` in `skill-md-append.ts`
- `skill.md/route.ts` concatenates it after prior appends
- **`skill-md.ts` not wiped**

### 4. Docs for CLAWCADE
- `preview/clawpump/SKILLS_LAUNCH_GAP.md` — ClawPump / three.ws / Sendai vs us
- `preview/clawpump/SETUP_REQUIRED.md` — every credential + what it unlocks
- This pass file

---

## Smoke results (Bearer + Settings `cpk_`)

| Check | Result |
|-------|--------|
| `keys.hasClawpump` | true |
| `GET /api/skills` clawpump.live | **true**, **9** slugs (trading…image-generation) |
| builtin count | 12 (9 Partner + 3 platform) |
| `GET /api/agents` remote | **11** agents, connected true (**kept**) |
| `GET /api/clawpump/mcp` | ClawPump info (**kept**) |
| `/skills` `/launch` | 200 |
| `/tokenize` | 307 → `/launch` |
| `/skill.md` | includes skills catalogue append |
| `GET /api/launch/pump-pairs` | 200, 154 assets (no paid launch) |

---

## Files touched / added

**Added**
- `src/lib/clawpump-skills.ts`
- `src/app/(app)/tokenize/page.tsx`
- `preview/clawpump/SKILLS_LAUNCH_GAP.md`
- `preview/clawpump/SETUP_REQUIRED.md`
- `preview/clawpump/SKILLS_LAUNCH_PASS.md`

**Updated**
- `src/app/api/skills/route.ts` (ADD clawpump block + enable)
- `src/app/(app)/skills/page.tsx`
- `src/app/(app)/launch/page.tsx` (naming / required fields)
- `src/components/hud/OrbitalDock.tsx`
- `src/lib/skill-md-append.ts` (append only)
- `src/app/skill.md/route.ts` (include new append)

**Not touched**
- `src/lib/skill-md.ts`
- `src/lib/clawpump.ts`, `src/app/api/clawpump/**`, agents chat/start/stop/launch proxies (behavior preserved)

---

## Remaining (honest — see GAP)

- three.ws pump-fun-skills packs / `@three-ws/solana-agent` / reactive avatar
- Sendai Agent Kit v2 MCP
- ClawPump docs community + SendAI registries beyond Partner’s 9 public slugs
- Full Forge text→3D

