"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MathUtils, type Group, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial } from "three";

// Pieza que reemplaza al astronauta decorativo (#167 lo saco, #176 pone esto
// en su lugar): "diseño que se materializa en objeto impreso" -- el mismo
// icosaedro facetado (geometria nativa de three.js, cero descarga de
// modelo externo) va y viene entre un estado "plano tecnico" (wireframe
// celeste, el blueprint) y un estado "objeto real" (solido con acabado tipo
// plastico impreso, color de marca) via crossfade de opacidad -- misma
// tecnica que ya usa la palabra "3D" del Hero para rotar materiales (ver
// extruded-3d-text.tsx), asi que no es una idea nueva en el codigo.
//
// Deliberadamente SIN GLTFLoader/meshopt/Environment/OrbitControls/
// ContactShadows como tenia el astronauta -- esos componentes eran el grueso
// de los ~245KB comprimidos identificados como la causa principal de
// lentitud de la home (investigacion #166). Solo 2 luces basicas en vez de
// un environment map HDR, y sin controles de camara (pieza decorativa, no
// interactiva -- igual que el astronauta tampoco se pensaba para que el
// visitante la arrastre en el hero, pero aca directamente no se paga el
// costo de bundle de @react-three/drei's OrbitControls).
const CYCLE_SECONDS = 3.4;

function BlueprintObject() {
  const groupRef = useRef<Group>(null);
  const wireRef = useRef<Mesh>(null);
  const solidRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.32;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.22) * 0.18;
    }

    // Onda triangular 0->1->0 cada CYCLE_SECONDS*2: crossfade entre wireframe
    // y solido. Nunca llega a 0 total (clamp a 0.12) para que la silueta no
    // desaparezca por completo a mitad de transicion.
    const phase = (state.clock.elapsedTime % (CYCLE_SECONDS * 2)) / CYCLE_SECONDS;
    const wireStrength = MathUtils.clamp(phase < 1 ? 1 - phase : phase - 1, 0.12, 1);

    if (wireRef.current) {
      (wireRef.current.material as MeshBasicMaterial).opacity = wireStrength;
    }
    if (solidRef.current) {
      (solidRef.current.material as MeshStandardMaterial).opacity = MathUtils.clamp(1 - wireStrength, 0.12, 1);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshBasicMaterial color="#a5b4fc" wireframe transparent opacity={1} />
      </mesh>
      {/* Escala levemente menor que el wireframe: evita el z-fighting de dos
          mallas identicas exactamente superpuestas. */}
      <mesh ref={solidRef} scale={0.985}>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshStandardMaterial color="#4338ca" roughness={0.35} metalness={0.2} transparent opacity={0} />
      </mesh>
    </group>
  );
}

export function HeroBlueprintScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.4], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} color="#c7d2fe" />
      <directionalLight position={[-4, -2, -3]} intensity={0.35} color="#4338ca" />
      <Suspense fallback={null}>
        <BlueprintObject />
      </Suspense>
    </Canvas>
  );
}
