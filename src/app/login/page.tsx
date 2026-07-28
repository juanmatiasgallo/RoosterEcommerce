import { LoginFormClient } from "./login-form-client";

// callbackUrl viene de un query param que arma src/proxy.ts, pero es un
// input del usuario como cualquier otro: solo se acepta si es una ruta
// relativa propia (nunca una URL absoluta) para no habilitar un open
// redirect post-login.
function sanitizeCallbackUrl(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(sp.callbackUrl);

  return (
    <main className="mx-auto mt-16 max-w-sm px-4">
      <h1 className="text-2xl font-semibold">Iniciar sesion</h1>
      <div className="mt-6">
        <LoginFormClient callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
