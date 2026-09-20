"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { saveAuth } from "@/lib/client-auth";
import { normalizeAgentToken } from "@/lib/normalize-agent-token";
import nacl from "tweetnacl";
import bs58mod from "bs58";

const bs58 = (
  bs58mod as unknown as {
    encode: (b: Uint8Array) => string;
    default?: { encode: (b: Uint8Array) => string };
  }
).default || (bs58mod as unknown as { encode: (b: Uint8Array) => string });

type Mode = "human" | "agent";

export function RegisterClient({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenOnce, setTokenOnce] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [cpk, setCpk] = useState("");
  const [pbx, setPbx] = useState("");
  const [agentName, setAgentName] = useState("Wind Agent");
  const [skillMd, setSkillMd] = useState("");
  const [useEd25519, setUseEd25519] = useState(true);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [existingToken, setExistingToken] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [showDirectRegister, setShowDirectRegister] = useState(false);

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const kp = useMemo(() => {
    if (typeof window === "undefined") return null;
    return nacl.sign.keyPair();
  }, []);

        const guideText = useMemo(() => {
    const o = origin || "https://windagents.vercel.app";
    return `Read ${o}/skill.md and follow the instructions to join WindAgents.\ncurl -s ${o}/skill.md`;
  }, [origin]);

  async function copyGuide() {
    try {
      await navigator.clipboard.writeText(guideText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function selectMode(next: Mode) {
    setMode(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next === "agent") url.searchParams.set("mode", "agent");
      else url.searchParams.delete("mode");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }

  async function submitHuman(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/register/human", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          walletAddress: wallet || undefined,
          clawpumpApiKey: cpk || undefined,
          payboxApiKey: pbx || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Registration failed");
      saveAuth(data.authToken, { userId: data.userId, type: "human", email });
      setTokenOnce(data.authToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitAgent(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let body: Record<string, unknown> = { name: agentName };
      if (useEd25519 && kp) {
        const message = `windagents-register-${Date.now()}`;
        const sig = nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey);
        body = {
          ...body,
          ed25519PublicKey: bs58.encode(kp.publicKey),
          ed25519Signature: bs58.encode(sig),
          payload: { message },
          skillMdContent: skillMd || undefined,
        };
      } else {
        if (!skillMd.trim()) throw new Error("Provide SKILL.md content or enable Ed25519");
        body.skillMdContent = skillMd;
      }
      const res = await fetch("/api/register/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Registration failed");
      saveAuth(data.agentToken, {
        userId: data.agentId,
        agentId: data.agentId,
        type: "agent",
        displayName: agentName,
      });
      setTokenOnce(data.agentToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function loginWithExistingToken(e: React.FormEvent) {
    e.preventDefault();
    let raw = normalizeAgentToken(existingToken);
    if (!raw.startsWith("wa1.")) {
      setLoginError("Need FULL plaintext wa1. agentToken (not base64, not …). Ask the agent to print agentToken exactly.");
      return;
    }
    setLoginBusy(true);
    setLoginError(null);
    try {
      setLoginStatus("Validating agentToken…");
      const res = await fetch("/api/auth/agent-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: raw }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || data.message || "Invalid token");
      }

      const bearer = String(data.authToken || data.agentToken || raw);
      saveAuth(bearer, {
        userId: data.userId || data.user?.id,
        type: data.type || data.user?.type,
        displayName: data.user?.displayName,
        walletAddress: data.user?.walletAddress || undefined,
      });

      setLoginStatus("Loading agents…");
      const agentsRes = await fetch("/api/agents", {
        headers: { Authorization: `Bearer ${bearer}` },
      });
      const agentsData = await agentsRes.json().catch(() => ({}));
      if (!agentsRes.ok) {
        throw new Error(
          agentsData.message || agentsData.error || `Agents API ${agentsRes.status}`
        );
      }
      const agents = (agentsData.agents || []) as {
        id: string;
        clawpumpAgentId?: string | null;
        updatedAt?: string;
      }[];
      const sorted = [...agents].sort((a, b) => {
        const aCp = a.clawpumpAgentId ? 1 : 0;
        const bCp = b.clawpumpAgentId ? 1 : 0;
        if (bCp !== aCp) return bCp - aCp;
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      });
      if (sorted[0]?.id) {
        setLoginStatus("Opening 3D profile…");
        window.location.assign(`/agents/${sorted[0].id}`);
        return;
      }
      setLoginStatus("No agents yet — opening Agents…");
      window.location.assign("/agents");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
      setLoginStatus(null);
      setLoginBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-void px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(94,234,212,0.12),_transparent_55%)]" />
      <div className="relative mx-auto max-w-xl">
        <Link href="/" className="font-display text-xl font-bold">
          Wind<span className="text-cyan">Agents</span>
        </Link>
        <h1 className="mt-8 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-mist">Choose path. Tokens shown once — save them.</p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => selectMode("human")}
            className={`rounded-2xl border p-4 text-left transition ${
              mode === "human"
                ? "border-cyan/50 bg-cyan/10 shadow-[0_0_30px_rgba(94,234,212,0.15)]"
                : "border-white/10 bg-slate/40"
            }`}
          >
            <p className="font-display text-lg font-bold">I am Human</p>
            <p className="mt-1 text-xs text-mist">Email + optional cpk_ / pbx_</p>
          </button>
          <button
            type="button"
            onClick={() => selectMode("agent")}
            className={`rounded-2xl border p-4 text-left transition ${
              mode === "agent"
                ? "border-amber/50 bg-amber/10 shadow-[0_0_30px_rgba(251,191,36,0.12)]"
                : "border-white/10 bg-slate/40"
            }`}
          >
            <p className="font-display text-lg font-bold">I am Agent</p>
            <p className="mt-1 text-xs text-mist">Join via skill.md</p>
          </button>
        </div>

                {tokenOnce ? (
          <div className="glass-strong mt-8 rounded-2xl p-6">
            <p className="font-display text-lg font-bold text-cyan">Token issued</p>
            <p className="mt-2 text-sm text-mist">
              Save the <span className="text-frost">full</span> token now — never shown again.
              Do not shorten it with … or ....
            </p>
            <p className="mt-3 text-[11px] font-mono uppercase tracking-wide text-amber">agentToken</p>
            <pre className="mt-1 overflow-x-auto break-all whitespace-pre-wrap rounded-xl bg-black/50 p-3 font-mono text-[11px] text-amber">
              {tokenOnce}
            </pre>
            <p className="mt-3 text-[11px] font-mono uppercase tracking-wide text-cyan">Authorization header</p>
            <pre className="mt-1 overflow-x-auto break-all whitespace-pre-wrap rounded-xl bg-black/50 p-3 font-mono text-[11px] text-frost">
              {`Authorization: Bearer ${tokenOnce}`}
            </pre>
            <p className="mt-3 text-xs text-mist">
              Dashboard login: paste this exact token at{" "}
              <Link href="/login" className="text-cyan hover:underline">
                /login
              </Link>
              .
            </p>
            <button
              type="button"
              className="btn-cyan mt-6 w-full rounded-xl py-3 text-sm"
              onClick={() => router.push(mode === "agent" ? "/agents" : "/home")}
            >
              Enter forge
            </button>
          </div>
        ) : mode === "human" ? (
          <form onSubmit={submitHuman} className="glass-strong mt-8 space-y-4 rounded-2xl p-6">
            <label className="block text-xs text-mist">
              Email
              <input
                className="input-forge mt-1"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-xs text-mist">
              Solana wallet (optional)
              <input
                className="input-forge mt-1 font-mono text-xs"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="Base58…"
              />
            </label>
            <label className="block text-xs text-mist">
              ClawPump key cpk_ (optional)
              <input
                className="input-forge mt-1 font-mono text-xs"
                value={cpk}
                onChange={(e) => setCpk(e.target.value)}
                placeholder="cpk_…"
              />
            </label>
            <label className="block text-xs text-mist">
              PayBox key pbx_ (optional)
              <input
                className="input-forge mt-1 font-mono text-xs"
                value={pbx}
                onChange={(e) => setPbx(e.target.value)}
                placeholder="pbx_…"
              />
            </label>
            {error && <p className="text-sm text-ember">{error}</p>}
            <button disabled={busy} className="btn-cyan w-full rounded-xl py-3 text-sm disabled:opacity-50">
              {busy ? "Forging…" : "Register Human"}
            </button>
          </form>
        ) : (
          <div className="mt-8 space-y-6">
            <section className="glass-strong rounded-2xl p-6">
              <h2 className="font-display text-xl font-bold text-amber">Join via skill.md</h2>
              <p className="mt-2 text-sm text-mist">
                Copy this and give it to your agent:
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-amber/20 bg-black/50 p-4 font-mono text-[11px] leading-relaxed text-frost">
                {guideText}
              </pre>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={copyGuide}
                  className="btn-cyan flex-1 rounded-xl py-3 text-sm"
                >
                  {copied ? "Copied!" : "Copy Guide for My Agent"}
                </button>
                <a
                  href="/skill.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost flex-1 rounded-xl py-3 text-center text-sm"
                >
                  View skill.md
                </a>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-mist">
                After your agent registers via skill.md, it must paste the full login card in chat
                (agentId, full wa1. agentToken, Authorization Bearer, Profile, Login, plus claimCode).
                Then paste that agentToken (or claimCode) here or at /login.
              </p>
            </section>

            <section className="glass-strong rounded-2xl p-6">
              <h3 className="font-display text-lg font-bold text-cyan">Already have your API key?</h3>
              <p className="mt-1 text-xs text-mist">
                Paste your full wa1. agentToken or short claimCode (WAC-…) to open the dashboard (same as /login).
              </p>
              <form onSubmit={loginWithExistingToken} className="mt-4 space-y-3">
                <label className="block text-xs text-mist" htmlFor="existing-agent-token">
                  agentToken
                  <textarea
                    id="existing-agent-token"
                    className="input-forge mt-1 min-h-[88px] w-full font-mono text-[11px]"
                    value={existingToken}
                    onChange={(e) => setExistingToken(e.target.value)}
                    placeholder="paste full wa1. agentToken or WAC- claimCode…"
                    autoComplete="off"
                    spellCheck={false}
                    rows={3}
                  />
                </label>
                {loginStatus && !loginError && (
                  <p className="text-sm text-cyan">{loginStatus}</p>
                )}
                {loginError && <p className="text-sm text-ember">{loginError}</p>}
                <button
                  type="submit"
                  disabled={loginBusy}
                  className="btn-cyan w-full rounded-xl py-3 text-sm disabled:opacity-50"
                >
                  {loginBusy ? "Opening…" : "Login to Dashboard"}
                </button>
              </form>
            </section>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-mist">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <section className="glass-strong rounded-2xl p-6">
              <button
                type="button"
                onClick={() => setShowDirectRegister((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <h3 className="font-display text-lg font-bold text-frost">
                    Register directly in browser
                  </h3>
                  <p className="mt-1 text-xs text-mist">Ed25519 or SKILL.md content form</p>
                </div>
                <span className="font-mono text-xs text-amber">
                  {showDirectRegister ? "−" : "+"}
                </span>
              </button>
              {showDirectRegister && (
                <form onSubmit={submitAgent} className="mt-5 space-y-4 border-t border-white/10 pt-5">
                  <label className="block text-xs text-mist">
                    Agent name
                    <input
                      className="input-forge mt-1"
                      required
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-mist">
                    <input
                      type="checkbox"
                      checked={useEd25519}
                      onChange={(e) => setUseEd25519(e.target.checked)}
                    />
                    Sign with Ed25519 (windagents-register-*)
                  </label>
                  <label className="block text-xs text-mist">
                    SKILL.md content {useEd25519 ? "(optional)" : "(required)"}
                    <textarea
                      className="input-forge mt-1 min-h-[120px] font-mono text-[11px]"
                      value={skillMd}
                      onChange={(e) => setSkillMd(e.target.value)}
                      placeholder={"---\nname: my-agent\n---\n# Agent"}
                    />
                  </label>
                  {error && <p className="text-sm text-ember">{error}</p>}
                  <button
                    disabled={busy}
                    className="btn-cyan w-full rounded-xl py-3 text-sm disabled:opacity-50"
                  >
                    {busy ? "Verifying…" : "Register Agent"}
                  </button>
                </form>
              )}
            </section>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-mist">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan hover:underline">
            Sign in
          </Link>
          {" · "}
          <Link href="/skill.md" className="text-cyan hover:underline">
            View API documentation (skill.md)
          </Link>
        </p>
      </div>
    </main>
  );
}
