import type { Metadata } from "next";
import { getPublicStoreContact } from "@/lib/settings/actions";

export const metadata: Metadata = {
  title: "Ayuda",
  description: "Preguntas frecuentes y contacto por WhatsApp.",
};

// Consulta la DB (telefono de contacto real): sin esto, el build de Docker
// en EasyPanel pre-renderiza esta pagina en build time y falla (no tiene
// red hacia la base ahi) — mismo criterio que el resto de paginas publicas.
export const dynamic = "force-dynamic";

// Mismo placeholder que site-footer.tsx: se usa solo si el admin todavia
// no cargo un telefono real en /admin/configuracion.
const WHATSAPP_PLACEHOLDER_PHONE = "+598 00 000 000";

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

export default async function AyudaPage() {
  const contact = await getPublicStoreContact();
  const phone = contact.contactPhone || WHATSAPP_PLACEHOLDER_PHONE;
  const whatsappHref = `https://wa.me/${phone.replace(/\D/g, "")}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Ayuda</h1>
      <p className="mt-1 text-neutral-500">Preguntas frecuentes. Si no encontras lo que buscas, escribinos.</p>

      <a
        href={whatsappHref}
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
