import type { Metadata } from "next";
import { Space_Grotesk, Work_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { UmamiScript } from "@/components/umami-script";
import { getPublicUmamiConfig } from "@/lib/settings/actions";
import "./globals.css";

// Layout raiz: ahora consulta la DB (getPublicUmamiConfig, para el Website
// ID/URL de Umami configurables desde /admin/configuracion) en cada
// request. force-dynamic evita que Next intente pre-renderizarlo en build
// time -- el contenedor de build en EasyPanel no tiene red hacia la base,
// mismo motivo que el resto de las paginas de este repo (ver sus propios
// `export const dynamic`).
export const dynamic = "force-dynamic";

// Una sola familia, dos pesos (regular + semibold) — suficiente para todo
// el sitio, sin sumar mas de 2 pesos de fuente.
const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-sans",
  display: "swap",
});

// Fuente de titulos (task #23 -- "que las letras tengan mas presencia"):
// geometrica y con mas caracter que Work Sans, solo para headings (ver
// utilidad font-heading en globals.css + animated-heading.tsx). Nombre de
// variable distinto de --font-sans a proposito para no pisarla.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

// metadataBase resuelve las URLs relativas de openGraph (ej. la imagen de
// un producto) a absolutas — sin esto Next las resuelve contra
// http://localhost:3000 y loguea un warning en produccion.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:3000"),
  title: "Tienda 3D",
  description: "Impresiones 3D por catalogo o a medida",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const umamiConfig = await getPublicUmamiConfig();

  return (
    <html lang="es" className={`${workSans.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster richColors position="bottom-right" />
          <UmamiScript websiteId={umamiConfig.websiteId} src={umamiConfig.scriptUrl} />
        </ThemeProvider>
      </body>
    </html>
  );
}
