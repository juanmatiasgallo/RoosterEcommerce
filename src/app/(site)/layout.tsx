import { auth } from "@/auth";
import { listCategoryTree } from "@/lib/catalog/queries";
import { getCartItemCount } from "@/lib/cart/actions";
import { getNotificationSummary } from "@/lib/notifications/actions";
import { getPublicStoreContact, getVacationStatus } from "@/lib/settings/actions";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFloatButton } from "@/components/whatsapp-float-button";

// listCategoryTree consulta la DB: sin esto, el build de Docker en
// EasyPanel intenta pre-renderizar este layout (y todo lo que envuelve) en
// build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [categoryTree, session, cartItemCount, vacation, contact] = await Promise.all([
    listCategoryTree(),
    auth(),
    getCartItemCount(),
    getVacationStatus(),
    getPublicStoreContact(),
  ]);

  // Solo se pide si hay sesion (getNotificationSummary devuelve vacio sin
  // sesion, pero evitamos la query de mas para un visitante anonimo).
  const notifications = session ? await getNotificationSummary() : { items: [], unreadCount: 0 };

  return (
    <>
      {vacation.vacationMode && (
        <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
          {vacation.vacationMessage || "Estamos en pausa: por ahora no se pueden realizar nuevos pedidos."}
        </div>
      )}
      <SiteHeader
        categoryTree={categoryTree}
        user={session?.user ?? null}
        cartItemCount={cartItemCount}
        notificationItems={notifications.items}
        notificationUnreadCount={notifications.unreadCount}
      />
      {children}
      <SiteFooter
        categoryTree={categoryTree}
        contactEmail={contact.contactEmail}
        contactPhone={contact.contactPhone}
        instagramUrl={contact.instagramUrl}
        facebookUrl={contact.facebookUrl}
      />
      <WhatsAppFloatButton phone={contact.contactPhone} />
    </>
  );
}
