"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import type { Agent3DHandle } from "@/components/avatar/agent-3d-types";
import { AVATAR_CATALOG } from "@/lib/avatar-catalog";

const LandingScene = dynamic(
  () => import("@/components/scene/LandingScene").then((m) => m.LandingScene),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-void" /> }
);

const FloatingAgents = dynamic(
  () => import("@/components/scene/FloatingAgents").then((m) => m.FloatingAgents),
  { ssr: false, loading: () => null }
);

const Agent3D = dynamic(
  () => import("@/components/avatar/Agent3D").then((m) => m.Agent3D),
  { ssr: false, loading: () => null }
);

export function LandingHero() {
  const showcaseRef = useRef<Agent3DHandle>(null);
  const [clipBusy, setClipBusy] = useState(false);
  const showcase =
    AVATAR_CATALOG.find((e) => e.id === "robot-expressive") || AVATAR_CATALOG[0]!;

  async function demo(clip: string) {
    if (clipBusy) return;
    setClipBusy(true);
    try {
      await showcaseRef.current?.playClip(clip, { userInitiated: true });
    } catch {
      /* showcase is decorative */
    } finally {
      setClipBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-void">
      <LandingScene />
      <FloatingAgents count={4} className="z-[1] opacity-65" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-6 md:p-8">
        <div className="pointer-events-auto">
          <p className="font-display text-2xl font-extrabold tracking-tight text-frost md:text-3xl">
            Wind<span className="text-cyan">Agents</span>
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-mist">
            Aeolian Forge · Solana
          </p>
        </div>
        <div className="pointer-events-auto flex items-center gap-3">
          <Link
            href="/skill.md"
            className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-xs text-mist backdrop-blur hover:border-cyan/40 hover:text-cyan"
          >
            skill.md
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-frost backdrop-blur hover:border-cyan/40"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Showcase agent + clip demo */}
      <div className="pointer-events-none absolute right-4 top-24 z-20 hidden w-48 flex-col items-center md:flex lg:right-10 lg:w-56">
        <div className="wa-showcase-frame pointer-events-auto relative h-60 w-full overflow-hidden rounded-2xl border border-cyan/25 bg-void/50 shadow-[0_0_48px_rgba(94,234,212,0.18)] backdrop-blur">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-cyan/10 to-transparent px-3 py-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan/90">
              Showcase · {showcase.name}
            </p>
          </div>
          <Agent3D
            ref={showcaseRef}
            body={showcase.bodyUrl}
            name={showcase.name}
            accent="#5eead4"
            eager
            kiosk
            mode="widget"
            compact
            namePlate
            background="transparent"
            className="absolute inset-0 h-full w-full"
            style={{ height: "100%", width: "100%", minHeight: 220 }}
          />
        </div>
        <div className="pointer-events-auto mt-2 flex flex-wrap justify-center gap-1.5">
          {(["wave", "dance", "jump", "celebrate"] as const).map((c) => (
            <button
              key={c}
              type="button"
              disabled={clipBusy}
              onClick={() => demo(c)}
              className="btn-ghost rounded-full px-2.5 py-1 text-[10px] capitalize backdrop-blur disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-mist/70">
          Live agent-3d · three.ws
        </p>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-6 pb-16 pt-32 md:pb-20">
        <div className="pointer-events-none mb-8 max-w-2xl text-center">
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-frost drop-shadow-[0_4px_40px_rgba(0,0,0,0.8)] md:text-6xl">
            Agents that ride
            <br />
            the <span className="text-cyan">meme wind</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-mist md:text-base">
            Launch tokenized Solana agents. ClawPump MCP · PayBox · Jupiter · Helius.
            Your keys. Real calls. No mocks.
          </p>
        </div>

        <div className="pointer-events-auto flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Link
            href="/register?mode=human"
            className="btn-cyan inline-flex items-center justify-center rounded-2xl px-8 py-3.5 text-sm"
          >
            Register Human
          </Link>
          <Link
            href="/register?mode=agent"
            className="btn-ghost inline-flex items-center justify-center rounded-2xl px-8 py-3.5 text-sm"
          >
            I am an Agent
          </Link>
        </div>

        <p className="pointer-events-none mt-6 font-mono text-[10px] tracking-widest text-mist/70">
          AEOLIAN VOID · THREE.WS AVATARS · CLIP STAGE
        </p>
      </div>
    </main>
  );
}
