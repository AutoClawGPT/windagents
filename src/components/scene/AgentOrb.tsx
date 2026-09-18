"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

type Props = {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  speed?: number;
};

export function AgentOrb({
  position = [0, 0, 0],
  color = "#5eead4",
  scale = 1,
  speed = 1,
}: Props) {
  const core = useRef<THREE.Mesh>(null!);
  const halo = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed;
    if (core.current) {
      core.current.rotation.y = t * 0.6;
      core.current.rotation.x = Math.sin(t * 0.4) * 0.25;
    }
    if (halo.current) {
      const s = 1.35 + Math.sin(t * 2) * 0.08;
      halo.current.scale.setScalar(s);
    }
  });

  return (
    <Float speed={1.4 * speed} rotationIntensity={0.35} floatIntensity={0.6}>
      <group position={position} scale={scale}>
        <mesh ref={core}>
          <icosahedronGeometry args={[0.55, 1]} />
          <meshStandardMaterial
            color={color}
            roughness={0.18}
            metalness={0.72}
            emissive={color}
            emissiveIntensity={0.45}
          />
        </mesh>
        <mesh ref={halo}>
          <icosahedronGeometry args={[0.72, 0]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={0.28} />
        </mesh>
        <pointLight color={color} intensity={1.4} distance={6} />
      </group>
    </Float>
  );
}
