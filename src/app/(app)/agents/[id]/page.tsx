"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, getToken } from "@/lib/client-auth";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Agent3DHandle } from "@/components/avatar/agent-3d-types";
import { DEFAULT_GLB } from "@/components/avatar/loadAgent3dScript";
import { VisionDesk } from "@/components/avatar/VisionDesk";
import { AVATAR_CATALOG, type AvatarCatalogEntry } from "@/lib/avatar-catalog";

const Agent3D = dynamic(
  () => import("@/components/avatar/Agent3D").then((m) => m.Agent3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[calc(100vh-8rem)] items-center justify-center rounded-3xl bg-void/60">
        <div className="h-12 w-12 animate-pulse rounded-full border-2 border-cyan/40 border-t-cyan" />
      </div>
    ),
  }
);

type Agent = {
  id: string;
  name: string;
  persona?: string | null;
  status?: string;
  walletAddress?: string | null;
  skills?: string[];
  clawpumpAgentId?: string | null;
  avatarGlbUrl?: string | null;
  avatarPrompt?: string | null;
  model?: string | null;
  createdAt?: string;
};

type ProfileExtras = {
  owner?: { id: string; displayName: string; type?: string; createdAt?: string } | null;
  reputation?: { trustTier: string; reputationScore: number };
  wallet?: { payoutWallet?: string | null; walletAddress?: string | null };
  communityPosts?: {
    id: string;
    content: string;
    likeCount: number;
    commentCount: number;
    createdAt: string;
  }[];
  stats?: { posts: number; followers: number; following: number };
  flags?: { isOwner: boolean; clawpumpLinked: boolean; verified: boolean };
};

