import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ayuda",
  description: "Preguntas frecuentes y contacto por WhatsApp.",
};

// Mismo placeholder de telefono que ya usa site-footer.tsx (todavia no hay
// un numero real documentado en ningun lado del repo).
// TODO: reemplazar por el numero real de WhatsApp de la tienda.
const WHATSAPP_PLACEHOLDER_PHONE = "+598 00 000 000";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_PLACEHOLDER_PHONE.replace(/\D/g, "")}`;

const FAQS = [
  {
    question: "¿Cuanto tarda una impresion?",
    answer:
      "Depende del tamano y la complejidad de la pieza: los productos del catalogo indican stock disponible para envio inmediato, y en un pedido a medida te confirmamos el tiempo estimado junto con la cotizacion, antes de que pagues nada.",
  },
  {
    question: "¿Que metodos de pago aceptan?",
    answer: "Pagas online con Mercado Pago (tarjetas, dinero en cuenta y los demas medios que ofrece su Checkout).",
  },
  {
    question: "¿Hacen envios?",
    answer:
      "Si. Una vez confirmado el pago te contactamos para coordinar el envio o el retiro, segun corresponda a tu zona.",
  },
  {
    question: "¿Que materiales usan?",
    answer:
      "Trabajamos principalmente con PLA, PETG y Resina. Cada producto del catalogo muestra el material disponible por variante; para un pedido a medida te recomendamos el material mas indicado segun el uso que le vayas a dar a la pieza.",
  },
  {
    question: "¿Como funciona un pedido a medida?",
    answer:
      "Subis tu archivo .stl o .obj desde \"Pedido a medida\", te enviamos una cotizacion por email, y recien pagas si la aceptas — nunca te cobramos antes de que apruebes el precio.",
  },
];

export default function AyudaPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Ayuda</h1>
      <p className="mt-1 text-neutral-500">Preguntas frecuentes. Si no encontras lo que buscas, escribinos.</p>

      <a
        href={WHATSAPP_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
      >
        Escribinos por WhatsApp
      </a>

      <div className="mt-8 flex flex-col gap-6">
        {FAQS.map((faq) => (
          <div key={faq.question}>
            <h2 className="font-medium">{faq.question}</h2>
            <p className="mt-1 text-sm text-neutral-500">{faq.answer}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
