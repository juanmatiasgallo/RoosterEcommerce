"use client";

import { Component, Suspense, useState, type ReactNode } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Stage } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { AlertTriangle, RotateCw } from "lucide-react";

export type Model3DExtension = "stl" | "obj";

// Los unicos dos formatos que acepta /pedido-a-medida (CUSTOM_ORDER_ALLOWED_EXTENSIONS,
// ver lib/custom-orders/schema.ts) -- si el archivo no es ninguno de los dos,
// no hay para que intentar armar un visor.
export function getModel3DExtension(filename: string): Model3DExtension | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext === "stl" || ext === "obj" ? ext : null;
}

function StlMesh({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url);
  // STL solo trae geometria, nunca color/material -- se le pone un gris
  // neutro tipo filamento PLA en vez de dejarlo negro (default de Three
  // cuando no hay material).
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#d4d4d8" roughness={0.45} metalness={0.05} />
    </mesh>
  );
}

function ObjMesh({ url }: { url: string }) {
  const object = useLoader(OBJLoader, url);
  return <primitive object={object} />;
}

// Suspense fallback: un frame vacio en vez de un spinner HTML superpuesto,
// para no pelear con el <Stage> (que recalcula la camara una vez que el
// modelo real esta montado).
function SceneFallback() {
  return null;
}

class Model3DErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-neutral-500">
          <AlertTriangle size={22} className="text-amber-500" />
          No se pudo cargar la vista previa 3D. El archivo sigue disponible para descargar.
        </div>
      );
    }
    return this.props.children;
  }
}

// Visor generico para los archivos STL/OBJ subidos en pedido a medida (task
// #148): rotar arrastrando, zoom con scroll/pellizco (OrbitControls), mas
// un boton de auto-rotacion. <Stage> de drei centra y escala la camara segun
// el bounding box real del modelo (los STL vienen en unidades y tamanos
// arbitrarios seteados por quien los diseño) y arma una iluminacion pareja
// de "estudio" sin tener que calcular luces a mano.
export function Model3DViewer({ url, extension }: { url: string; extension: Model3DExtension }) {
  const [autoRotate, setAutoRotate] = useState(true);

  return (
    <Model3DErrorBoundary>
      <div className="relative h-full w-full">
        <Canvas camera={{ position: [3, 2, 3], fov: 45 }} shadows dpr={[1, 2]}>
          <Suspense fallback={<SceneFallback />}>
            <Stage environment="city" intensity={0.5} shadows="contact" adjustCamera>
              {extension === "stl" ? <StlMesh url={url} /> : <ObjMesh url={url} />}
            </Stage>
          </Suspense>
          <OrbitControls autoRotate={autoRotate} autoRotateSpeed={2.2} enablePan={false} makeDefault />
        </Canvas>

        <button
          type="button"
          onClick={() => setAutoRotate((v) => !v)}
          className={`absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors ${
            autoRotate
              ? "bg-accent text-accent-foreground"
              : "bg-black/40 text-white hover:bg-black/60"
          }`}
        >
          <RotateCw size={13} className={autoRotate ? "animate-spin [animation-duration:2.5s]" : ""} />
          Auto-rotar
        </button>
      </div>
    </Model3DErrorBoundary>
  );
}
