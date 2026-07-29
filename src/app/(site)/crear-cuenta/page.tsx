import { AuthShell } from "@/components/auth-shell";
import { CrearCuentaFormClient } from "./crear-cuenta-form-client";

export default function CrearCuentaPage() {
  return (
    <main>
      <AuthShell title="Crear cuenta" subtitle="Sumate para guardar tus pedidos, favoritos y puntos.">
        <CrearCuentaFormClient />
      </AuthShell>
    </main>
  );
}
