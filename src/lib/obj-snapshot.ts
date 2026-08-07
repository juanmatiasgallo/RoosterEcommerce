import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

// Convierte un .obj a un PNG cuadrado, del lado del navegador, para usarlo
// como icono de marca (task #192/#201). Decision del owner: el header
// SIEMPRE muestra una imagen estatica (nunca un objeto 3D en vivo, a
// diferencia del Hero) -- el header aparece en todas las paginas del sitio,
// asi que renderizar three.js ahi en cada carga seria pagar el costo de
// performance que ya se evito varias veces este proyecto (ver
// hero-object-scene.tsx). Esta funcion resuelve la conversion UNA sola vez,
// en el momento de subir el archivo, sin depender de ninguna herramienta
// de servidor (mismo motivo que la decimacion del .obj del Hero: no hay
// libreria de renderizado 3D headless instalada ni fue posible instalar una
// -- el navegador del admin ya tiene three.js cargado igual que el resto
// del sitio, asi que lo usamos a el en vez de sumar infraestructura nueva).
//
// Mismo material/iluminacion "prolijo" que hero-object-scene.tsx (base
// clara + rim light con el acento de marca) para que el icono resultante
// quede coherente con el resto del sitio en vez de un render generico.

const SIZE = 512;
const ACCENT = "#3f7396";
const ACCENT_HOVER = "#2c5773";
const FOV_DEGREES = 38;

export async function renderObjToIconPng(file: File): Promise<File> {
  const text = await file.text();
  const object = new OBJLoader().parse(text);

  const material = new THREE.MeshStandardMaterial({
    color: "#dde4e9",
    metalness: 0.42,
    roughness: 0.36,
    emissive: ACCENT_HOVER,
    emissiveIntensity: 0.14,
  });

  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // El .obj puede no traer normales (mismo caso que public/models/
      // hero-object.obj) -- sin esto el material PBR se ve chato/negro.
      child.geometry.computeVertexNormals();
      child.material = material;
    }
  });

  // Centrar en el origen a mano (sin <Center> de drei, esto corre fuera de
  // React/r3f) para que el objeto quede encuadrado sin importar donde haya
  // quedado su geometria original.
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  object.position.sub(center);

  const scene = new THREE.Scene();
  scene.add(object);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
  keyLight.position.set(4, 5, 3);
  scene.add(keyLight);
  // Rim light tenida con el acento de marca -- mismo criterio que
  // hero-object-scene.tsx, para que el icono resultante se sienta parte de
  // la misma familia visual que la pieza del Hero.
  const rimLight = new THREE.PointLight(ACCENT, 3.5);
  rimLight.position.set(-3, -1, -2.5);
  scene.add(rimLight);

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const camera = new THREE.PerspectiveCamera(FOV_DEGREES, 1, 0.01, 100);
  // Distancia que encuadra la dimension mas grande del objeto con un 60% de
  // margen alrededor, para que el icono no quede "pegado" a los bordes.
  const distance = (maxDim / 2 / Math.tan((FOV_DEGREES * Math.PI) / 360)) * 1.6;
  camera.position.set(0, maxDim * 0.08, distance);
  camera.lookAt(0, 0, 0);

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  // preserveDrawingBuffer: sin esto, el buffer se puede limpiar antes de
  // que canvas.toBlob() alcance a leerlo (WebGL hace swap de buffers
  // despues de cada render por default).
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE, false);
  renderer.render(scene, camera);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("No se pudo generar la imagen del icono."));
    }, "image/png");
  });

  renderer.dispose();
  material.dispose();

  return new File([blob], "icon.png", { type: "image/png" });
}
