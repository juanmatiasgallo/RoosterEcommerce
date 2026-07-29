import { FileCheck2, PackageSearch, Truck, Wallet } from "lucide-react";

// Solo funcionalidad que ya existe de verdad en el sitio (nada de promesas
// tipo "garantia de por vida" que no podemos respaldar): catalogo con stock
// real por variante, cotizacion antes de pagar en pedido a medida, pagina de
// envios ya armada, y varios medios de pago (MP + manuales) ya wireados.
const VALUE_PROPS = [
  {
    icon: PackageSearch,
    title: "Stock real, sin sorpresas",
    description: "Cada variante del catalogo muestra el stock disponible antes de que compres.",
  },
  {
    icon: FileCheck2,
    title: "Cotizacion antes de pagar",
    description: "En un pedido a medida, te confirmamos el precio y recien ahi decidis si pagar.",
  },
  {
    icon: Truck,
    title: "Envios coordinados",
    description: "Te contactamos para coordinar entrega o retiro apenas se confirma el pago.",
  },
  {
    icon: Wallet,
    title: "Pagas como prefieras",
    description: "Mercado Pago, transferencia, o coordinamos el pago contra entrega.",
  },
];

export function ValueProps() {
  return (
    <section className="border-y border-neutral-200 py-10 dark:border-neutral-800">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {VALUE_PROPS.map((item) => (
          <div key={item.title} className="flex flex-col items-start gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/10 text-accent">
              <item.icon size={18} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h3 className="text-sm font-medium">{item.title}</h3>
            <p className="text-sm text-neutral-500">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
