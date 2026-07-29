import { listNewsletterSubscribers } from "@/lib/newsletter/actions";
import { NewsletterAdminClient } from "./newsletter-admin-client";

// Consulta la DB: sin esto, el build de Docker en EasyPanel la pre-renderiza
// en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

export default async function NewsletterAdminPage() {
  const subscribers = await listNewsletterSubscribers();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Newsletter</h1>
      <p className="mt-1 text-neutral-500">
        Mails suscriptos desde el footer del sitio. Todavia no hay envio de campañas: exportá el CSV para usarlo en
        tu herramienta de mailing.
      </p>

      <div className="mt-6">
        <NewsletterAdminClient subscribers={subscribers} />
      </div>
    </div>
  );
}
