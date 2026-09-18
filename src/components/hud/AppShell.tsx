"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { OrbitalDock } from "./OrbitalDock";
import { AppBackdrop } from "@/components/scene/AppBackdrop";
import { getStoredUser } from "@/lib/client-auth";
import { useEffect, useState } from "react";

const FloatingAgents = dynamic(
  () => import("@/components/scene/FloatingAgents").then((m) => m.FloatingAgents),
  { ssr: false, loading: () => null }
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [label, setLabel] = useState<string>("guest");
  useEffect(() => {
    const u = getStoredUser();
    setLabel(u?.displayName || u?.email || u?.type || "session");
  }, []);

  return (
    <div className="relative min-h-screen pb-28">
      <AppBackdrop />
      <FloatingAgents count={2} className="fixed inset-0 z-0 opacity-30" />
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-void/70 px-5 py-3 backdrop-blur-md">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          Wind<span className="text-cyan">Agents</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-mist sm:inline">
            {label}
          </span>
          <Link
            href="/skill.md"
            className="font-mono text-[10px] text-mist hover:text-cyan"
          >
            skill.md
          </Link>
        </div>
      </header>
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 md:px-6">{children}</div>
      <OrbitalDock />
    </div>
  );
}
