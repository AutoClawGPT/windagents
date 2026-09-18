"use client";

import { Canvas } from "@react-three/fiber";
import { AgentOrb } from "@/components/scene/AgentOrb";

/** R3F fallback when three.ws agent-3d CDN fails to load. */
export function OrbFallback({
  color = "#5eead4",
  label,
  compact = false,
}: {
  color?: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative h-full w-full ${compact ? "min-h-[11rem]" : "min-h-[200px]"}`}
      data-orb-fallback={compact ? "compact" : "full"}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 3.2], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%", minHeight: compact ? 176 : 200 }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} color="#e2e8f0" />
        <AgentOrb color={color} scale={compact ? 1.15 : 1.35} />
      </Canvas>
      {label && (
        <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center font-mono text-[9px] text-mist">
          {label}
        </p>
      )}
    </div>
  );
}
