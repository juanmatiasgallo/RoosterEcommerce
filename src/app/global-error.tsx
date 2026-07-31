"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";

// Patron recomendado por Sentry para Next.js App Router (task #86): este
// archivo especial reemplaza el error boundary de la raiz. Sin esto, un
// error de renderizado que escapa hasta la raiz de la app (fuera de
// cualquier error.tsx local) no queda registrado en GlitchTip -- captureException
// es no-op si Sentry.init nunca corrio (sin GLITCHTIP_DSN), asi que esto no
// rompe nada en dev local.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
