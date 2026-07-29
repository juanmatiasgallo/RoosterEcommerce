import { getMyProfile } from "@/lib/auth/actions";
import { getDefaultShippingAddress } from "@/lib/orders/actions";
import { listActiveShippingZones } from "@/lib/shipping/actions";
import { PerfilClient } from "./perfil-client";

// Consulta la DB (perfil + direccion + zonas de envio): sin esto, el build
// de Docker en EasyPanel intenta pre-renderizarla en build time y falla (no
// tiene red hacia la base ahi) -- mismo motivo que el resto de /mi-cuenta/*.
export const dynamic = "force-dynamic";

/**
 * "Mi perfil" (task #116): el cliente edita sus datos personales (nombre,
 * mail, telefono) y su direccion de envio guardada -- dos formularios
 * separados (ver perfil-client.tsx) para que un error en uno no bloquee al
 * otro.
 */
export default async function PerfilPage() {
  const [profile, defaultShipping, shippingZones] = await Promise.all([
    getMyProfile(),
    getDefaultShippingAddress(),
    listActiveShippingZones(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Mi perfil</h1>
      <p className="mt-1 text-neutral-500">Actualiza tus datos personales y tu direccion de envio.</p>

      <div className="mt-6">
        <PerfilClient
          profile={profile}
          initialAddress={defaultShipping.address}
          initialShippingZoneId={defaultShipping.shippingZoneId}
          shippingZones={shippingZones.map((zone) => ({ id: zone.id, name: zone.name, cost: zone.cost }))}
        />
      </div>
    </div>
  );
}
