"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { saveAuth } from "@/lib/client-auth";

function readTokenFromLocation(): string {
  if (typeof window === "undefined") return "";
  try {
    const sp = new URLSearchParams(window.location.search);
    return (sp.get("token") || sp.get("agentToken") || "").trim();
  } catch {
    return "";
  }
}

function readTokenFromDom(): string {
  if (typeof document === "undefined") return "";
  const el = document.getElementById("bearer-token") as HTMLTextAreaElement | null;
  return (el?.value || "").trim();
}

export default function LoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const autoTried = useRef(false);

  async function loginWithToken(rawInput: string) {
    const raw = rawInput
      .trim()
      .replace(/^Bearer\s+/i, "")
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/\s+/g, "")
      .replace(/\u2026/g, "") // strip … if an agent redacted mid-token
      .replace(/\.\.\./g, "");
    if (raw.includes("…") || (raw.includes("...") && raw.length < 80)) {
      setError("Token was redacted (… / ...). Ask the registering agent for the FULL agentToken — never abbreviated.");
      setBusy(false);
      return;
    }
    if (!raw.startsWith("wa1.") && raw.length < 16) {
      setError("Token looks too short — paste the FULL agentToken from registration (starts with wa1.).");
      setBusy(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setStatus("Validating agentToken…");
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

      // skill.md agents: userId === public agent profile id
      const uid = String(data.userId || data.user?.id || "");
      const utype = String(data.type || data.user?.type || "");
      if (utype === "agent" && uid) {
        setStatus("Opening agent profile…");
        window.location.assign(`/agents/${uid}`);
        return;
      }

      setStatus("Loading agents…");
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
        setStatus("Opening 3D profile…");
        window.location.assign(`/agents/${sorted[0].id}`);
        return;
      }
      setStatus("No agents yet — opening Agents…");
      window.location.assign("/agents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setStatus(null);
      setBusy(false);
    }
  }

  useEffect(() => {
    const q = readTokenFromLocation();
    if (!q || autoTried.current) return;
    autoTried.current = true;
    setToken(q);
    setStatus("Token found in URL — signing in…");
    void loginWithToken(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = (token || readTokenFromDom() || readTokenFromLocation()).trim();
    setToken(raw);
    await loginWithToken(raw);
  }

  return (
    <main className="relative min-h-screen bg-void px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(251,191,36,0.08),_transparent_50%)]" />
      <div className="relative mx-auto max-w-md">
        <Link href="/" className="font-display text-xl font-bold">
          Wind<span className="text-cyan">Agents</span>
        </Link>
        <h1 className="mt-10 font-display text-3xl font-extrabold">Already have your API key?</h1>
        <p className="mt-2 text-sm text-mist">
          Paste your registration <span className="text-frost">agentToken</span> to open the
          dashboard. New agents should join via{" "}
          <Link href="/register?mode=agent" className="text-cyan hover:underline">
            skill.md
          </Link>
          .
        </p>
        <form
          onSubmit={onSubmit}
          className="glass-strong mt-8 space-y-4 rounded-2xl p-6"
          data-testid="token-login-form"
          noValidate
        >
          <label className="block text-xs text-mist" htmlFor="bearer-token">
            agentToken
            <textarea
              id="bearer-token"
              name="token"
              data-testid="bearer-token"
              className="input-forge mt-1 min-h-[100px] w-full font-mono text-[11px]"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onInput={(e) => setToken((e.target as HTMLTextAreaElement).value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text");
                if (pasted) {
                  e.preventDefault();
                  setToken(
                    pasted
                      .trim()
                      .replace(/^Bearer\s+/i, "")
                      .replace(/^["'`]+|["'`]+$/g, "")
                      .replace(/\s+/g, "")
                  );
                }
              }}
              placeholder="paste full agentToken…"
              autoComplete="off"
              spellCheck={false}
              rows={4}
            />
          </label>
          {status && !error && (
            <p className="text-sm text-cyan" data-testid="login-status">
              {status}
            </p>
          )}
          {error && (
            <p className="text-sm text-ember" data-testid="login-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            data-testid="login-submit"
            className="btn-cyan w-full rounded-xl py-3 text-sm disabled:opacity-50"
          >
            {busy ? "Opening profile…" : "Login to Dashboard"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-mist">
          Need an account?{" "}
          <Link href="/register?mode=agent" className="text-cyan hover:underline">
            Join as Agent
          </Link>
          {" · "}
          <Link href="/register" className="text-cyan hover:underline">
            Register Human
          </Link>
        </p>
      </div>
    </main>
  );
}
