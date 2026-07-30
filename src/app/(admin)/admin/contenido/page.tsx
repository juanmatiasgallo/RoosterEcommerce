import { listDeliveryTiersForAdmin, listMaterialsForAdmin, listServicesForAdmin } from "@/lib/site-content/actions";
import { ContenidoClient } from "./contenido-client";

// Consulta la DB: sin esto, el build de Docker en EasyPanel la pre-renderiza
// en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

/**
 * Contenido editable de la home (tiempos de entrega, material, servicios) --
 * a diferencia de "Como funciona"/"Value props" (copy fijo en el codigo),
 * el owner pidio poder cambiar esto sin pasar por un deploy.
 * Proteccion de rol: src/proxy.ts ya redirige a no-staff lejos de /admin/*,
 * y cada server action vuelve a chequear el rol (defensa en profundidad).
 */
export default async function ContenidoAdminPage() {
  const [tiers, materialsList, servicesList] = await Promise.all([
    listDeliveryTiersForAdmin(),
    listMaterialsForAdmin(),
    listServicesForAdmin(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold">Contenido de la home</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Tiempos de entrega, material y servicios que se muestran en la pagina principal, entre "Value props" y el
        catalogo.
      </p>
      <div className="mt-6">
        <ContenidoClient initialTiers={tiers} initialMaterials={materialsList} initialServices={servicesList} />
      </div>
    </div>
  );
}
