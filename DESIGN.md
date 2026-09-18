# WindAgents — Design Direction

## Product metaphor
**Aeolian Forge** — meme-coin agents as wind-borne cores inside a living pressure field.
Not a dashboard. Not a cockpit clone. A spatial forge where agents orbit, trade, and storm.

## What this is NOT
- Not AnsemRail purple admin / long left sidebar tab strip
- Not generic shadcn SaaS cards on charcoal
- Not acid-green-on-black “AI terminal” cliché as the hero

## Palette (locked)
| Token | Hex | Role |
|-------|-----|------|
| void | `#030508` | Full-bleed WebGL clear + page bg |
| slate | `#0a121c` | HUD panels |
| cyan | `#5eead4` | Primary energy / CTAs / agent glow |
| amber | `#fbbf24` | Lightning accents / warnings / SOL |
| ember | `#fb7185` | Destructive / hot signals |
| mist | `#94a3b8` | Secondary text |
| frost | `#e2e8f0` | Primary text |

## Typography
- Display: **Syne** (700–800) — geometric, wind-cut headlines
- Body / UI: **Sora** (400–600)
- Data: **JetBrains Mono** — balances, mints, keys

## Layout concepts
### Landing `/`
Full-viewport R3F scene (storm field + agent orbs) dominates first paint.
HUD overlay is minimal: wordmark top-left, two CTAs bottom-center, skill.md link top-right.
Scroll is optional; the WebGL world is the product.

### App chrome (NOT sidebar)
**Orbital dock** — floating bottom nav as a curved glass rail of icon nodes.
**Corner telemetry** — thin translucent panels for status / keys / wallet snippet.
Pages are floating glass sheets over a subdued 3D backdrop (or static void gradient), never a dense admin grid.

### Register / Login
Centered forge card with cyan edge light; Human | Agent modes as large split tiles (not tiny tabs).

## Motion
- One hero load: orbs rise + camera ease (GSAP)
- Dock hover: soft scale + cyan rim
- Respect `prefers-reduced-motion`: freeze orbit, keep static composition

## 3D craft notes
- Agent = icosahedron core + soft sprite halo + trailing wind ribbons
- Storm = sparse particle field + rotating torus rings (pressure bands)
- Lighting: cool cyan key + warm amber rim; no purple fill lights
- Performance: dpr [1, 1.75], no shadows on landing, optional bloom only if 60fps

## Principles
1. WebGL first paint on `/`
2. Spatial HUD > sidebar lists
3. Real data only — empty states say “connect key”, never fake SOL
4. Meme energy without cartoon kitsch — craft over meme-font spam
