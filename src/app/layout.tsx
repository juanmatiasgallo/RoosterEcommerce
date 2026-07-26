import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tienda 3D",
  description: "Impresiones 3D por catalogo o a medida",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
