"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getToken } from "@/lib/client-auth";

type SkillRow = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  tags?: string[] | string;
  source?: string;
  alwaysOn?: boolean;
  installUrl?: string;
  category?: string;
  enableable?: boolean;
};

type ClawpumpBlock = {
  connected?: boolean;
  live?: boolean;
  skills?: SkillRow[];
  error?: string | null;
  message?: string;
  installHint?: string;
};

type ThreeWsBlock = {
  skills?: SkillRow[];
  note?: string;
  npm?: string[];
  phase2Missing?: string[];
};

export default function SkillsPage() {
  const [builtin, setBuiltin] = useState<SkillRow[]>([]);
  const [userSkills, setUserSkills] = useState<SkillRow[]>([]);
  const [clawpump, setClawpump] = useState<ClawpumpBlock | null>(null);
  const [docsExtra, setDocsExtra] = useState<SkillRow[]>([]);
  const [threeWs, setThreeWs] = useState<ThreeWsBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enableAgentId, setEnableAgentId] = useState("");
  const [enableBusy, setEnableBusy] = useState(false);
  const [enableMsg, setEnableMsg] = useState<string | null>(null);
  const [remoteAgents, setRemoteAgents] = useState<{ id: string; name: string; skills?: string[] }[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { res, data } = await apiFetch("/api/skills");
      if (!res.ok) {
        setError(data.error || "Failed to load skills");
        setBuiltin([]);
        setUserSkills([]);
        setClawpump(null);
        setDocsExtra([]);
        setThreeWs(null);
        return;
      }
      setBuiltin(Array.isArray(data.builtin) ? (data.builtin as SkillRow[]) : []);
      setUserSkills(Array.isArray(data.skills) ? (data.skills as SkillRow[]) : []);
      setClawpump((data.clawpump as ClawpumpBlock) || null);
      setDocsExtra(
        Array.isArray(data.clawpumpDocsExtra) ? (data.clawpumpDocsExtra as SkillRow[]) : []
      );
      setThreeWs((data.threeWs as ThreeWsBlock) || null);

      if (getToken()) {
        const ag = await apiFetch("/api/agents");
        if (ag.res.ok) {
          const remote = ag.data?.clawpump?.remote;
          const list = Array.isArray(remote)
            ? remote
            : Array.isArray(remote?.agents)
              ? remote.agents
              : [];
          setRemoteAgents(
            list.map((a: { id: string; name: string; skills?: string[] }) => ({
              id: a.id,
              name: a.name,
              skills: a.skills,
            }))
          );
          if (!enableAgentId && list[0]?.id) setEnableAgentId(list[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { res, data } = await apiFetch("/api/skills", {
      method: "POST",
      body: JSON.stringify({ name, slug, description: desc, tags: ["windagents"] }),
    });
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    setName("");
    setSlug("");
    setDesc("");
    await load();
  }

  async function enableOnAgent(skillSlug: string) {
    if (!enableAgentId) {
      setEnableMsg("Pick a ClawPump agent first (needs cpk_ + remote agents)");
      return;
    }
    setEnableBusy(true);
    setEnableMsg(null);
    const current =
      remoteAgents.find((a) => a.id === enableAgentId)?.skills || [];
    const next = Array.from(new Set([...current, skillSlug]));
    const { res, data } = await apiFetch("/api/skills", {
      method: "POST",
      body: JSON.stringify({
        action: "enable",
        agentId: enableAgentId,
        skills: next,
      }),
    });
    setEnableBusy(false);
    if (!res.ok) {
      setEnableMsg(
        data.message ||
          data.error ||
          `Enable failed HTTP ${res.status} — use ClawPump dashboard if Partner rejects update`
      );
      return;
    }
    setEnableMsg(`Enabled ${skillSlug} on agent ${enableAgentId.slice(0, 8)}… (${next.join(", ")})`);
    await load();
  }

  const remoteList =
    clawpump?.connected && Array.isArray(clawpump.skills) && clawpump.skills.length
      ? clawpump.skills
      : !clawpump?.connected && Array.isArray(clawpump?.skills)
        ? clawpump.skills
        : [];

  // When not connected, still show seed catalogue prominently
  const seedWhenDisconnected =
    !clawpump?.connected
      ? CLAWPUMP_SEED_FALLBACK
      : [];

  function SkillCard({
    s,
    i,
    showEnable,
    need,
  }: {
    s: SkillRow;
    i: number;
    showEnable?: boolean;
    need?: "cpk" | "threews" | "local" | "docs";
  }) {
    const tags = Array.isArray(s.tags) ? s.tags : [];
    const inferredNeed =
      need ||
      (String(s.source || "").includes("three") || s.installUrl
        ? "threews"
        : String(s.source || "").includes("docs")
          ? "docs"
          : String(s.source || "").includes("clawpump") || s.enableable
            ? "cpk"
            : "local");
    return (
      <li key={String(s.id || s.slug || i)} className="glass rounded-xl px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display font-bold">{String(s.name)}</p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {inferredNeed === "cpk" && (
              <span className="rounded border border-amber/40 bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-amber">
                needs your cpk_
              </span>
            )}
            {inferredNeed === "threews" && (
              <span className="rounded border border-cyan/40 bg-cyan/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-cyan">
                installable SKILL.md
              </span>
            )}
            {inferredNeed === "docs" && (
              <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase text-mist">
                docs pointer
              </span>
            )}
            {inferredNeed === "local" && (
              <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase text-mist">
                windagents local
              </span>
            )}
            {s.category && (
              <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase text-mist">
                {s.category}
              </span>
            )}
            {s.alwaysOn && (
              <span className="rounded bg-amber/20 px-1.5 py-0.5 font-mono text-[9px] uppercase text-amber">
                always-on
              </span>
            )}
            {s.source && (
              <span className="font-mono text-[9px] uppercase text-mist">{String(s.source)}</span>
            )}
          </div>
        </div>
        <p className="font-mono text-[10px] text-cyan">{String(s.slug)}</p>
        <p className="mt-1 text-xs text-mist">{String(s.description || "")}</p>
        {tags.length > 0 && (
          <p className="mt-1 font-mono text-[9px] text-mist/80">{tags.join(" · ")}</p>
        )}
        {s.installUrl && (
          <a
            href={s.installUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block font-mono text-[10px] text-cyan underline"
          >
            Open SKILL.md / docs →
          </a>
        )}
        {showEnable && s.slug && clawpump?.connected && s.enableable !== false && !s.installUrl && (
          <button
            type="button"
            disabled={enableBusy || !enableAgentId}
            onClick={() => enableOnAgent(String(s.slug))}
            className="btn-ghost mt-2 rounded-lg px-3 py-1 text-[10px] disabled:opacity-40"
          >
            Enable on ClawPump agent
          </button>
        )}
      </li>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Skills</h1>
          <p className="mt-2 max-w-2xl text-sm text-mist">
            ClawPump Partner catalogue (live <code className="text-cyan">GET /skills</code> when your{" "}
            <code className="text-cyan">cpk_</code> is in Settings), docs extras, three.ws install
            packs, and WindAgents helpers. No platform keys — every registrant uses their own vault.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {clawpump?.connected ? (
            <span className="rounded-full border border-cyan/40 bg-cyan/10 px-3 py-1 font-mono text-[10px] text-cyan">
              ClawPump connected{clawpump.live ? " · live catalog" : " · seed fallback"}
            </span>
          ) : (
            <Link
              href="/settings"
              className="rounded-full border border-amber/40 bg-amber/10 px-3 py-1 font-mono text-[10px] text-amber"
            >
              Connect cpk_ in Settings
            </Link>
          )}
          <button
            type="button"
            onClick={load}
            className="btn-ghost rounded-xl px-3 py-1 text-[10px]"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-ember">{error}</p>}
      {clawpump?.message && (
        <p className="mt-3 text-xs text-mist">{clawpump.message}</p>
      )}
      {clawpump?.error && (
        <p className="mt-2 text-xs text-amber">Catalog note: {clawpump.error}</p>
      )}

      {!clawpump?.connected && (
        <div className="mt-4 rounded-2xl border border-amber/40 bg-amber/10 px-4 py-4">
          <p className="font-display text-lg font-bold text-amber">
            Save cpk_ in Settings to unlock live ClawPump catalogue
          </p>
          <p className="mt-1 text-xs text-mist">
            Without your own key you still see Partner seed slugs and installable three.ws packs.
            Live catalogue + Enable on remote agents requires connecting{" "}
            <code className="text-cyan">cpk_</code> in Settings (per-user vault — never a platform key).
          </p>
          <Link
            href="/settings"
            className="btn-cyan mt-3 inline-block rounded-xl px-4 py-2 text-xs"
          >
            Open Settings → ClawPump
          </Link>
        </div>
      )}

      {clawpump?.connected && (
        <div className="glass mt-4 flex flex-wrap items-end gap-3 rounded-2xl p-4">
          <label className="block min-w-[220px] flex-1 text-xs text-mist">
            ClawPump agent (for Enable)
            <select
              className="input-forge mt-1 font-mono text-xs"
              value={enableAgentId}
              onChange={(e) => setEnableAgentId(e.target.value)}
            >
              <option value="">
                {remoteAgents.length ? "Select agent…" : "No remote agents — refresh / check cpk_"}
              </option>
              {remoteAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {(a.skills || []).slice(0, 4).join(",") || "no skills"} · {a.id.slice(0, 8)}…
                </option>
              ))}
            </select>
          </label>
          <p className="text-[10px] text-mist max-w-md">
            Enable calls Partner <code className="text-cyan">POST /agents/:id</code> with a skills
            array — real API only. If rejected, enable in the ClawPump dashboard.
          </p>
          {enableMsg && <p className="w-full text-xs text-cyan">{enableMsg}</p>}
        </div>
      )}

      {(remoteList.length > 0 || seedWhenDisconnected.length > 0) && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold text-cyan">
            {clawpump?.connected ? "ClawPump Partner catalogue" : "ClawPump Partner seed (offline)"}
          </h2>
          <p className="mt-1 text-xs text-mist">
            {clawpump?.connected
              ? `From Partner API when cpk_ is set (${remoteList.length} skills). Enable uses Partner public slugs only.`
              : "Full known Partner public slugs without a key. Save cpk_ in Settings for live catalogue + Enable."}
          </p>
          <ul className="mt-4 space-y-3">
            {(remoteList.length ? remoteList : seedWhenDisconnected).map((s, i) => (
              <SkillCard key={`cp-${s.slug}-${i}`} s={s} i={i} showEnable={!!clawpump?.connected} need="cpk" />
            ))}
          </ul>
        </section>
      )}

      {docsExtra.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold">ClawPump docs extras</h2>
          <p className="mt-1 text-xs text-mist">
            Marketing / ambient skills from clawpump.tech/docs (~15 built-in). Not all map 1:1 to
            Partner <code className="text-cyan">GET /skills</code> — open docs; enable in dashboard
            when available.
          </p>
          <ul className="mt-4 space-y-3">
            {docsExtra.map((s, i) => (
              <SkillCard key={`docs-${s.slug}-${i}`} s={s} i={i} need="docs" />
            ))}
          </ul>
        </section>
      )}

      {threeWs?.skills && threeWs.skills.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold">three.ws pump-fun skill packs</h2>
          <p className="mt-1 text-xs text-mist">{threeWs.note}</p>
          <ul className="mt-4 space-y-3">
            {threeWs.skills.map((s, i) => (
              <SkillCard key={`3ws-${s.slug}-${i}`} s={s} i={i} need="threews" />
            ))}
          </ul>
          {threeWs.npm && threeWs.npm.length > 0 && (
            <p className="mt-3 font-mono text-[10px] text-mist">
              Related npm: {threeWs.npm.join(" · ")}
            </p>
          )}
          {threeWs.phase2Missing && threeWs.phase2Missing.length > 0 && (
            <div className="glass mt-3 rounded-xl px-4 py-3">
              <p className="font-mono text-[10px] uppercase text-amber">Phase-2 Missing (honest)</p>
              <ul className="mt-1 list-inside list-disc text-xs text-mist">
                {threeWs.phase2Missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <form onSubmit={save} className="glass mt-8 grid gap-3 rounded-2xl p-5 md:grid-cols-3">
        <input
          className="input-forge"
          placeholder="Name (local WindAgents skill)"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input-forge font-mono text-xs"
          placeholder="slug"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <input
          className="input-forge"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <button className="btn-cyan rounded-xl py-2 text-sm md:col-span-3">Save local skill</button>
      </form>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold">Seed / platform builtins</h2>
        <p className="mt-1 text-xs text-mist">
          Partner public slugs (seed) + WindAgents register / Jupiter / PayBox helpers.
        </p>
        <ul className="mt-4 space-y-3">
          {loading && (
            <li className="glass rounded-xl px-4 py-6 text-center text-sm text-mist">
              Loading skills…
            </li>
          )}
          {!loading &&
            builtin.map((s, i) => <SkillCard key={`b-${s.slug}-${i}`} s={s} i={i} need={String(s.source||"").includes("clawpump") ? "cpk" : "local"} />)}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold">Your saved skills</h2>
        <ul className="mt-4 space-y-3">
          {!loading &&
            userSkills.map((s, i) => <SkillCard key={`u-${s.id}-${i}`} s={s} i={i} need="local" />)}
          {!loading && userSkills.length === 0 && (
            <li className="glass rounded-xl px-4 py-6 text-center text-sm text-mist">
              No local skills yet — save one above. Tip: installable packs follow Agent Skills /
              SKILL.md (jakubskills / solana.com/skills style) — name, description, tags, install
              URL.
            </li>
          )}
        </ul>
      </section>

      <p className="mt-8 text-[11px] text-mist">
        Also:{" "}
        <Link href="/launch" className="text-cyan underline">
          Launch / Tokenize
        </Link>{" "}
        ·{" "}
        <Link href="/tokenize" className="text-cyan underline">
          /tokenize
        </Link>{" "}
        ·{" "}
        <Link href="/settings" className="text-cyan underline">
          Settings
        </Link>{" "}
        ·{" "}
        <a
          href="https://clawpump.tech/docs"
          target="_blank"
          rel="noreferrer"
          className="text-cyan underline"
        >
          ClawPump docs
        </a>{" "}
        ·{" "}
        <a
          href="https://github.com/nirholas/three.ws/tree/main/pump-fun-skills"
          target="_blank"
          rel="noreferrer"
          className="text-cyan underline"
        >
          three.ws pump-fun-skills
        </a>
      </p>
    </div>
  );
}

/** Inline seed so disconnected users still see Partner catalogue without waiting on API shape. */
const CLAWPUMP_SEED_FALLBACK: SkillRow[] = [
  { slug: "trading", name: "Trading", description: "Swap tokens, arbitrage, liquidity", tags: ["defi"], category: "DeFi", enableable: true, source: "clawpump-seed" },
  { slug: "perps", name: "Perps Trading", description: "Phoenix perpetual futures", tags: ["perps"], category: "DeFi", enableable: true, source: "clawpump-seed" },
  { slug: "token-launch", name: "Token Launch", description: "Launch via pump.fun / ClawPump", tags: ["launch"], category: "DeFi", enableable: true, source: "clawpump-seed" },
  { slug: "portfolio", name: "Portfolio Management", description: "Balances, P&L, rebalancing", tags: ["portfolio"], category: "DeFi", enableable: true, source: "clawpump-seed" },
  { slug: "market-intelligence", name: "Market Intelligence", description: "Price feeds and signals", tags: ["intel"], category: "Intelligence", enableable: true, source: "clawpump-seed" },
  { slug: "social", name: "Social Media", description: "Twitter/X posting", tags: ["social"], category: "Social", enableable: true, source: "clawpump-seed" },
  { slug: "sniper", name: "Token Sniper", description: "New launch detection", tags: ["sniper"], category: "Intelligence", enableable: true, source: "clawpump-seed" },
  { slug: "wallet", name: "Wallet Operations", description: "Transfers and balances", tags: ["wallet"], category: "Infrastructure", enableable: true, source: "clawpump-seed" },
  { slug: "image-generation", name: "Image Generation", description: "Prompt → image links", tags: ["image"], category: "Infrastructure", enableable: true, source: "clawpump-seed" },
];
