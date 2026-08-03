import Link from "next/link";
import type { CategoryTreeNode } from "@/lib/catalog/queries";
import { FacebookIcon, InstagramIcon } from "@/components/social-icons";
import { PrinterGridBackground } from "@/components/printer-grid-background";

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
    <footer className="relative mt-16 overflow-hidden bg-neutral-800 text-white">
      {/* Mismo fondo animado (hex-grid + chispas + barrido) que Hero,
          Newsletter, Proyectos y el banner de Pedido a medida (ver
          printer-grid-background.tsx): antes el footer quedaba como una
          franja negra solida y estatica, un corte brusco justo despues de
          Newsletter (que si tiene esta animacion) -- sobre todo en tema
          claro, donde el salto de color ya es grande de por si. Reusar el
          mismo componente en vez de inventar una animacion nueva mantiene
          el lenguaje visual consistente en todas las "secciones de marca"
          del sitio. Va primero en el DOM (pinta detras) para no taparse
          con el degrade de transicion ni el contenido de abajo. */}
      <PrinterGridBackground />

      {/* Transicion de color para el limite con lo que venga antes del
          footer (pedido explicito, 2da vuelta): la version anterior (h-48,
          ~192px, terminando en neutral-950 casi negro) dejaba el titulo y
          el nav "Tienda 3D" sentados sobre una zona todavia a medio
          transicionar -- se leia lavado/poco legible en vez de contra un
          fondo solido. Ahora: (a) mucho mas chica (h-12, ~48px, resuelve
          practicamente al mismo alto que el padding superior del contenido
          de abajo, asi el texto ya cae sobre color solido) y (b) el tono
          final es neutral-800 en vez de neutral-950 -- sigue siendo
          claramente un footer oscuro, pero un carbon calido en vez de un
          muro de negro puro, menos brusco contra el fondo claro. En oscuro
          --background y neutral-800 quedan muy cerca (ver .dark en
          globals.css), asi que ahi el salto sigue siendo minimo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-12"
        style={{
          background: [
            "linear-gradient(to bottom,",
            "var(--background) 0%,",
            "color-mix(in srgb, var(--background) 50%, var(--color-neutral-800) 50%) 45%,",
            "var(--color-neutral-800) 100%)",
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
        {/* Credito obligatorio de la licencia CC-BY del modelo 3D del Hero
            (task #151) -- "Astronaut" de Poly/Google, no es CC0. Fila propia,
            bien chica, para que no compita visualmente con el resto. */}
        <div className="mx-auto max-w-6xl px-4 pb-4 text-center text-[0.65rem] text-neutral-600 sm:text-left">
          Modelo 3D &quot;Astronaut&quot; por{" "}
          <a
            href="https://poly.google.com/user/4aEd8rQgKu2"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-neutral-400"
          >
            Poly
          </a>
          , licencia{" "}
          <a
            href="https://creativecommons.org/licenses/by/2.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-neutral-400"
          >
            CC BY 2.0
          </a>
          .
        </div>
      </div>
    </footer>
  );
}
