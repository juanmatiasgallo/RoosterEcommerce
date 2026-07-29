import Link from "next/link";
import type { CategoryTreeNode } from "@/lib/catalog/queries";
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from "@/components/social-icons";

// Placeholders: se usan solo si el admin todavia no cargo datos reales de
// contacto en /admin/configuracion (ver "Datos de la tienda").
const FALLBACK_EMAIL = "hola@tutienda.example";

// Footer "Oscuro minimal, una sola fila" (task #106/#113): mismo fondo
// oscuro que el Hero de la home, todo en una franja compacta en vez de
// columnas de links -- el owner lo eligio entre 3 propuestas por su onda
// mas "producto premium". No recibe categoryTree por prop porque esta
// version no lista categorias individuales (a diferencia del footer viejo
// de 3 columnas); se deja el prop para no romper la firma que ya usa
// SiteLayout, simplemente no se usa aca.
export function SiteFooter({
  contactEmail,
  contactPhone,
  instagramUrl,
  facebookUrl,
}: {
  categoryTree?: CategoryTreeNode[];
  contactEmail?: string | null;
  contactPhone?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}) {
  const whatsappHref = contactPhone ? `https://wa.me/${contactPhone.replace(/\D/g, "")}` : null;
  const hasSocialLinks = Boolean(instagramUrl || facebookUrl || whatsappHref);

  return (
    <footer className="mt-16 bg-neutral-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6">
        <Link href="/" className="text-sm font-semibold">
          Tienda 3D
        </Link>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-neutral-400">
          <Link href="/#catalogo" className="transition-colors hover:text-white">
            Catalogo
          </Link>
          <Link href="/pedido-a-medida" className="transition-colors hover:text-white">
            Pedido a medida
          </Link>
          <Link href="/envios" className="transition-colors hover:text-white">
            Envios
          </Link>
          <Link href="/ayuda" className="transition-colors hover:text-white">
            Ayuda
          </Link>
        </nav>

        {hasSocialLinks && (
          <div className="flex items-center gap-3 text-neutral-400">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="transition-colors hover:text-white"
              >
                <InstagramIcon size={16} />
              </a>
            )}
            {facebookUrl && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="transition-colors hover:text-white"
              >
                <FacebookIcon size={16} />
              </a>
            )}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="transition-colors hover:text-white"
              >
                <WhatsAppIcon size={16} />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-neutral-500">
          <span>© {new Date().getFullYear()} Tienda 3D. Impresion 3D y pedidos a medida.</span>
          <span>{contactEmail || FALLBACK_EMAIL}</span>
        </div>
      </div>
    </footer>
  );
}
