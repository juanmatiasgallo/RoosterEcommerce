import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quienes somos",
  description: "La historia y la mision de Tienda 3D.",
};

// Contenido placeholder: todavia no hay copy real de la empresa en ningun
// lado del repo. Estructura y secciones ya armadas para no bloquear el
// header/footer que ya linkean aca; reemplazar el texto por el real cuando
// el owner lo defina.
// TODO: reemplazar historia, mision y valores por el contenido real.
const SECTIONS = [
  {
    title: "Nuestra historia",
    body: "Tienda 3D nacio para acercar la impresion 3D a quienes quieren tanto un producto ya listo como una pieza pensada a medida, sin vueltas.",
  },
  {
    title: "Que hacemos",
    body: "Combinamos un catalogo fijo con variantes de material, color y tamano, con la posibilidad de subir tu propio diseno y recibir una cotizacion antes de pagar nada.",
  },
  {
    title: "Nuestros valores",
    body: "Transparencia en los precios y los tiempos, calidad de impresion consistente, y atencion directa en cada pedido, sea de catalogo o a medida.",
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
