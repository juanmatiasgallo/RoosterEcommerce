import { AuthShell } from "@/components/auth-shell";
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
    <main>
      <AuthShell title="Iniciar sesion" subtitle="Entra a tu cuenta para seguir tus pedidos y compras.">
        <LoginFormClient callbackUrl={callbackUrl} />
      </AuthShell>
    </main>
  );
}
