# Modelos 3D estaticos del sitio

Este folder NO se llena automaticamente -- los `.glb` de acá se copian a mano
una sola vez (son assets de diseño, no contenido subido por usuarios; eso va
a MinIO, ver `src/lib/storage`).

## astronaut.glb

Usado en el Hero de la home (`src/app/(site)/hero-astronaut-scene.tsx`, task
#151). Descarga:

https://raw.githubusercontent.com/google/model-viewer/master/packages/shared-assets/models/Astronaut.glb

Guardalo como `public/models/astronaut.glb` en este mismo folder. Licencia
CC-BY (Poly/Google) -- el credito ya esta puesto en el footer del sitio
(`site-footer.tsx`), no hace falta agregar nada mas.

Si el archivo no esta, `HeroAstronautScene` no rompe la pagina: el
ErrorBoundary hace que esa zona del Hero simplemente no muestre nada.
