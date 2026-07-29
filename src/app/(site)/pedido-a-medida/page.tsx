import { Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { CUSTOM_ORDER_ALLOWED_EXTENSIONS } from "@/lib/custom-orders/schema";
import { PrinterGridBackground } from "@/components/printer-grid-background";
import { PedidoAMedidaWizard } from "./pedido-a-medida-wizard";

// Ya no requiere sesion antes de renderizar (ver proxy.ts, task #111): un
// visitante sin cuenta puede entrar y ver la pagina; recien el wizard le
// pide identificarse (login o alta rapida con telefono de contacto) en su
// primer paso, antes de poder subir el archivo -- mismo patron que
// /checkout. Como ahora depende de la sesion actual (auth()), necesita
// force-dynamic: sin esto, el build de Docker en EasyPanel intenta
// pre-renderizarla en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

export default async function PedidoAMedidaPage() {
  const session = await auth();
  const maxSizeMb = Number(process.env.UPLOADS_MAX_SIZE_MB ?? 20);

  return (
    <main>
      {/* Full-bleed, mismo truco que el Hero de la home: se sale del
          contenedor centrado para dar mas presencia visual a esta pagina,
          que ahora es la puerta de entrada tanto para clientes como para
          gente sin cuenta todavia. */}
      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden bg-neutral-100 px-6 py-14 text-center text-neutral-900 sm:py-20 dark:bg-neutral-950 dark:text-white">
        <PrinterGridBackground />

        <div className="relative mx-auto max-w-xl">
          <div className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles size={13} />
            Cotizacion antes de pagar
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Pedi tu pieza a medida</h1>
          <p className="mx-auto mt-3 max-w-md text-balance text-neutral-600 dark:text-neutral-300">
            Subi tu archivo .stl o .obj y nuestro equipo de diseno te manda una cotizacion antes de cobrarte nada.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <PedidoAMedidaWizard
          startedLoggedIn={Boolean(session)}
          maxSizeMb={maxSizeMb}
          allowedExtensions={CUSTOM_ORDER_ALLOWED_EXTENSIONS}
        />
      </div>
    </main>
  );
}
