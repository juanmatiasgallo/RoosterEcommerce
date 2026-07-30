import { listInquiriesForAdmin } from "@/lib/inquiries/actions";
import { PreguntasClient } from "./preguntas-client";

// Consulta la DB: sin esto, el build de Docker en EasyPanel la pre-renderiza
// en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

/**
 * Panel centralizado de preguntas privadas por producto (task #46).
 * Proteccion de rol: src/proxy.ts ya redirige a no-staff lejos de /admin/*,
 * y listInquiriesForAdmin/replyProductInquiry vuelven a chequear el rol
 * (defensa en profundidad, mismo patron que el resto de /admin).
 */
export default async function PreguntasAdminPage() {
  const inquiries = await listInquiriesForAdmin();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold">Preguntas de clientes</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Consultas privadas hechas desde la ficha de producto -- la respuesta se ve solo por el cliente que pregunto.
      </p>

      <div className="mt-6">
        <PreguntasClient inquiries={inquiries} />
      </div>
    </div>
  );
}
