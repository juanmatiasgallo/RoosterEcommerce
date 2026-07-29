import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Role } from "@/lib/auth/schema";

/**
 * A diferencia de ChickenHouseContab (app interna, todo detras de login),
 * aca el sitio publico (catalogo, ficha de producto, pedido a medida) es
 * navegable sin sesion. Solo /admin y /mi-cuenta requieren auth.
 */
const ADMIN_ONLY_ROLES: Role[] = ["admin", "empleado"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  if (pathname.startsWith("/login")) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  // Entro con una contrasena temporal (ver requestPasswordReset en
  // src/lib/auth/actions.ts): no lo dejamos navegar a ningun lado hasta que
  // elija una definitiva, para que no se quede usando la temporal.
  if (isLoggedIn && req.auth!.user.mustChangePassword && pathname !== "/mi-cuenta/cambiar-contrasena") {
    return NextResponse.redirect(new URL("/mi-cuenta/cambiar-contrasena", nextUrl));
  }

  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!ADMIN_ONLY_ROLES.includes(req.auth!.user.role)) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/mi-cuenta") || pathname.startsWith("/pedido-a-medida")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
