# Modelos 3D estaticos del sitio

Este folder NO se llena automaticamente -- los `.glb` de acá se copian a mano
una sola vez (son assets de diseño, no contenido subido por usuarios; eso va
a MinIO, ver `src/lib/storage`).

## astronaut.glb

Usado en el Hero de la home (`src/app/(site)/hero-astronaut-scene.tsx`, task
#151). Modelo CC0/dominio publico elegido por el owner (reemplaza al modelo
"Astronaut" de Poly/Google usado en un primer intento, que era CC-BY y
llevaba credito en el footer -- ya no aplica, este es CC0, sin credito
requerido).

Comprimido con gltf-transform (task #154): 28.6MB -> 12.4MB via
`optimize --simplify --texture-compress false` (simplificacion de geometria +
EXT_meshopt_compression; el texture-compress quedo en false porque sharp/vips
rompia con "colourspace: parameter space not set" en esta maquina -- las 3
texturas PNG originales, ~12.2MB, quedaron sin tocar). Por el
EXT_meshopt_compression, `hero-astronaut-scene.tsx` NO usa el `useGLTF` de
drei (no trae el decoder wireado) -- usa `useLoader(GLTFLoader, ...)` a mano
con `setMeshoptDecoder`. Si en algun momento se reemplaza este archivo por
uno sin comprimir con meshopt, ese wiring deja de ser necesario pero no
rompe nada dejarlo.

Si el archivo no esta, `HeroAstronautScene` no rompe la pagina: el
ErrorBoundary hace que esa zona del Hero simplemente no muestre nada.
