"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function StormField({ count = 420 }: { count?: number }) {
  const points = useRef<THREE.Points>(null!);
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 14;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 10;
      arr[i * 3] = Math.cos(theta) * r;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = Math.sin(theta) * r;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return geo;
  }, [count]);

  useFrame((_, dt) => {
    if (!points.current) return;
    points.current.rotation.y += dt * 0.04;
    points.current.rotation.x += dt * 0.008;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        size={0.035}
        color="#5eead4"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function PressureRings() {
  const g = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.z += dt * 0.12;
  });
  return (
    <group ref={g} rotation={[Math.PI / 2.4, 0.2, 0]}>
      {[3.2, 4.6, 6.1].map((r, i) => (
        <mesh key={r}>
          <torusGeometry args={[r, 0.012 + i * 0.004, 16, 128]} />
          <meshBasicMaterial
            color={i === 1 ? "#fbbf24" : "#5eead4"}
            transparent
            opacity={0.22 - i * 0.04}
          />
        </mesh>
      ))}
    </group>
  );
}
