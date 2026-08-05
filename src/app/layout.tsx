import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
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

// Pase de tipografia (task #155): Work Sans -> Inter para el cuerpo. Misma
// idea de "pocos pesos" que antes, pero se suma el 500 -- font-medium se usa
// en botones/labels/badges por todo el sitio y con Work Sans (solo 400/600
// cargados) el navegador lo fingia con negrita sintetica; con el peso real
// cargado se ve mas nitido, sobre todo en pantalla chica. Inter tiene mejor
// metrica para numeros/precios (tabular figures mas parejas) que Work Sans,
// relevante en un catalogo con montos por todos lados.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

// Fuente de titulos (task #155, reemplaza a Space Grotesk de la task #23):
// mismo espiritu geometrico/tecnico que ya tenia el sitio, pero con mas
// pulido y un rango de pesos mas alto (hasta 800) -- se nota sobre todo en
// el "font-black" que ya usaba Extruded3DText para "3D" en el Hero, que con
// Space Grotesk (tope real 700) siempre caia en negrita sintetica del
// navegador. Solo para headings (ver utilidad font-heading en globals.css +
// animated-heading.tsx). Nombre de variable distinto de --font-sans a
// proposito para no pisarla.
const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
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
    <html lang="es" className={`${inter.variable} ${sora.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster richColors position="bottom-right" />
          <UmamiScript websiteId={umamiConfig.websiteId} src={umamiConfig.scriptUrl} />
        </ThemeProvider>
      </body>
    </html>
  );
}
