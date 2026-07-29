import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getLoyaltySettings,
  getMercadoPagoSettings,
  getPaymentInstructions,
  getSmtpSettings,
  getStoreInfo,
  getVacationSettings,
} from "@/lib/settings/actions";
import { listShippingZonesForAdmin } from "@/lib/shipping/actions";
import { ConfiguracionClient } from "./configuracion-client";

// Consulta la DB: sin esto, el build de Docker en EasyPanel la
// pre-renderiza en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

/**
 * Refuerzo de guard a nivel de pagina, no solo en la Server Action: a
 * diferencia del resto de /admin (que confia en proxy.ts + el guard de
 * cada action, ambos admin+empleado), esta pagina expone configuracion de
 * credenciales SMTP reales — admin-only estricto — asi que se chequea el
 * rol aca tambien de forma explicita. proxy.ts deja pasar a "empleado" a
 * cualquier /admin/*, por eso este chequeo extra es el que realmente lo
 * frena en esta pagina puntual.
 */
export default async function ConfiguracionAdminPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  const [smtpSettings, mpSettings, paymentInstructions, storeInfo, vacationSettings, shippingZones, loyaltySettings] =
    await Promise.all([
      getSmtpSettings(),
      getMercadoPagoSettings(),
      getPaymentInstructions(),
      getStoreInfo(),
      getVacationSettings(),
      listShippingZonesForAdmin(),
      getLoyaltySettings(),
    ]);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">Configuracion</h1>
      <p className="mt-1 text-neutral-500">
        Credenciales de la tienda. Todo lo sensible queda encriptado en la base, nunca en texto plano.
      </p>

      <div className="mt-6">
        <ConfiguracionClient
          initialSmtp={smtpSettings}
          initialMp={mpSettings}
          initialPaymentInstructions={paymentInstructions}
          initialStoreInfo={storeInfo}
          initialVacation={vacationSettings}
          initialShippingZones={shippingZones}
          initialLoyalty={loyaltySettings}
        />
      </div>
    </div>
  );
}
