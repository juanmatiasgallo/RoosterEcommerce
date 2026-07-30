import Link from "next/link";
import type { CategoryTreeNode } from "@/lib/catalog/queries";
import { FacebookIcon, InstagramIcon } from "@/components/social-icons";

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
  instagramUrl,
  facebookUrl,
}: {
  categoryTree?: CategoryTreeNode[];
  contactEmail?: string | null;
  // contactPhone ya no se usa aca: el icono de WhatsApp se saco del footer
  // (task #123) porque el boton flotante (whatsapp-float-button.tsx) ya
  // cumple esa funcion en todo el sitio y tener los dos era redundante. Se
  // deja el prop en la firma para no romper el call site en layout.tsx.
  contactPhone?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}) {
  const hasSocialLinks = Boolean(instagramUrl || facebookUrl);

  return (
    <footer className="relative mt-16 overflow-hidden bg-neutral-950 text-white">
      {/* Transicion real de color (no solo un brillo encima) para el limite
          con lo que venga antes del footer: en modo claro el salto es
          grande (fondo crema -> footer casi negro), un glow chico no
          alcanza a disimular eso. Arranca en var(--background) -- el mismo
          color que ya tiene la pagina justo arriba del footer, sea cual sea
          el tema -- y termina en el neutral-950 real del footer, con varios
          stops intermedios (color-mix) para que la rampa sea perceptual y
          no bandeada, como paso con un degrade de 2 stops sobre un fondo
          oscuro solido (ver historial). En oscuro --background y
          neutral-950 ya son el mismo color, asi que ahi el degrade no hace
          nada (correcto: no hay salto que disimular). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-48"
        style={{
          background: [
            "linear-gradient(to bottom,",
            "var(--background) 0%,",
            "color-mix(in srgb, var(--background) 75%, var(--color-neutral-950) 25%) 25%,",
            "color-mix(in srgb, var(--background) 50%, var(--color-neutral-950) 50%) 50%,",
            "color-mix(in srgb, var(--background) 25%, var(--color-neutral-950) 75%) 75%,",
            "var(--color-neutral-950) 100%)",
          ].join(" "),
        }}
      />

      {/* Pulido (task #37): antes las 3 columnas (marca, nav, social) vivian
          en un solo flex-wrap justify-between, que en mobile quebraba de
          forma impredecible (a veces el nav quedaba solo en su propia linea,
          descentrado). Ahora es explicitamente columna-centrada en mobile y
          fila-justificada recien desde sm:, con la marca acompañada de una
          bajada de linea para que no quede como una palabra sola y suelta. */}
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div>
          <Link href="/" className="text-sm font-semibold">
            Tienda 3D
          </Link>
          <p className="mt-1 text-xs text-neutral-500">Impresion 3D y pedidos a medida.</p>
        </div>

        <div className="flex flex-col items-center gap-4 sm:items-end">
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-neutral-400 sm:justify-end">
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
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-1.5 px-4 py-4 text-center text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <span>© {new Date().getFullYear()} Tienda 3D. Todos los derechos reservados.</span>
          <span>{contactEmail || FALLBACK_EMAIL}</span>
        </div>
      </div>
    </footer>
  );
}
