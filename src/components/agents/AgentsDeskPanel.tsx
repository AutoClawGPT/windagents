"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getToken, useAuthReady } from "@/lib/client-auth";

type LocalAgent = {
  id: string;
  name: string;
  status?: string;
  persona?: string | null;
  skills?: string[];
  clawpumpAgentId?: string | null;
};

const PARTNER_SLUGS = [
  "trading",
  "perps",
  "token-launch",
  "portfolio",
  "market-intelligence",
  "social",
  "sniper",
  "wallet",
  "image-generation",
] as const;

export function AgentsDeskPanel() {
  const authed = useAuthReady();
  const [agents, setAgents] = useState<LocalAgent[]>([]);
  const [hasCpk, setHasCpk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fees, setFees] = useState<unknown>(null);
  const [feesError, setFeesError] = useState<string | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [createSkills, setCreateSkills] = useState<string[]>(["trading", "token-launch"]);

  // Selected agent for skills
  const [selectedId, setSelectedId] = useState("");
  const [enableSkills, setEnableSkills] = useState<string[]>([]);

  const selected = agents.find((a) => a.id === selectedId) || null;

  const load = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      setAgents([]);
      return;
    }
    setLoading(true);
    setError(null);
    const [agentsRes, settingsRes] = await Promise.all([
      apiFetch("/api/agents"),
      apiFetch("/api/settings"),
    ]);
    setLoading(false);
    if (!agentsRes.res.ok) {
      setError(agentsRes.data.error || "Failed to load agents");
      return;
    }
    const list: LocalAgent[] = agentsRes.data.agents || [];
    setAgents(list);
    setHasCpk(!!(settingsRes.res.ok && settingsRes.data?.keys?.hasClawpump));
    if (!selectedId && list[0]?.id) {
      setSelectedId(list[0].id);
      setEnableSkills(list[0].skills || []);
    }
  }, [selectedId]);

  useEffect(() => {
    if (authed === null) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  useEffect(() => {
    if (!selected) return;
    setEnableSkills(selected.skills || []);
  }, [selected]);

  function toggleSkill(slug: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);
  }

  async function createAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!getToken()) {
      setError("Login required");
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    const { res, data } = await apiFetch("/api/agents", {
      method: "POST",
      body: JSON.stringify({
        name,
        persona,
        skills: createSkills,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Create failed");
      return;
    }
    setMsg(
      data.agent?.clawpumpAgentId
        ? `Created ${data.agent.name} · linked clawpump ${data.agent.clawpumpAgentId}`
        : `Created local agent ${data.agent?.name || ""} — optional: connect cpk_ later to sync with Partner`
    );
    setName("");
    setPersona("");
    await load();
    if (data.agent?.id) setSelectedId(data.agent.id);
  }

  async function applySkills() {
    if (!selected) return;
    if (!getToken()) {
      setError("Login required");
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);

    if (hasCpk && selected.clawpumpAgentId) {
      const { res, data } = await apiFetch("/api/skills", {
        method: "POST",
        body: JSON.stringify({
          action: "enable",
          agentId: selected.clawpumpAgentId,
          skills: enableSkills,
        }),
      });
      setBusy(false);
      if (!res.ok) {
        setError(data.message || data.error || "Enable skills failed");
        return;
      }
      await apiFetch(`/api/agents/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ skills: enableSkills }),
      });
      setMsg(`Partner skills enabled on ${selected.clawpumpAgentId}`);
      await load();
      return;
    }

    // Local-only PATCH — no cpk_ required
    const { res, data } = await apiFetch(`/api/agents/${selected.id}`, {
      method: "PATCH",
      body: JSON.stringify({ skills: enableSkills }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Local skills update failed");
      return;
    }
    setMsg(
      hasCpk
        ? "Local skills saved. Link/sync a clawpumpAgentId (re-create with cpk_) to enable Partner skills."
        : "Local skills saved. Partner enable is optional — open ClawPump.tech tab after saving cpk_."
    );
    await load();
  }


  function rememberLaunch(venue: string, partnerId?: string | null) {
    try {
      sessionStorage.setItem("windagents_launch_venue", venue);
      if (partnerId) sessionStorage.setItem("windagents_launch_agent", partnerId);
    } catch {
      /* ignore */
    }
  }

  async function createLauncherThenConfirm() {
    if (!getToken()) {
      setError("Login required");
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    const launcherName = name.trim() || "Token Launcher";
    const skills = Array.from(new Set([...createSkills, "token-launch"]));
    const { res, data } = await apiFetch("/api/agents", {
      method: "POST",
      body: JSON.stringify({
        name: launcherName,
        persona: persona || "Launches tokens carefully via ClawPump Partner",
        skills,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Create launcher failed");
      return;
    }
    const agent = data.agent;
    await load();
    if (agent?.id) setSelectedId(agent.id);
    const partnerId = agent?.clawpumpAgentId as string | undefined;
    if (partnerId) {
      rememberLaunch("pump", partnerId);
      setMsg(
        `Launcher created + linked ${partnerId.slice(0, 12)}… — opening Confirm with agent preselected`
      );
      window.location.href = "/launch?venue=pump";
      return;
    }
    setMsg(
      hasCpk
        ? `Created local ${agent?.name || "agent"} without clawpumpAgentId — re-check cpk_ / Partner sync before mint`
        : `Created local launcher. Save your own cpk_ in Settings, then create again (or open ClawPump.tech tab) for real Partner mints — never faked.`
    );
  }

  async function loadEarningsForSelected() {
    if (!selected?.clawpumpAgentId) {
      setFeesError("Select a linked agent (clawpumpAgentId) to fetch earnings");
      setFees(null);
      return;
    }
    if (!hasCpk) {
      setFeesError("Connect your own cpk_ in Settings — fees use Partner/platform with your key");
      setFees(null);
      return;
    }
    setFeesError(null);
    setFees(null);
    const { res, data } = await apiFetch(
      `/api/fees/earnings?agentId=${encodeURIComponent(selected.clawpumpAgentId)}`
    );
    if (!res.ok) {
      setFeesError(data.message || data.error || `HTTP ${res.status}`);
      return;
    }
    setFees(data);
  }

  return (
    <section id="wa-agents" className="scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-frost">WindAgents Agents</h2>
          <p className="mt-1 max-w-2xl text-sm text-mist">
            Our registry desk — list/create local agents, PATCH local skills, open profiles.{" "}
            <strong className="text-frost">No cpk_ required</strong> for local ops (Bearer login).
            Tokenize Confirm is also here (still uses your cpk_ for real mints). ClawPump.tech tab kept.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/agents" className="btn-ghost rounded-xl px-4 py-2 text-xs">
            Full Agents gallery
          </Link>
          <Link href="/skills" className="btn-ghost rounded-xl px-4 py-2 text-xs">
            Skills
          </Link>
          <Link href="/terminal" className="btn-ghost rounded-xl px-4 py-2 text-xs">
            Terminal / Swap
          </Link>
          <button
            type="button"
            onClick={() => load()}
            className="btn-ghost rounded-xl px-4 py-2 text-xs"
          >
            Refresh
          </button>
        </div>
      </div>

      {authed === false && (
        <div className="glass mt-4 rounded-2xl border border-amber/40 p-4 text-sm text-amber">
          Login with your WindAgents Bearer to manage agents.{" "}
          <Link href="/login" className="underline text-cyan">
            Login
          </Link>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-ember/40 bg-ember/10 px-4 py-2 text-sm text-ember">
          {error}
        </p>
      )}
      {msg && (
        <p className="mt-4 rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-2 text-sm text-cyan">
          {msg}
        </p>
      )}

      {/* Create */}
      <form
        onSubmit={createAgent}
        className="glass mt-6 space-y-4 rounded-2xl border border-cyan/20 p-5"
      >
        <h3 className="font-display text-lg font-bold">Create agent</h3>
        <p className="text-xs text-mist">
          POST /api/agents — works with Bearer alone. If cpk_ is saved, also creates Partner agent
          and links clawpumpAgentId.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-xs text-mist">
            Name
            <input
              className="input-forge mt-1"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Storm Scout"
            />
          </label>
          <label className="block text-xs text-mist">
            Persona
            <input
              className="input-forge mt-1"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder="Trades + launches with caution"
            />
          </label>
        </div>
        <div>
          <p className="text-xs text-mist mb-2">Skills (local; Partner-enableable when linked)</p>
          <div className="flex flex-wrap gap-2">
            {PARTNER_SLUGS.map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => toggleSkill(slug, createSkills, setCreateSkills)}
                className={
                  createSkills.includes(slug)
                    ? "rounded-full border border-cyan/40 bg-cyan/15 px-3 py-1 font-mono text-[10px] text-cyan"
                    : "rounded-full border border-white/10 bg-void/40 px-3 py-1 font-mono text-[10px] text-mist"
                }
              >
                {slug}
              </button>
            ))}
          </div>
        </div>
        <button
          disabled={busy || !authed}
          className="btn-cyan rounded-xl px-5 py-2 text-sm disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create WindAgents agent"}
        </button>
      </form>

      {/* List + manage */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="glass rounded-2xl border border-cyan/20 p-5">
          <h3 className="font-display text-lg font-bold">
            Local agents{" "}
            <span className="font-mono text-sm text-cyan">({agents.length})</span>
          </h3>
          {loading ? (
            <p className="mt-3 font-mono text-xs text-mist">loading…</p>
          ) : (
            <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {agents.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className={
                      selectedId === a.id
                        ? "w-full rounded-xl border border-cyan/40 bg-cyan/10 px-3 py-2 text-left"
                        : "w-full rounded-xl border border-white/5 bg-void/30 px-3 py-2 text-left hover:border-cyan/20"
                    }
                  >
                    <p className="font-display text-sm font-bold text-frost">{a.name}</p>
                    <p className="mt-0.5 break-all font-mono text-[10px] text-mist">{a.id}</p>
                    <p className="mt-1 font-mono text-[10px] text-cyan">
                      {a.clawpumpAgentId
                        ? `linked · ${a.clawpumpAgentId.slice(0, 12)}…`
                        : "local-only · no clawpumpAgentId"}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-mist">
                      {(a.skills || []).slice(0, 5).join(" · ") || "no skills"}
                    </p>
                    <Link
                      href={`/agents/${a.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 inline-block font-mono text-[10px] text-amber underline"
                    >
                      Open profile →
                    </Link>
                  </button>
                </li>
              ))}
              {!agents.length && (
                <p className="text-xs text-mist">No local agents yet — create one above.</p>
              )}
            </ul>
          )}
          <p className="mt-3 font-mono text-[10px] text-mist">
            cpk_ (optional for this desk): {hasCpk ? "connected" : "not connected"}
          </p>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl border border-cyan/20 p-5">
            <h3 className="font-display text-lg font-bold">Skills on selected</h3>
            {!selected ? (
              <p className="mt-2 text-xs text-mist">Select a local agent.</p>
            ) : (
              <>
                <p className="mt-1 font-mono text-[10px] text-mist">
                  {selected.name} ·{" "}
                  {selected.clawpumpAgentId
                    ? `Partner enable via ${selected.clawpumpAgentId}`
                    : "PATCH local skills only (no cpk_ needed)"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PARTNER_SLUGS.map((slug) => (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => toggleSkill(slug, enableSkills, setEnableSkills)}
                      className={
                        enableSkills.includes(slug)
                          ? "rounded-full border border-cyan/40 bg-cyan/15 px-3 py-1 font-mono text-[10px] text-cyan"
                          : "rounded-full border border-white/10 bg-void/40 px-3 py-1 font-mono text-[10px] text-mist"
                      }
                    >
                      {slug}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={applySkills}
                  className="btn-cyan mt-4 rounded-xl px-4 py-2 text-xs disabled:opacity-50"
                >
                  {hasCpk && selected.clawpumpAgentId
                    ? "Enable on Partner + mirror local"
                    : "Save skills on local row"}
                </button>
              </>
            )}
          </div>

          <div
            id="wa-tokenize-like-clawpump"
            className="glass scroll-mt-24 rounded-2xl border border-cyan/30 p-5"
          >
            <h3 className="font-display text-lg font-bold">Tokenize like ClawPump</h3>
            <p className="mt-1 text-xs text-mist">
              Same Confirm flow as clawpump.tech — create a launcher with{" "}
              <code className="font-mono text-cyan">token-launch</code>, open{" "}
              <code className="font-mono text-cyan">/launch?venue=…</code> with the agent
              preselected. Real mints still need <strong className="text-frost">your</strong>{" "}
              <code className="font-mono text-cyan">cpk_</code> (Partner proxy). ClawPump.tech tab
              stays available.
            </p>

            {!selected?.clawpumpAgentId && (
              <div className="mt-3 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
                <strong>Local-only agent.</strong> Chat and Launch need a ClawPump link.
                Save your <code className="font-mono">cpk_</code> in Settings, then create/sync an agent so
                <code className="font-mono">clawpumpAgentId</code> is set — or re-create with cpk_ connected.{" "}
                <a href="/settings" className="underline text-cyan">
                  Open Settings
                </a>
              </div>
            )}

            {selected?.clawpumpAgentId ? (
              <p className="mt-2 font-mono text-[10px] text-cyan">
                Selected linked: {selected.clawpumpAgentId.slice(0, 18)}…
              </p>
            ) : selected ? (
              <p className="mt-2 font-mono text-[10px] text-amber">
                Selected is local-only — create-with-cpk_ or sync before Partner mint (no fake ids).
              </p>
            ) : (
              <p className="mt-2 font-mono text-[10px] text-mist">
                Select an agent or create a launcher below.
              </p>
            )}
            <p className="mt-2 font-mono text-[10px] text-mist">
              cpk_: {hasCpk ? "connected" : "not connected — Settings"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !authed}
                onClick={createLauncherThenConfirm}
                className="btn-cyan rounded-xl px-4 py-2 text-xs disabled:opacity-50"
              >
                {busy ? "Working…" : "Create launcher + open Confirm"}
              </button>
              {selected?.clawpumpAgentId && (
                <Link
                  href="/launch?venue=pump"
                  className="btn-cyan rounded-xl px-4 py-2 text-xs"
                  onClick={() => rememberLaunch("pump", selected.clawpumpAgentId)}
                >
                  Confirm · pump
                </Link>
              )}
              <Link
                href="/tokenize?tab=clawpump"
                className="btn-ghost rounded-xl px-4 py-2 text-xs"
              >
                ClawPump.tech tab
              </Link>
            </div>

            <p className="mt-4 text-[10px] uppercase tracking-wide text-mist">Venues → Confirm</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["pump", "Pump.fun"],
                  ["self-funded", "Self-funded"],
                  ["pons", "PONS"],
                  ["pools", "Pools"],
                ] as const
              ).map(([venue, label]) => {
                const linked = selected?.clawpumpAgentId;
                const href = `/launch?venue=${venue}`;
                return linked ? (
                  <Link
                    key={venue}
                    href={href}
                    onClick={() => rememberLaunch(venue, linked)}
                    className="rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 font-mono text-[10px] text-cyan"
                  >
                    {label}
                  </Link>
                ) : (
                  <Link
                    key={venue}
                    href={hasCpk ? href : "/settings"}
                    className="rounded-full border border-white/10 bg-void/40 px-3 py-1 font-mono text-[10px] text-mist"
                    title={
                      hasCpk
                        ? "Open Confirm — pick/create a linked agent"
                        : "Save cpk_ first for Partner launch"
                    }
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 border-t border-white/5 pt-3">
              <p className="text-[10px] uppercase tracking-wide text-mist">Earnings (if linked)</p>
              <button
                type="button"
                disabled={!selected?.clawpumpAgentId || !hasCpk}
                onClick={loadEarningsForSelected}
                className="btn-ghost mt-2 rounded-xl px-3 py-1.5 text-[10px] disabled:opacity-50"
              >
                Fetch GET /api/fees/earnings
              </button>
              {feesError && <p className="mt-2 text-[10px] text-amber">{feesError}</p>}
              {fees != null && (
                <pre className="mt-2 max-h-32 overflow-auto rounded-xl bg-void/50 p-2 font-mono text-[9px] text-mist">
                  {JSON.stringify(fees, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
