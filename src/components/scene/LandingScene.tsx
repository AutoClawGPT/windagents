"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { AgentOrb } from "./AgentOrb";
import { StormField, PressureRings } from "./StormField";

function Experience() {
  return (
    <>
      <color attach="background" args={["#030508"]} />
      <fog attach="fog" args={["#030508", 8, 28]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 2]} intensity={1.1} color="#e2e8f0" />
      <directionalLight position={[-5, -2, -4]} intensity={0.55} color="#fbbf24" />
      <StormField />
      <PressureRings />
      <AgentOrb position={[0, 0.4, 0]} color="#5eead4" scale={1.15} />
      <AgentOrb position={[-3.2, 1.2, -2]} color="#fbbf24" scale={0.55} speed={1.3} />
      <AgentOrb position={[3.4, -0.6, -1.5]} color="#fb7185" scale={0.48} speed={0.85} />
      <AgentOrb position={[1.8, 2.1, -3.2]} color="#67e8f9" scale={0.35} speed={1.6} />
      <AgentOrb position={[-2.4, -1.4, -2.8]} color="#a7f3d0" scale={0.4} speed={1.1} />
    </>
  );
}

export function LandingScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.2, 8.5], fov: 42 }}
        gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>
    </div>
  );
}
