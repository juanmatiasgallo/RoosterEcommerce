"use client";

import { Component, Suspense, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Center } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import * as THREE from "three";
import type { Group } from "three";

// Pieza 3D del Hero (task #196/#197): el owner subio un .obj propio para que
// "sume a la experiencia" del Hero, ubicado a un lado del texto (no mas al
// centro -- ver hero.tsx). El archivo (public/models/hero-object.obj) viene
// decimado a mano (ver comentario en el .obj) y sin material ni normales --
// no se subio textura junto con el modelo, asi que aca en runtime se le
// arma un PBR neutro con un tinte del acento de marca (`--color-accent`,
// hoy #3f7396) para que quede "prolijo" e integrado con el tema oscuro por
// defecto, en vez de aparecer gris/negro sin iluminacion.
//
// Deliberadamente MAS liviano que el visor de pedido-a-medida
// (model-3d-viewer.tsx): sin <Stage> (trae un environment map HDRI que se
// descarga de un CDN), sin sombras, sin OrbitControls (no es interactivo,
// es una pieza decorativa que gira sola) y con dpr limitado. Esto repite a
// proposito el criterio que ya llevo a sacar la pieza three.js anterior
// (hero-blueprint-scene.tsx, un icosaedro) y la version en CSS
// (extruded-3d-text.tsx): la prioridad es no repetir el problema de
// performance por el que se saco el astronauta original.

const ACCENT = "#3f7396";
const ACCENT_HOVER = "#2c5773";

function HeroObjectMesh() {
  const rawObject = useLoader(OBJLoader, "/models/hero-object.obj");
  const groupRef = useRef<Group>(null);

  // El .obj no trae normales (ver comentario en el archivo) -- sin
  // computeVertexNormals() el material PBR no tiene de donde sacar la
  // iluminacion y la pieza se ve chata o directamente negra segun el
  // angulo. Se corre una sola vez por objeto cargado (useMemo, no en cada
  // render) y se clona el material default de OBJLoader por uno propio
  // tenido con el acento de marca.
  const object = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: "#dde4e9",
      metalness: 0.42,
      roughness: 0.36,
      emissive: ACCENT_HOVER,
      emissiveIntensity: 0.14,
    });

    rawObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.computeVertexNormals();
        child.material = material;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    return rawObject;
  }, [rawObject]);

  // Giro lento y continuo + un leve "flote" vertical -- da sensacion de
  // pieza viva sin distraer del texto ni pedir interaccion del usuario
  // (a diferencia del visor de pedido a medida, que si se arrastra).
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.18;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.05;
  });

  return (
    <group ref={groupRef}>
      <Center>
        <primitive object={object} />
      </Center>
    </group>
  );
}

// Suspense fallback vacio: mientras carga el .obj (792KB, deberia ser
// rapido) no hay nada que mostrar, el espacio ya lo reserva el contenedor
// en hero.tsx.
function SceneFallback() {
  return null;
}

// Si el .obj falla en cargar (ej. bloqueado por algun proxy/extension del
// navegador) la pieza es puramente decorativa -- no tiene sentido mostrar
// un mensaje de error como en el visor de pedido a medida, mejor no
// mostrar nada y que el Hero siga andando con solo texto.
class HeroObjectErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export function HeroObjectScene() {
  return (
    <HeroObjectErrorBoundary>
      <Canvas
        camera={{ position: [0, 0.1, 2.6], fov: 38 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={<SceneFallback />}>
          <HeroObjectMesh />
        </Suspense>
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 5, 3]} intensity={1.3} />
        {/* Luz de borde tenida con el acento de marca -- el clasico "rim
            light" de foto de producto, para que la silueta se lea contra el
            fondo oscuro y la pieza quede integrada con la paleta del sitio
            en vez de ser un objeto gris generico. */}
        <pointLight position={[-3, -1, -2.5]} intensity={3.5} color={ACCENT} />
      </Canvas>
    </HeroObjectErrorBoundary>
  );
}
