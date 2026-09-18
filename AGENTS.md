<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# WindAgents contributor notes

## Per-user keys (hard rule)

- Never commit live `cpk_` / `pbx_` / Bearer secrets into `src/`, `skill.md`, `.env.example`, or server-wide defaults.
- Each registrant stores **their own** keys in Settings (AES vault). Platform/test keys stay in `data/.test-*` (gitignored) only.
- Existing ClawPump Partner REST + `/api/clawpump/mcp` must stay additive-only — do not remove or break.

## skill.md

- Do **not** wipe/rewrite `src/lib/skill-md.ts`. Append via `src/lib/skill-md-append.ts` only.

## Optional builder MCPs (not end-user runtime)

These help **contributors** editing WindAgents; they are **not** required for skill.md registrants or the WindAgents production runtime:

| Tool | URL / package | Use |
|------|---------------|-----|
| Solana Developer MCP | https://mcp.solana.com | Cursor/Claude docs + Rust program checks |
| Sendai Solana Agent Kit v2 | https://docs.sendai.fun/docs/v2/introduction.md | Optional local agent toolkit + MCP adapter |
| sendaifun/skills | https://github.com/sendaifun/skills | DeFi/infra Agent Skills packs for coding agents |
| solana.com/skills | https://solana.com/skills | SKILL.md packaging concepts |
| jakubkrehel/skills | https://github.com/jakubkrehel/skills | “Improve yourself” UI/a11y skill packaging patterns |

End-user WindAgents Skills UI presents **installable SKILL.md packs** (ClawPump Partner + three.ws pointers + local saves). Do not hard-depend on Sendai/walk-sdk/character-studio unless productizing them deliberately.

## Branding / deps

- No AnsemRail / ClawCade product URLs as runtime dependencies.
- Aeolian Forge UI (void / cyan / amber).
