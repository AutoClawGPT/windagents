"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { apiFetch, getToken } from "@/lib/client-auth";
import { DEFAULT_GLB } from "@/components/avatar/loadAgent3dScript";
import { randomCatalogBody } from "@/lib/avatar-catalog";

const Agent3D = dynamic(
  () => import("@/components/avatar/Agent3D").then((m) => m.Agent3D),
  {
    ssr: false,
    loading: () => <div className="h-40 animate-pulse rounded-xl bg-slate/50" />,
  }
);

type Agent = {
  id: string;
  name: string;
  status: string;
  persona?: string | null;
  skills?: string[];
  clawpumpAgentId?: string | null;
  avatarGlbUrl?: string | null;
  walletAddress?: string | null;
};

type RemoteAgent = {
  id: string;
  name: string;
  status?: string;
  persona?: string | null;
  skills?: string[];
  walletAddress?: string | null;
};

function normalizeRemote(raw: unknown): RemoteAgent[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as RemoteAgent[];
  if (typeof raw === "object" && raw !== null) {
    const o = raw as { agents?: RemoteAgent[] };
    if (Array.isArray(o.agents)) return o.agents;
  }
  return [];
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [remote, setRemote] = useState<RemoteAgent[]>([]);
  const [clawConnected, setClawConnected] = useState(false);
  const [clawMsg, setClawMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    if (!getToken()) {
      setError("Login required");
      setLoading(false);
      return;
    }
    const { res, data } = await apiFetch("/api/agents");
    if (!res.ok) {
      setError(data.error || "Failed");
      setLoading(false);
      return;
    }
    setAgents(data.agents || []);
    const connected = !!data.clawpump?.connected;
    setClawConnected(connected);
    if (!connected) {
      setClawMsg(data.clawpump?.message || "Connect cpk_ for live ClawPump sync");
      setRemote([]);
    } else {
      setClawMsg(data.clawpump?.error || null);
      setRemote(normalizeRemote(data.clawpump?.remote));
    }
    const q = await apiFetch("/api/agents/quota");
    if (q.res.ok) setQuota(q.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { res, data } = await apiFetch("/api/agents", {
      method: "POST",
      body: JSON.stringify({
        name,
        persona,
        avatarPrompt: avatarPrompt || undefined,
        // Random public three.ws body when no forge prompt
        avatarGlbUrl: avatarPrompt.trim() ? undefined : randomCatalogBody(),
        skills: ["trading", "market-intelligence"],
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Create failed");
      return;
    }
    setName("");
    setPersona("");
    setAvatarPrompt("");
    await load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Agents</h1>
      <p className="mt-2 text-sm text-mist">
        Local WindAgents rows always. With <code className="text-cyan">cpk_</code> in Settings, we also
        pull your full ClawPump agent list (Partner API <code className="text-cyan">GET /agents</code>).
        Manage create / skills / launch on the{" "}
        <Link href="/tokenize#wa-agents" className="text-cyan underline">
          Tokenize → Agents desk
        </Link>
        .
      </p>
      {quota && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 font-mono text-[10px] text-cyan">
          quota · connected={String(quota.connected)} · {String(quota.freeTierNote || quota.message || "")}
        </p>
      )}
      {clawMsg && (
        <p className="mt-4 rounded-xl border border-amber/30 bg-amber/10 px-4 py-2 text-xs text-amber">{clawMsg}</p>
      )}
      {error && <p className="mt-4 text-sm text-ember">{error}</p>}

      <form
        onSubmit={create}
        className="glass mt-8 grid gap-3 rounded-2xl p-5 md:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <input
          className="input-forge"
          placeholder="Agent name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input-forge"
          placeholder="Persona"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
        />
        <input
          className="input-forge"
          placeholder="Avatar prompt (optional)"
          value={avatarPrompt}
          onChange={(e) => setAvatarPrompt(e.target.value)}
        />
        <button disabled={busy} className="btn-cyan rounded-xl px-5 py-2 text-sm disabled:opacity-50">
          Create
        </button>
      </form>

      {clawConnected && (
        <section className="mt-10">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-xl font-bold">
              ClawPump agents <span className="text-cyan">({remote.length})</span>
            </h2>
            <Link href="/launch" className="text-xs text-cyan underline">
              Open Launch desk
            </Link>
          </div>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {remote.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/agents/${a.id}`}
                  className="glass group block rounded-2xl p-4 transition hover:border-cyan/40"
                  data-clawpump-agent={a.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-base font-bold group-hover:text-cyan">{a.name}</p>
                    <span className="font-mono text-[10px] uppercase text-mist">{a.status || "?"}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-mist">{a.persona || "No persona"}</p>
                  <p className="mt-2 break-all font-mono text-[10px] text-cyan/80">{a.id}</p>
                  <p className="mt-1 font-mono text-[10px] text-mist">
                    {a.walletAddress || "no wallet"} · {(a.skills || []).slice(0, 5).join(" · ")}
                  </p>
                  <p className="mt-3 text-[11px] text-cyan">Open profile preview</p>
                </Link>
              </li>
            ))}
            {!remote.length && (
              <p className="text-sm text-mist">cpk_ connected but no remote agents returned.</p>
            )}
          </ul>
        </section>
      )}

      <h2 className="mt-10 font-display text-xl font-bold">Local WindAgents</h2>
      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {agents.map((a) => (
          <li key={a.id}>
            <Link
              href={`/agents/${a.id}`}
              className="glass group block overflow-hidden rounded-2xl transition hover:border-cyan/40"
              data-agent-card={a.id}
            >
              <div className="agent-card-preview pointer-events-none relative h-44 w-full overflow-hidden">
                <Agent3D
                  body={a.avatarGlbUrl || DEFAULT_GLB}
                  name={a.name}
                  accent="#5eead4"
                  eager
                  kiosk
                  mode="section"
                  compact
                  className="absolute inset-0 h-full w-full"
                  style={{ height: "100%", width: "100%", minHeight: 176 }}
                />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-lg font-bold group-hover:text-cyan">{a.name}</p>
                  <span className="font-mono text-[10px] uppercase text-mist">{a.status}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-mist">{a.persona || "No persona"}</p>
                <p className="mt-3 font-mono text-[10px] text-cyan/80">
                  {(a.skills || []).join(" · ") || "no skills"}
                </p>
                {a.clawpumpAgentId && (
                  <p className="mt-1 font-mono text-[10px] text-mist">clawpump {a.clawpumpAgentId}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
        {loading && (
          <p className="text-sm text-mist">Loading agents…</p>
        )}
        {!loading && !agents.length && !error && (
          <p className="text-sm text-mist">No local agents yet — create one above.</p>
        )}
      </ul>
    </div>
  );
}
