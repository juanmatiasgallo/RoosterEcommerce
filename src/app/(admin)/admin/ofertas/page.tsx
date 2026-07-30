import { listDiscountCampaignsForAdmin } from "@/lib/discount-campaigns/actions";
import { OfertasClient } from "./ofertas-client";

// Consulta la DB: sin esto, el build de Docker en EasyPanel la pre-renderiza
// en build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

/**
 * Codigos de promocion de campania (backlog "sistema de ofertas/
 * descuentos"): distinto de los cupones personales por puntos
 * (/mi-cuenta/puntos) -- estos son codigos generales (ej. "VERANO10") que
 * cualquier cliente puede escribir en el checkout. El otro lado de
 * "ofertas" (precio tachado por variante) se edita directo en
 * /admin/productos, no aca.
 */
export default async function OfertasAdminPage() {
  const campaigns = await listDiscountCampaignsForAdmin();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold">Codigos de promocion</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Codigos generales que cualquier cliente puede aplicar en el checkout (no confundir con los cupones
        personales por puntos). Para ofertas de precio tachado en el catalogo, cargalas desde{" "}
        <a href="/admin/productos" className="underline">
          Productos
        </a>{" "}
        (campo "Precio antes" en cada variante).
      </p>
      <div className="mt-6">
        <OfertasClient initialCampaigns={campaigns} />
      </div>
    </div>
  );
}
