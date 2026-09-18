"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Bot,
  Terminal,
  Sparkles,
  Wallet,
  Settings,
  Box,
  Store,
  Radio,
  Users,
  Trophy,
  Target,
  Gift,
  BookUser,
  PieChart,
  BarChart3,
  MoreHorizontal,
  Wrench,
  Rocket,
  Plug,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY = [
  { href: "/home", label: "Forge", icon: Home },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/terminal", label: "Swap", icon: Terminal },
  { href: "/marketplace", label: "Market", icon: Store },
  { href: "/signals", label: "Signals", icon: Radio },
  { href: "/skills", label: "Skills", icon: Sparkles },
  { href: "/tokenize", label: "Tokenize", icon: Rocket },
  { href: "/wallet", label: "Wallet", icon: Wallet },
];

const MORE = [
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/tokenize?tab=windagents", label: "Agents desk", icon: Bot },
  { href: "/tokenize?tab=clawpump", label: "ClawPump launch", icon: Rocket },
  { href: "/community", label: "Community", icon: Users },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/bounties", label: "Bounties", icon: Target },
  { href: "/rewards", label: "Rewards", icon: Gift },
  { href: "/registry", label: "Registry", icon: BookUser },
  { href: "/portfolio", label: "Portfolio", icon: PieChart },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/paybox", label: "PayBox", icon: Box },
  { href: "/x402", label: "x402", icon: Coins },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function OrbitalDock() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = MORE.some(
    (l) => path === l.href || path.startsWith(l.href + "/")
  );

  return (
    <nav className="orbital-dock fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-0.5 rounded-full px-1.5 py-2 md:gap-1 md:px-2">
      {PRIMARY.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "group flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 transition md:px-2.5",
              active
                ? "bg-cyan/15 text-cyan shadow-[0_0_20px_rgba(94,234,212,0.2)]"
                : "text-mist hover:bg-white/5 hover:text-frost"
            )}
          >
            <Icon className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.75} />
            <span className="hidden font-mono text-[8px] tracking-wide lg:block">
              {label}
            </span>
          </Link>
        );
      })}

      <div className="relative">
        <button
          type="button"
          title="More"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 transition md:px-2.5",
            moreActive || open
              ? "bg-amber/15 text-amber"
              : "text-mist hover:bg-white/5 hover:text-frost"
          )}
        >
          <MoreHorizontal className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.75} />
          <span className="hidden font-mono text-[8px] tracking-wide lg:block">More</span>
        </button>
        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <div className="glass-strong absolute bottom-14 right-0 z-50 grid w-56 grid-cols-2 gap-1 rounded-2xl p-2 shadow-2xl">
              {MORE.map(({ href, label, icon: Icon }) => {
                const active = path === href || path.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs transition",
                      active
                        ? "bg-cyan/15 text-cyan"
                        : "text-mist hover:bg-white/5 hover:text-frost"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
