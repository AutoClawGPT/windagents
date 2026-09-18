"use client";

import dynamic from "next/dynamic";
import { FLOATER_CATALOG_IDS, findCatalogById } from "@/lib/avatar-catalog";

const Agent3D = dynamic(
  () => import("@/components/avatar/Agent3D").then((m) => m.Agent3D),
  { ssr: false, loading: () => null }
);

type FloaterSpec = {
  bodyUrl: string;
  name: string;
  className: string;
  delayMs: number;
};

const FLOATERS: FloaterSpec[] = FLOATER_CATALOG_IDS.map((id, i) => {
  const entry = findCatalogById(id)!;
  return {
    bodyUrl: entry.bodyUrl,
    name: `Drift ${entry.name}`,
    className: `wa-floater wa-floater-${i + 1}`,
    delayMs: i * 900,
  };
});

type Props = {
  /** How many floaters (2–4). Default 4. */
  count?: number;
  /** Interactive only on dedicated vision surfaces */
  interactive?: boolean;
  className?: string;
};

/**
 * Drifting mini agent-3d widgets for landing / AppShell background.
 * Distinct public catalog bodies; low opacity; pointer-events-none unless interactive.
 */
export function FloatingAgents({ count = 4, interactive = false, className = "" }: Props) {
  const items = FLOATERS.slice(0, Math.max(2, Math.min(4, count)));

  return (
    <div
      className={`wa-floaters pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden={!interactive}
      data-interactive={interactive ? "1" : "0"}
    >
      {items.map((f) => (
        <div
          key={f.name}
          className={`${f.className} ${interactive ? "pointer-events-auto" : "pointer-events-none"}`}
          style={{ animationDelay: `${f.delayMs}ms` }}
        >
          <Agent3D
            body={f.bodyUrl}
            name={f.name}
            accent="#5eead4"
            eager={false}
            kiosk
            mode="widget"
            compact
            background="transparent"
            className="h-full w-full opacity-45"
            style={{ height: "100%", width: "100%", minHeight: 96 }}
          />
        </div>
      ))}
    </div>
  );
}

export default FloatingAgents;
