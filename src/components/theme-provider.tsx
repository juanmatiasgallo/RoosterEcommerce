"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

// Wrapper minimo: next-themes exporta un componente cliente, y layout.tsx
// (Server Component) no puede usar "use client" el mismo. Mismo patron que
// cualquier provider de terceros en Next App Router.
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
