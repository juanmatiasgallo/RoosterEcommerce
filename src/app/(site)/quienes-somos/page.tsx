import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quienes somos",
  description: "La historia y la mision de Tienda 3D.",
};

// Copy actualizado junto con el reposicionamiento de marca (tarea "salir
// del naranja + no ser solo un lugar de impresion"): agrega la seccion
// "Hacia donde vamos" con la vision de sumar diseno/programacion web -- a
// proposito NO se vende como servicio activo (el owner confirmo que todavia
// es a futuro), solo como direccion de marca. Sigue siendo un texto de
// arranque, no el copy final legal/institucional de la empresa.
const SECTIONS = [
  {
    title: "Nuestra historia",
    body: "Tienda 3D arranco como un taller de impresion, pero la idea siempre fue mas grande: ser un estudio que disena, fabrica y vende, no solo una maquina que imprime lo que le mandan.",
  },
  {
    title: "Que hacemos",
    body: "Un catalogo propio con mas de ocho rubros (hogar, tecnologia, jardin, mascotas, regalos, herramientas y mas) listo para comprar, mas la posibilidad de subir tu propio diseno y recibir una cotizacion antes de pagar nada. Diseno, impresion y una tienda pensada como tal.",
  },
  {
    title: "Nuestros valores",
    body: "Transparencia en los precios y los tiempos, calidad de impresion consistente, y atencion directa en cada pedido, sea de catalogo o a medida.",
  },
  {
    title: "Hacia donde vamos",
    body: "El siguiente paso es sumar diseno y programacion web a lo que ya hacemos, para acompanar proyectos completos y no solo la parte impresa. Todavia estamos construyendo esa pata -- por ahora seguimos enfocados en dar la mejor experiencia de catalogo y pedidos a medida.",
  },
];

export default function QuienesSomosPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Quienes somos</h1>
      <p className="mt-1 text-neutral-500">
        Conoce un poco mas sobre Tienda 3D y como trabajamos.
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
