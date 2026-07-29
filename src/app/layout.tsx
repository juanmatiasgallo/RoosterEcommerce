import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Una sola familia, dos pesos (regular + semibold) — suficiente para todo
// el sitio, sin sumar mas de 2 pesos de fuente.
const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-sans",
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={workSans.variable} suppressHydrationWarning>
      <body>
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
