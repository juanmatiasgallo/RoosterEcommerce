import { NewsletterForm } from "@/components/newsletter-form";
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from "@/components/social-icons";

// Bloque de "seguinos + suscribite" para el momento en que el cliente
// termina de comprar (pedido #110): el checkout ya tiene el footer global
// con esto mismo, pero el owner pidio que aparezca puntualmente en el
// proceso de compra (la pantalla de "listo, tu pedido esta en camino"),
// no solo mas abajo en el footer generico. Se usa tanto en el resultado de
// pago manual del wizard como en /checkout/exito (pago con Mercado Pago).
export function PostPurchaseFollow({
  instagramUrl,
  facebookUrl,
  whatsappHref,
}: {
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  whatsappHref?: string | null;
}) {
  const hasSocialLinks = Boolean(instagramUrl || facebookUrl || whatsappHref);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
      <div>
        <p className="text-sm font-medium">Suscribite para no perderte ofertas</p>
        <div className="mt-2">
          <NewsletterForm />
        </div>
      </div>

      {hasSocialLinks && (
        <div className="flex items-center gap-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <span className="text-xs text-neutral-500">Segui nuestro trabajo:</span>
          <div className="flex items-center gap-3 text-neutral-500">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="transition-colors hover:text-accent"
              >
                <InstagramIcon size={18} />
              </a>
            )}
            {facebookUrl && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="transition-colors hover:text-accent"
              >
                <FacebookIcon size={18} />
              </a>
            )}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="transition-colors hover:text-accent"
              >
                <WhatsAppIcon size={18} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
