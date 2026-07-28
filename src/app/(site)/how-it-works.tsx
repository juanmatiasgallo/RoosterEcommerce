import { MessageSquareText, PackageCheck, Upload } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
    title: "Subi tu archivo",
    description: "Mandanos tu diseno en .stl o .obj, con las especificaciones que necesites.",
  },
  {
    icon: MessageSquareText,
    title: "Te cotizamos",
    description: "Te enviamos un precio antes de cobrarte nada.",
  },
  {
    icon: PackageCheck,
    title: "Lo imprimimos y te lo enviamos",
    description: "Confirmas el pago y arrancamos a imprimir tu pieza.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-10">
      <h2 className="text-center text-2xl font-semibold">Como funciona el pedido a medida</h2>
      <div className="mt-8 grid gap-8 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <div key={step.title} className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
              <step.icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <p className="mt-3 text-xs font-medium text-neutral-400">Paso {index + 1}</p>
            <h3 className="mt-1 font-medium">{step.title}</h3>
            <p className="mt-1 text-sm text-neutral-500">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
