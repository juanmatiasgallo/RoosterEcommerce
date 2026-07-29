"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { updateMyProfile } from "@/lib/auth/actions";
import { updateProfileSchema } from "@/lib/auth/schema";
import { updateMyShippingAddress } from "@/lib/orders/actions";
import { shippingAddressSchema, type ShippingAddress } from "@/lib/orders/schema";
import { Spinner } from "@/components/ui/spinner";

const inputClass =
  "w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

type ShippingZoneOption = { id: string; name: string; cost: string };

export function PerfilClient({
  profile,
  initialAddress,
  initialShippingZoneId,
  shippingZones,
}: {
  profile: { name: string; email: string; phone: string | null };
  initialAddress: ShippingAddress | null;
  initialShippingZoneId: string | null;
  shippingZones: ShippingZoneOption[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <DatosPersonalesForm profile={profile} />
      <DireccionForm initialAddress={initialAddress} initialShippingZoneId={initialShippingZoneId} shippingZones={shippingZones} />
    </div>
  );
}

function DatosPersonalesForm({ profile }: { profile: { name: string; email: string; phone: string | null } }) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = updateProfileSchema.safeParse({ name, email, phone });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateMyProfile(parsed.data);
      if (result.emailChanged) {
        toast.success("Mail actualizado. Volve a iniciar sesion para verlo reflejado en tu cuenta.");
        setTimeout(() => signOut({ callbackUrl: "/login" }), 1200);
        return;
      }
      toast.success("Datos actualizados.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los datos.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800"
    >
      <h2 className="font-medium">Datos personales</h2>

      <div>
        <label htmlFor="profile-name" className="mb-1 block text-sm font-medium">
          Nombre
        </label>
        <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>

      <div>
        <label htmlFor="profile-email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="profile-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-neutral-500">Si lo cambias, te vamos a pedir que vuelvas a iniciar sesion.</p>
      </div>

      <div>
        <label htmlFor="profile-phone" className="mb-1 block text-sm font-medium">
          Celular de contacto
        </label>
        <input
          id="profile-phone"
          type="tel"
          placeholder="+598 99 000 000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center justify-center gap-2 self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {isSubmitting && <Spinner size={14} />}
        {isSubmitting ? "Guardando..." : "Guardar datos"}
      </button>
    </form>
  );
}

function DireccionForm({
  initialAddress,
  initialShippingZoneId,
  shippingZones,
}: {
  initialAddress: ShippingAddress | null;
  initialShippingZoneId: string | null;
  shippingZones: ShippingZoneOption[];
}) {
  const router = useRouter();
  const [calle, setCalle] = useState(initialAddress?.calle ?? "");
  const [numero, setNumero] = useState(initialAddress?.numero ?? "");
  const [piso, setPiso] = useState(initialAddress?.piso ?? "");
  const [ciudad, setCiudad] = useState(initialAddress?.ciudad ?? "");
  const [departamento, setDepartamento] = useState(initialAddress?.departamento ?? "");
  const [cp, setCp] = useState(initialAddress?.cp ?? "");
  const [zoneId, setZoneId] = useState<string | null>(initialShippingZoneId);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = shippingAddressSchema.safeParse({ calle, numero, piso, ciudad, departamento, cp });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa la direccion.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateMyShippingAddress(parsed.data, zoneId);
      toast.success("Direccion actualizada.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la direccion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800"
    >
      <h2 className="font-medium">Direccion de envio</h2>
      <p className="text-xs text-neutral-500">Es la que se precarga en tus proximas compras -- podes cambiarla cuando quieras.</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="perfil-calle" className="mb-1 block text-sm font-medium">
            Calle
          </label>
          <input id="perfil-calle" value={calle} onChange={(e) => setCalle(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="perfil-numero" className="mb-1 block text-sm font-medium">
            Numero
          </label>
          <input id="perfil-numero" value={numero} onChange={(e) => setNumero(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="perfil-piso" className="mb-1 block text-sm font-medium">
            Piso / Depto (opcional)
          </label>
          <input id="perfil-piso" value={piso} onChange={(e) => setPiso(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="perfil-ciudad" className="mb-1 block text-sm font-medium">
            Ciudad
          </label>
          <input id="perfil-ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="perfil-departamento" className="mb-1 block text-sm font-medium">
            Departamento
          </label>
          <input
            id="perfil-departamento"
            value={departamento}
            onChange={(e) => setDepartamento(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="perfil-cp" className="mb-1 block text-sm font-medium">
            Codigo postal
          </label>
          <input id="perfil-cp" value={cp} onChange={(e) => setCp(e.target.value)} className={inputClass} />
        </div>
      </div>

      {shippingZones.length > 0 && (
        <div>
          <label htmlFor="perfil-zona" className="mb-1 block text-sm font-medium">
            Zona de envio
          </label>
          <select
            id="perfil-zona"
            value={zoneId ?? ""}
            onChange={(e) => setZoneId(e.target.value || null)}
            className={inputClass}
          >
            <option value="">Sin especificar</option>
            {shippingZones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center justify-center gap-2 self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {isSubmitting && <Spinner size={14} />}
        {isSubmitting ? "Guardando..." : "Guardar direccion"}
      </button>
    </form>
  );
}
