import { CrearCuentaFormClient } from "./crear-cuenta-form-client";

export default function CrearCuentaPage() {
  return (
    <main className="mx-auto mt-16 max-w-sm px-4">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      <div className="mt-6">
        <CrearCuentaFormClient />
      </div>
    </main>
  );
}
