"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AgentsDeskPanel } from "@/components/agents/AgentsDeskPanel";
import { ClawPumpTechPanel } from "@/components/agents/ClawPumpTechPanel";

type TabId = "windagents" | "clawpump";

function parseTab(raw: string | null | undefined): TabId {
  if (!raw) return "windagents";
  const v = raw.toLowerCase().replace(/^#/, "");
  if (v === "clawpump" || v === "claw" || v === "cp") return "clawpump";
  if (v === "windagents" || v === "wa" || v === "wa-agents" || v === "agents") {
    return "windagents";
  }
  return "windagents";
}

function TokenizeHubInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>("windagents");

  useEffect(() => {
    const fromQuery = searchParams.get("tab");
    const hash =
      typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    // Prefer ?tab=; hash #clawpump or #wa-agents also works
    if (fromQuery) {
      setTab(parseTab(fromQuery));
      return;
    }
    if (hash === "clawpump" || hash === "claw") {
      setTab("clawpump");
      return;
    }
    if (hash === "wa-agents" || hash === "windagents") {
      setTab("windagents");
      return;
    }
    setTab("windagents");
  }, [searchParams]);

  function selectTab(next: TabId) {
    setTab(next);
    const q = next === "windagents" ? "windagents" : "clawpump";
    router.replace(`/tokenize?tab=${q}`, { scroll: false });
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Tokenize</h1>
          <p className="mt-2 max-w-2xl text-sm text-mist">
            Two desks: <span className="text-frost">WindAgents</span> (our registry agents — no{" "}
            <code className="font-mono text-cyan">cpk_</code> required) and optional{" "}
            <span className="text-frost">ClawPump.tech</span> (Partner launch with your own{" "}
            <code className="font-mono text-cyan">cpk_</code>).
          </p>
        </div>
      </div>

      <div
        className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-void/40 p-1.5"
        role="tablist"
        aria-label="Tokenize desks"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "windagents"}
          onClick={() => selectTab("windagents")}
          className={
            tab === "windagents"
              ? "btn-cyan rounded-xl px-5 py-2.5 text-sm"
              : "btn-ghost rounded-xl px-5 py-2.5 text-sm"
          }
        >
          WindAgents
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "clawpump"}
          onClick={() => selectTab("clawpump")}
          className={
            tab === "clawpump"
              ? "btn-cyan rounded-xl px-5 py-2.5 text-sm"
              : "btn-ghost rounded-xl px-5 py-2.5 text-sm"
          }
        >
          ClawPump.tech
        </button>
      </div>

      {tab === "windagents" ? (
        <div className="mt-8" role="tabpanel">
          <div className="mb-6 rounded-2xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-cyan">
            WindAgents desk — Bearer for local agents;{" "}
            <strong className="text-frost">Tokenize like ClawPump</strong> opens the same Confirm
            flow (your <code className="font-mono">cpk_</code> for real mints).{" "}
            <button
              type="button"
              onClick={() => selectTab("clawpump")}
              className="underline text-frost"
            >
              ClawPump.tech tab
            </button>{" "}
            remains for venues / MCP / fees.
          </div>
          <AgentsDeskPanel />
          <section className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/terminal"
              className="glass rounded-2xl px-5 py-4 transition hover:border-cyan/40"
            >
              <p className="font-display font-bold text-frost">Terminal / Swap</p>
              <p className="mt-1 text-xs text-mist">Real Jupiter quotes — server env for RPC.</p>
            </Link>
            <Link
              href="/skills"
              className="glass rounded-2xl px-5 py-4 transition hover:border-cyan/40"
            >
              <p className="font-display font-bold text-frost">Skills</p>
              <p className="mt-1 text-xs text-mist">Local + optional Partner catalogue.</p>
            </Link>
            <Link
              href="/integrations"
              className="glass rounded-2xl px-5 py-4 transition hover:border-cyan/40"
            >
              <p className="font-display font-bold text-frost">Integrations hub</p>
              <p className="mt-1 text-xs text-mist">Full capability map for registrants.</p>
            </Link>
          </section>
        </div>
      ) : (
        <div className="mt-8" role="tabpanel">
          <ClawPumpTechPanel />
        </div>
      )}
    </div>
  );
}

export default function TokenizeHubPage() {
  return (
    <Suspense
      fallback={
        <div>
          <h1 className="font-display text-3xl font-extrabold">Tokenize</h1>
          <p className="mt-4 font-mono text-xs text-mist">loading desks…</p>
        </div>
      }
    >
      <TokenizeHubInner />
    </Suspense>
  );
}
