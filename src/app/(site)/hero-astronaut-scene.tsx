"use client";

import { Component, Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Float, OrbitControls, useGLTF } from "@react-three/drei";

// Astronauta real en 3D (task #151): complementa el relieve CSS de la
// palabra "3D" en el heading (Extruded3DText, task #61/#98) con una pieza
// que es de verdad tridimensional -- luz de estudio (Environment) sobre el
// visor casco/traje da la sensacion de textura realista que pedia la tarea,
// en vez de una silueta plana.
//
// Modelo: "Astronaut" de Poly (Google), licencia CC-BY -- ver credito en
// SiteFooter. Se espera en public/models/astronaut.glb (no se commitea
// automaticamente, hay que copiarlo ahi a mano una sola vez).
const MODEL_URL = "/models/astronaut.glb";

function AstronautModel() {
  const { scene } = useGLTF(MODEL_URL);
  return (
    <Float speed={1.3} rotationIntensity={0.3} floatIntensity={0.7}>
      <primitive object={scene} scale={1.15} position={[0, -1.15, 0]} />
    </Float>
  );
}

useGLTF.preload(MODEL_URL);

// El .glb es un asset externo que el owner copia a mano (ver comentario
// arriba) -- si todavia no esta, o el fetch falla por cualquier otro motivo,
// esto es decorativo del Hero, no una feature critica: mejor no mostrar nada
// que romper la pantalla de inicio con un error de React.
class SceneErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// Solo desktop (lg+): en mobile ya hay bastante animacion en el Hero (grilla,
// texto letra por letra) y sumar un canvas WebGL ahi es peso/distraccion
// extra sin mucho espacio real para lucirlo -- también evita agregar carga a
// la auditoria de responsive todavia pendiente (task #145).
export function HeroAstronautScene() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 hidden w-[26rem] lg:block xl:w-[34rem]"
    >
      <SceneErrorBoundary>
        <Suspense fallback={null}>
          <Canvas
            camera={{ position: [0, 0.3, 4.4], fov: 38 }}
            dpr={[1, 2]}
            gl={{ alpha: true }}
            className="pointer-events-auto"
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[3, 4, 2]} intensity={1.3} />
            <Environment preset="city" />
            <AstronautModel />
            <ContactShadows position={[0, -1.65, 0]} opacity={0.3} blur={2.6} far={2.2} />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate
              autoRotateSpeed={0.6}
              minPolarAngle={Math.PI / 2.3}
              maxPolarAngle={Math.PI / 1.8}
            />
          </Canvas>
        </Suspense>
      </SceneErrorBoundary>
    </div>
  );
}
