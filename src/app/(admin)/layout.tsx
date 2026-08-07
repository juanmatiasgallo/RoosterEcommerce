import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getNotificationSummary } from "@/lib/notifications/actions";
import { getPublicStoreContact } from "@/lib/settings/actions";
import { AdminSidebar } from "@/components/admin-sidebar";

// Consulta la sesion (y, transitivamente, la DB via el callback de auth()):
// sin esto el build de Docker en EasyPanel intenta pre-renderizarlo en
// build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

const STAFF_ROLES = ["admin", "empleado"];

/**
 * Defensa en profundidad adicional a src/proxy.ts (que ya redirige a
 * no-staff lejos de /admin/*): mismo criterio de roles, no lo reemplaza.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role)) {
    redirect("/");
  }

  const [notifications, contact] = await Promise.all([getNotificationSummary(), getPublicStoreContact()]);

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <AdminSidebar
        user={session.user}
        notificationItems={notifications.items}
        notificationUnreadCount={notifications.unreadCount}
        hasIcon={contact.hasIcon}
      />
      <main className="flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
