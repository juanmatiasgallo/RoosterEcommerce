import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terminos y condiciones",
  description: "Terminos y condiciones de compra en Tienda 3D.",
};

// Contenido placeholder: todavia no hay texto legal real redactado. Se
// linkea desde el registro de cuenta (checkbox obligatorio) y el checkout,
// asi que la pagina tiene que existir aunque el contenido no sea el final.
// TODO: reemplazar por el texto legal real (o encargarselo a un abogado).
const SECTIONS = [
  {
    title: "Compras y pagos",
    body: "Los precios del catalogo incluyen impuestos. Con Mercado Pago, la compra se confirma cuando el pago es aprobado. Con un medio de pago manual (transferencia, Abitab, Red Pagos, Mi Dinero o Prex), la orden queda pendiente de confirmacion hasta que verificamos que el pago llego.",
  },
  {
    title: "Pedidos a medida",
    body: "Un pedido a medida no se cobra hasta que aceptes la cotizacion que te enviamos por email. Los tiempos de impresion son estimados y pueden variar segun la complejidad de la pieza.",
  },
  {
    title: "Envios",
    body: "Los costos y zonas de envio disponibles se muestran en /envios. Coordinamos el envio o retiro una vez confirmado el pago.",
  },
  {
    title: "Datos personales",
    body: "Usamos tu nombre, email y celular de contacto unicamente para gestionar tu compra y comunicarnos con vos sobre tu pedido. No compartimos tus datos con terceros salvo lo necesario para procesar el pago o el envio.",
  },
];

export default function TerminosYCondicionesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Terminos y condiciones</h1>
      <p className="mt-1 text-neutral-500">Lo basico de como funcionan las compras en Tienda 3D.</p>

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
