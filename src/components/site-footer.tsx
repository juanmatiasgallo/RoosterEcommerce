import Link from "next/link";
import type { CategoryTreeNode } from "@/lib/catalog/queries";
import { NewsletterForm } from "@/components/newsletter-form";
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from "@/components/social-icons";

// Placeholders: se usan solo si el admin todavia no cargo datos reales de
// contacto en /admin/configuracion (ver "Datos de la tienda").
const FALLBACK_EMAIL = "hola@tutienda.example";
const FALLBACK_PHONE = "+598 00 000 000";

export function SiteFooter({
  categoryTree,
  contactEmail,
  contactPhone,
  instagramUrl,
  facebookUrl,
}: {
  categoryTree: CategoryTreeNode[];
  contactEmail?: string | null;
  contactPhone?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}) {
  const whatsappHref = contactPhone ? `https://wa.me/${contactPhone.replace(/\D/g, "")}` : null;
  const hasSocialLinks = Boolean(instagramUrl || facebookUrl || whatsappHref);
  return (
    <footer className="mt-16 border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 border-b border-neutral-200 px-4 py-6 sm:flex-row sm:items-center dark:border-neutral-800">
        <div>
          <p className="font-semibold">Recibi promociones y novedades</p>
          <p className="text-sm text-neutral-500">Ofertas del catalogo y avisos de pedidos a medida, sin spam.</p>
        </div>
        <NewsletterForm />
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-semibold">Tienda 3D</p>
          <p className="mt-2 text-sm text-neutral-500">Catalogo de impresion 3D y pedidos a medida.</p>
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Categorias</p>
          <ul className="mt-2 flex flex-col gap-1">
            {categoryTree.slice(0, 5).map((category) => (
              <li key={category.id}>
                <Link href={`/?categoryId=${category.id}#catalogo`} className="text-sm text-neutral-500 hover:text-accent">
                  {category.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/pedido-a-medida" className="text-sm text-neutral-500 hover:text-accent">
                Pedido a medida
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Contacto</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-neutral-500">
            <li>{contactEmail || FALLBACK_EMAIL}</li>
            <li>{contactPhone || FALLBACK_PHONE}</li>
            <li>
              <Link href="/quienes-somos" className="hover:text-accent">
                Quienes somos
              </Link>
            </li>
            <li>
              <Link href="/envios" className="hover:text-accent">
                Envios
              </Link>
            </li>
            <li>
              <Link href="/ayuda" className="hover:text-accent">
                Ayuda
              </Link>
            </li>
          </ul>

          {hasSocialLinks && (
            <div className="mt-3 flex items-center gap-3 text-neutral-400">
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
          )}
        </div>
      </div>
    </footer>
  );
}
