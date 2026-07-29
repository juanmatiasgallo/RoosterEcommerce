import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ClienteSidebar } from "@/components/cliente-sidebar";

// Consulta la sesion (y, transitivamente, la DB via el callback de auth()):
// sin esto el build de Docker en EasyPanel intenta pre-renderizarlo en
// build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

/**
 * Shell unificado para /mi-cuenta/* (task #115), mismo patron que
 * src/app/(admin)/layout.tsx: sidebar fija + <main> unico -- las paginas
 * de adentro (compras, pedidos, favoritos, puntos, perfil,
 * cambiar-contrasena) ya no arrancan con su propio <main>, sino con un
 * <div> (ver fix historico "main anidado" que ya paso una vez en /admin).
 * Defensa en profundidad adicional a src/proxy.ts, que ya redirige a
 * /login si no hay sesion.
 */
export default async function MiCuentaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/mi-cuenta");

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <ClienteSidebar user={session.user} />
      <main className="flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