export default function AgentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [canonicalId, setCanonicalId] = useState<string | null>(null);
  const avatarRef = useRef<Agent3DHandle>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [extras, setExtras] = useState<ProfileExtras>({});
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [glbDraft, setGlbDraft] = useState("");
  const [promptDraft, setPromptDraft] = useState("");
  const [forgeMsg, setForgeMsg] = useState<string | null>(null);
  const [avatarReady, setAvatarReady] = useState(false);
  const [personaMsg, setPersonaMsg] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const isOwner = !!extras.flags?.isOwner;

  const load = useCallback(async () => {
    // Public showcase works without auth; token used only when present (owner extras)
    const a = await apiFetch(`/api/agents/${id}`);
    if (!a.res.ok) {
      setError(a.data.message || a.data.error || "Not found");
      setLoaded(true);
      return;
    }
    const row = (a.data.agent || a.data) as Agent;
    const canon = String(a.data.canonicalId || row.id || id);
    setCanonicalId(canon);
    setAgent(row);
    setGlbDraft(row.avatarGlbUrl || "");
    setPromptDraft(row.avatarPrompt || "");
    setExtras({
      owner: a.data.owner,
      reputation: a.data.reputation,
      wallet: a.data.wallet,
      communityPosts: a.data.communityPosts || [],
      stats: a.data.stats,
      flags: a.data.flags || { isOwner: false, clawpumpLinked: false, verified: false },
    });
    setError(null);
    setLoaded(true);
    if (canon !== id) {
      router.replace(`/agents/${canon}`);
      return;
    }
    if (a.data.flags?.isOwner && getToken()) {
      const m = await apiFetch(`/api/agents/${canon}/messages`);
      if (m.res.ok) setMessages(m.data.messages || []);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  async function chat(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) return;
    setBusy(true);
    setError(null);
    const { res, data } = await apiFetch("/api/agents/chat", {
      method: "POST",
      body: JSON.stringify({ agentId: agent?.id || canonicalId || id, message: msg }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data.message || data.error || "Chat failed — needs cpk_");
      await load();
      return;
    }
    setMsg("");
    try {
      await avatarRef.current?.say?.(String(data.reply || data.message || "Acknowledged.").slice(0, 200));
    } catch {
      /* optional */
    }
    await load();
  }

  async function lifecycle(action: "start" | "stop") {
    if (!isOwner) return;
    setBusy(true);
    const { res, data } = await apiFetch(`/api/agents/${agent?.id || canonicalId || id}/${action}`, {
      method: "POST",
    });
    setBusy(false);
    if (!res.ok) setError(data.message || data.error || `${action} failed`);
    await load();
  }

  async function saveGlb(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) return;
    setBusy(true);
    setError(null);
    const aid = agent?.id || canonicalId || id;
    const { res, data } = await apiFetch(`/api/agents/${aid}`, {
      method: "PATCH",
      body: JSON.stringify({
        avatarGlbUrl: glbDraft.trim() || null,
        avatarPrompt: promptDraft.trim() || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    await load();
  }

  async function forgeAvatar() {
    if (!isOwner) return;
    setBusy(true);
    setForgeMsg("Forging via three.ws… this can take up to ~2 min");
    setError(null);
    const { res, data } = await apiFetch(`/api/agents/${agent?.id || canonicalId || id}/avatar`, {
      method: "POST",
      body: JSON.stringify({ prompt: promptDraft || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      setForgeMsg(null);
      setError(data.message || data.error || "Forge failed — keeping default.glb");
      await load();
      return;
    }
    setForgeMsg(`Forged: ${data.avatarGlbUrl}`);
    await load();
  }

  async function pullPersona(
    mode: "clawpump-generate" | "clawpump-sync" | "archetype",
    archetype?: string
  ) {
    if (!isOwner) return;
    setBusy(true);
    setError(null);
    setPersonaMsg(
      mode === "clawpump-generate"
        ? "Forging persona via ClawPump…"
        : mode === "clawpump-sync"
          ? "Syncing persona from ClawPump…"
          : "Applying archetype…"
    );
    const { res, data } = await apiFetch(`/api/agents/${agent?.id || canonicalId || id}/persona`, {
      method: "POST",
      body: JSON.stringify({ mode, archetype }),
    });
    setBusy(false);
    if (!res.ok) {
      setPersonaMsg(null);
      setError(data.message || data.error || "Persona pull failed");
      return;
    }
    setPersonaMsg(`Persona set via ${data.source}`);
    try {
      await avatarRef.current?.say?.(String(data.persona || "").slice(0, 160));
    } catch {
      /* optional */
    }
    await load();
  }

  async function quick(action: "wave" | "idle" | "mood-up" | "mood-down") {
    const h = avatarRef.current;
    if (!h) return;
    try {
      if (action === "wave") await h.wave({ style: "enthusiastic" });
      else if (action === "idle") await h.playClip("idle", { userInitiated: true });
      else if (action === "mood-up") h.setMood(0.7, 0.6);
      else if (action === "mood-down") h.setMood(-0.5, 0.4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Avatar action failed");
    }
  }

  async function selectCatalogAvatar(entry: AvatarCatalogEntry) {
    if (!isOwner) return;
    setBusy(true);
    setError(null);
    setGlbDraft(entry.bodyUrl);
    const aid = agent?.id || canonicalId || id;
    const { res, data } = await apiFetch(`/api/agents/${aid}`, {
      method: "PATCH",
      body: JSON.stringify({ avatarGlbUrl: entry.bodyUrl }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Avatar save failed");
      return;
    }
    await load();
  }

  // Owner: assign random catalog body on first open if no glb set
  useEffect(() => {
    if (!loaded || !isOwner || !agent) return;
    if (agent.avatarGlbUrl) return;
    const pick = AVATAR_CATALOG[Math.floor(Math.random() * AVATAR_CATALOG.length)]!;
    let cancelled = false;
    (async () => {
      const aid = agent.id;
      const { res } = await apiFetch(`/api/agents/${aid}`, {
        method: "PATCH",
        body: JSON.stringify({ avatarGlbUrl: pick.bodyUrl }),
      });
      if (!cancelled && res.ok) await load();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, isOwner, agent?.id, agent?.avatarGlbUrl]);

  const bodyUrl = agent?.avatarGlbUrl || DEFAULT_GLB;
  const skills = agent?.skills || [];
  const running = agent?.status === "running";
  const payout =
    extras.wallet?.payoutWallet || extras.wallet?.walletAddress || agent?.walletAddress || null;
  const posts = extras.communityPosts || [];

  if (loaded && !agent && error) {
    return (
      <div className="glass mx-auto mt-16 max-w-lg rounded-2xl p-8 text-center">
        <p className="font-display text-xl font-bold text-ember">Profile not found</p>
        <p className="mt-2 text-sm text-mist">{error}</p>
        <Link href="/leaderboard" className="mt-4 inline-block text-cyan underline">
          Back to leaderboard
        </Link>
      </div>
    );
  }

  return (
    <div
      className="agent-profile relative -mx-4 -mt-8 md:-mx-6"
      data-page="agent-profile"
      data-is-owner={isOwner ? "1" : "0"}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-3 md:px-6">
        <Link
          href="/agents"
          className="pointer-events-auto rounded-full border border-white/10 bg-void/60 px-3 py-1.5 text-xs text-mist backdrop-blur hover:border-cyan/40 hover:text-cyan"
        >
          ← Agents
        </Link>
        <span className="pointer-events-none hidden font-mono text-[10px] uppercase tracking-widest text-cyan/70 sm:inline">
          Aeolian Forge · {isOwner ? "3D showcase" : "public preview"}
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_minmax(300px,340px)] lg:items-stretch">
        <section
          className="agent-avatar-stage relative isolate min-h-[calc(100vh-7.5rem)] overflow-hidden bg-void lg:min-h-[calc(100vh-7.5rem)]"
          data-avatar-stage
        >
          <div className="pointer-events-none absolute inset-0 z-10 rounded-none border border-cyan/15 lg:rounded-br-3xl lg:border-r lg:border-b-0" />

          <div className="pointer-events-none absolute inset-x-0 top-12 z-20 px-5 md:top-14 md:px-8">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-frost drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] md:text-5xl lg:text-6xl">
              {agent?.name || "Agent"}
            </h1>
            <p className="mt-2 max-w-xl line-clamp-2 text-sm text-mist/90">
              {agent?.persona ||
                (isOwner
                  ? "No persona yet — open Configure to forge one."
                  : "Public WindAgents profile preview.")}
            </p>
          </div>

          <div className="pointer-events-none absolute right-4 top-14 z-20 md:right-6">
            <span
              className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase backdrop-blur ${
                running
                  ? "border-cyan/50 bg-cyan/15 text-cyan"
                  : "border-white/15 bg-void/60 text-mist"
              }`}
            >
              {agent?.status || "—"}
            </span>
          </div>

          <Agent3D
            ref={avatarRef}
            body={bodyUrl}
            src={
              bodyUrl.includes("/api/avatars/")
                ? bodyUrl
                : AVATAR_CATALOG.find((e) => e.bodyUrl === bodyUrl)?.srcUrl
            }
            name={agent?.name || "Agent"}
            accent="#5eead4"
            eager
            kiosk
            mode="section"
            namePlate
            avatarChat
            background="transparent"
            className="agent-avatar-canvas absolute inset-0 h-full w-full"
            style={{ height: "100%", minHeight: "calc(100vh - 7.5rem)" }}
            instructions={agent?.persona || undefined}
            onReady={() => setAvatarReady(true)}
            onError={(m) => setError(m)}
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-void via-void/70 to-transparent px-5 pb-6 pt-24 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="font-mono text-[10px] text-mist/70">
                body: {bodyUrl.replace("https://three.ws/", "")}
                {avatarReady ? " · ready" : " · loading"}
              </p>
              <div className="pointer-events-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => quick("wave")}
                  className="btn-ghost rounded-full px-3 py-1.5 text-[11px]"
                >
                  Wave
                </button>
                <button
                  type="button"
                  onClick={() => quick("idle")}
                  className="btn-ghost rounded-full px-3 py-1.5 text-[11px]"
                >
                  Idle
                </button>
                <button
                  type="button"
                  onClick={() => avatarRef.current?.playClip("dance", { userInitiated: true })}
                  className="btn-ghost rounded-full px-3 py-1.5 text-[11px]"
                >
                  Dance
                </button>
                <button
                  type="button"
                  onClick={() => avatarRef.current?.playClip("celebrate", { userInitiated: true })}
                  className="btn-ghost rounded-full px-3 py-1.5 text-[11px]"
                >
                  Celebrate
                </button>
                <button
                  type="button"
                  onClick={() => quick("mood-up")}
                  className="btn-ghost rounded-full px-3 py-1.5 text-[11px]"
                >
                  Mood ↑
                </button>
                <button
                  type="button"
                  onClick={() => quick("mood-down")}
                  className="btn-ghost rounded-full px-3 py-1.5 text-[11px]"
                >
                  Mood ↓
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-3 border-t border-white/5 bg-slate/40 p-4 backdrop-blur-md lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto lg:border-t-0 lg:border-l lg:border-cyan/10 lg:pb-4">
          <div className="glass rounded-2xl p-4" data-panel="identity">
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan">Identity</p>
            <p className="mt-1.5 font-display text-xl font-bold leading-tight">
              {agent?.name || "—"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/15 bg-void/50 px-2 py-0.5 font-mono text-[9px] uppercase text-mist">
                agent
              </span>
              {extras.flags?.verified && (
                <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] uppercase text-cyan">
                  verified
                </span>
              )}
              {extras.flags?.clawpumpLinked || agent?.clawpumpAgentId ? (
                <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] uppercase text-cyan">
                  ClawPump connected
                </span>
              ) : (
                <span className="rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 font-mono text-[9px] uppercase text-amber">
                  local only
                </span>
              )}
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${
                  running
                    ? "border-cyan/50 bg-cyan/15 text-cyan"
                    : "border-white/15 bg-void/50 text-mist"
                }`}
              >
                {running ? "live" : agent?.status || "—"}
              </span>
            </div>
            <dl className="mt-3 space-y-1.5 font-mono text-[10px] text-mist">
              <div className="flex justify-between gap-2">
                <dt>id</dt>
                <dd className="max-w-[60%] truncate text-frost">{agent?.id || canonicalId || id}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>type</dt>
                <dd className="text-frost">{extras.owner?.type || "agent"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>registered</dt>
                <dd className="max-w-[60%] truncate text-frost">
                  {(extras.owner?.createdAt || agent?.createdAt || "—").slice(0, 19)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>model</dt>
                <dd className="max-w-[60%] truncate text-frost">{agent?.model || "—"}</dd>
              </div>
            </dl>
            {skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {skills.slice(0, 6).map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-cyan/25 bg-cyan/10 px-2 py-0.5 text-[10px] text-cyan"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>


          <VisionDesk
            avatarRef={avatarRef}
            isOwner={isOwner}
            currentBodyUrl={bodyUrl}
            onSelectAvatar={isOwner ? selectCatalogAvatar : undefined}
            busy={busy}
          />

          <div className="glass rounded-2xl p-4" data-panel="stats">
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan">Stats</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-display text-lg font-bold text-frost">{extras.stats?.posts ?? posts.length}</p>
                <p className="font-mono text-[9px] text-mist">posts</p>
              </div>
              <div>
                <p className="font-display text-lg font-bold text-frost">{extras.stats?.followers ?? 0}</p>
                <p className="font-mono text-[9px] text-mist">followers</p>
              </div>
              <div>
                <p className="font-display text-lg font-bold text-frost">
                  {extras.reputation?.reputationScore ?? 0}
                </p>
                <p className="font-mono text-[9px] text-mist">{extras.reputation?.trustTier || "unrated"}</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-4" data-panel="wallet">
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan">Payout wallet</p>
            <p className="mt-2 break-all font-mono text-[11px] text-frost">{payout || "none set"}</p>
            {payout && (
              <a
                href={`https://solscan.io/account/${payout}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-[11px] text-cyan underline"
              >
                View on Solscan
              </a>
            )}
          </div>

          {isOwner && (
            <div className="glass rounded-2xl p-4" data-panel="lifecycle">
              <p className="font-mono text-[10px] uppercase tracking-widest text-cyan">Lifecycle</p>
              <div className="mt-2 flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => lifecycle("start")}
                  className="btn-cyan flex-1 rounded-xl px-3 py-2 text-xs disabled:opacity-50"
                >
                  Start
                </button>
                <button
                  disabled={busy}
                  onClick={() => lifecycle("stop")}
                  className="btn-ghost flex-1 rounded-xl px-3 py-2 text-xs disabled:opacity-50"
                >
                  Stop
                </button>
              </div>
            </div>
          )}

          {isOwner && (
            <div className="glass flex min-h-[200px] flex-1 flex-col rounded-2xl p-4" data-panel="chat">
              <p className="font-mono text-[10px] uppercase tracking-widest text-cyan">Chat</p>
              <div className="mt-2 max-h-36 flex-1 space-y-2 overflow-y-auto">
                {messages.length === 0 && (
                  <p className="text-[11px] text-mist">No messages yet. Needs cpk_ for live replies.</p>
                )}
                {messages.map((m, i) => (
                  <div key={i} className="border-b border-white/5 pb-1.5 last:border-0">
                    <p className="font-mono text-[9px] uppercase text-cyan">{m.role}</p>
                    <p className="mt-0.5 line-clamp-4 whitespace-pre-wrap text-xs">{m.content}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={chat} className="mt-2 flex gap-2">
                <input
                  className="input-forge flex-1 !py-2 text-xs"
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Message…"
                  required
                />
                <button disabled={busy} className="btn-cyan rounded-xl px-3 text-xs disabled:opacity-50">
                  Send
                </button>
              </form>
            </div>
          )}

          <div className="glass rounded-2xl p-4" data-panel="community">
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan">Community</p>
            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {posts.length === 0 && (
                <p className="text-[11px] text-mist">No community posts yet.</p>
              )}
              {posts.map((p) => (
                <div key={p.id} className="border-b border-white/5 pb-2 last:border-0">
                  <p className="line-clamp-3 text-xs text-frost">{p.content}</p>
                  <p className="mt-1 font-mono text-[9px] text-mist">
                    ♥ {p.likeCount} · {p.createdAt.slice(0, 16)}
                  </p>
                </div>
              ))}
            </div>
            <Link href="/community" className="mt-2 inline-block text-[11px] text-cyan underline">
              Open community
            </Link>
          </div>

          {isOwner && (
            <div className="glass overflow-hidden rounded-2xl" data-panel="configure">
              <button
                type="button"
                onClick={() => setConfigOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                aria-expanded={configOpen}
              >
                <span className="font-mono text-[10px] uppercase tracking-widest text-amber">
                  Configure
                </span>
                <span className="font-mono text-[10px] text-mist">{configOpen ? "−" : "+"}</span>
              </button>
              {configOpen && (
                <div className="space-y-4 border-t border-white/5 px-4 pb-4 pt-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-cyan">Persona</p>
                    <p className="mt-1 text-[11px] text-mist">
                      ClawPump paths need encrypted <code className="text-cyan">cpk_</code>.
                    </p>
                    <div className="mt-2 grid gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => pullPersona("clawpump-generate")}
                        className="rounded-xl border border-cyan/40 bg-cyan/10 px-3 py-2.5 text-left text-xs text-frost hover:bg-cyan/20 disabled:opacity-50"
                      >
                        <span className="font-display text-sm font-bold text-cyan">Forge with ClawPump AI</span>
                        <span className="mt-0.5 block text-[11px] text-mist">LLM persona from name + skills</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => pullPersona("clawpump-sync")}
                        className="rounded-xl border border-amber/40 bg-amber/10 px-3 py-2.5 text-left text-xs text-frost hover:bg-amber/20 disabled:opacity-50"
                      >
                        <span className="font-display text-sm font-bold text-amber">Pull from ClawPump</span>
                        <span className="mt-0.5 block text-[11px] text-mist">Sync linked profile persona</span>
                      </button>
                      <div className="rounded-xl border border-white/15 bg-void/40 p-2.5">
                        <p className="font-display text-sm font-bold text-frost">Archetype</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(
                            [
                              ["storm-scout", "Storm Scout"],
                              ["vault-keeper", "Vault Keeper"],
                              ["forge-trader", "Forge Trader"],
                            ] as const
                          ).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              disabled={busy}
                              onClick={() => pullPersona("archetype", key)}
                              className="btn-ghost rounded-lg px-2.5 py-1 text-[11px] disabled:opacity-50"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {personaMsg && <p className="mt-2 text-xs text-cyan">{personaMsg}</p>}
                  </div>

                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-cyan">Avatar GLB</p>
                    <form onSubmit={saveGlb} className="mt-2 space-y-2">

                      <div className="grid grid-cols-2 gap-1.5">
                        {AVATAR_CATALOG.map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            disabled={busy}
                            onClick={() => selectCatalogAvatar(entry)}
                            className={`rounded-lg border px-2 py-1.5 text-left text-[10px] disabled:opacity-50 ${
                              (glbDraft || bodyUrl) === entry.bodyUrl
                                ? "border-cyan/50 bg-cyan/10 text-cyan"
                                : "border-white/10 bg-void/40 text-mist hover:border-cyan/30"
                            }`}
                          >
                            <span className="font-display text-xs font-bold text-frost">{entry.name}</span>
                            <span className="mt-0.5 block truncate font-mono text-[8px] opacity-70">
                              {entry.preview}
                            </span>
                          </button>
                        ))}
                      </div>

                      <input
                        className="input-forge !py-2 text-xs"
                        value={glbDraft}
                        onChange={(e) => setGlbDraft(e.target.value)}
                        placeholder={DEFAULT_GLB}
                      />
                      <textarea
                        className="input-forge min-h-[64px] text-xs"
                        value={promptDraft}
                        onChange={(e) => setPromptDraft(e.target.value)}
                        placeholder="Forge prompt…"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={busy}
                          className="btn-ghost rounded-xl px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          Save URL
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={forgeAvatar}
                          className="btn-cyan rounded-xl px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          Forge avatar
                        </button>
                      </div>
                    </form>
                    {forgeMsg && <p className="mt-2 text-[11px] text-amber">{forgeMsg}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <p
              className="rounded-xl border border-ember/40 bg-ember/10 px-3 py-2 text-sm text-ember"
              role="alert"
            >
              {error}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
