import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quiénes somos",
  description: "La historia y la misión de Tienda 3D.",
};

// Copy actualizado junto con el reposicionamiento de marca (tarea "salir
// del naranja + no ser solo un lugar de impresion"): agrega la seccion
// "Hacia donde vamos" con la vision de sumar diseno/programacion web -- a
// proposito NO se vende como servicio activo (el owner confirmo que todavia
// es a futuro), solo como direccion de marca. Sigue siendo un texto de
// arranque, no el copy final legal/institucional de la empresa. Acentos
// corregidos (#183): el texto de cara al usuario va con ortografia
// correcta, a diferencia de los comentarios de este archivo.
const SECTIONS = [
  {
    title: "Nuestra historia",
    body: "Tienda 3D arrancó como un taller de impresión, pero la idea siempre fue más grande: ser un estudio que diseña, fabrica y vende, no solo una máquina que imprime lo que le mandan.",
  },
  {
    title: "Qué hacemos",
    body: "Un catálogo propio con más de ocho rubros (hogar, tecnología, jardín, mascotas, regalos, herramientas y más) listo para comprar, más la posibilidad de subir tu propio diseño y recibir una cotización antes de pagar nada. Diseño, impresión y una tienda pensada como tal.",
  },
  {
    title: "Nuestros valores",
    body: "Transparencia en los precios y los tiempos, calidad de impresión consistente, y atención directa en cada pedido, sea de catálogo o a medida.",
  },
  {
    title: "Hacia dónde vamos",
    body: "El siguiente paso es sumar diseño y programación web a lo que ya hacemos, para acompañar proyectos completos y no solo la parte impresa. Todavía estamos construyendo esa pata -- por ahora seguimos enfocados en dar la mejor experiencia de catálogo y pedidos a medida.",
  },
];

export default function QuienesSomosPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Quiénes somos</h1>
      <p className="mt-1 text-neutral-500">
        Conocé un poco más sobre Tienda 3D y cómo trabajamos.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="font-medium">{section.title}</h2>
            <p className="mt-1 text-sm text-neutral-500">{section.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
