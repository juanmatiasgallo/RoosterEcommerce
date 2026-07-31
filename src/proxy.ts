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

  // /pedido-a-medida ya NO esta aca (task #111): antes exigia sesion antes
  // de poder ver la pagina, pero el owner pidio que un visitante sin cuenta
  // pueda entrar y empezar el pedido -- el propio wizard (ver
  // pedido-a-medida-wizard.tsx) le pide identificarse (login o alta rapida
  // con telefono de contacto) recien en su primer paso, antes de poder
  // subir el archivo. Esto alinea el codigo con el comentario original de
  // arriba de este archivo, que ya decia que pedido a medida era publico.
  if (pathname.startsWith("/mi-cuenta")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  // "uploads" excluido: son archivos estaticos servidos por Next desde
  // public/uploads (comprobantes, fotos de producto, archivos 3D de
  // pedidos a medida) -- antes pasaban igual por auth() en cada request sin
  // necesidad (la logica de arriba de todas formas los deja pasar, esto es
  // solo para no pagar ese costo en cada imagen/archivo).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
