"use client";

/**
 * Cooler Aeolian void backdrop — CSS aurora + drifting orbs (no heavy R3F).
 * pointer-events-none; keep FPS friendly.
 */
export function AppBackdrop() {
  return (
    <div
      className="wa-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="wa-aurora" />
      <div className="wa-aurora-shear" />
      <div className="wa-horizon" />
      <div className="wa-grid" />
      <div className="wa-orb wa-orb-a" />
      <div className="wa-orb wa-orb-b" />
      <div className="wa-orb wa-orb-c" />
      <div className="wa-orb wa-orb-d" />
      <div className="wa-particles">
        {Array.from({ length: 22 }).map((_, i) => (
          <span key={i} className="wa-particle" style={{ ["--i" as string]: i }} />
        ))}
      </div>
      <div className="wa-vignette" />
    </div>
  );
}
