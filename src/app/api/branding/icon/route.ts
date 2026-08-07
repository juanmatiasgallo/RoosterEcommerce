import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { getObjectBuffer } from "@/lib/storage";

// Consulta la DB en cada GET: sin esto, Next intenta preprocesar/prerenderizar
// esta ruta en build time (no tiene parametros dinamicos ni usa cookies/
// headers, asi que por default cae candidata a optimizacion estatica) y el
// build falla contra cualquier DB que no tenga la migracion de iconUrl
// aplicada todavia -- mismo motivo que el resto de los layouts/paginas de
// este repo que consultan la DB (ver sus propios `export const dynamic`).
export const dynamic = "force-dynamic";

// Icono de marca (task #192/#200): a diferencia de receiptUrl/fileUrl
// (comprobantes y STL de pedidos a medida, que se resuelven con una URL
// FIRMADA de MinIO que vence en 1h, ver getSignedFileUrl), este es un
// asset publico -- se usa como favicon (app/layout.tsx > generateMetadata)
// y como <img> del header/sidebar en cada pagina del sitio, y el navegador
// lo cachea segun la URL, no segun el contenido. Una URL firmada que vence
// rompe eso apenas pasa la hora. Por eso esta ruta no devuelve una
// redireccion a una signed URL: lee los bytes server-side (con las
// credenciales de la app, nunca expuestas al navegador) y los reenvia ella
// misma con su propio Cache-Control.
//
// Publica a proposito (sin auth): es literalmente el logo del sitio, no hay
// nada que proteger -- mismo criterio que cualquier /favicon.ico o
// /logo.png servido desde /public en un sitio comun.
export async function GET() {
  const [store] = await db.select({ iconUrl: stores.iconUrl }).from(stores).limit(1);

  if (!store?.iconUrl) {
    return NextResponse.json({ error: "No hay icono cargado." }, { status: 404 });
  }

  let file: { buffer: Buffer; contentType: string | undefined };
  try {
    file = await getObjectBuffer(store.iconUrl);
  } catch {
    // MinIO abajo, key borrada a mano, etc -- no tiene sentido romper la
    // pagina entera por un logo que no carga, el fallback de texto en
    // site-header/admin-sidebar ya cubre este caso (ver hasIcon).
    return NextResponse.json({ error: "No se pudo leer el icono." }, { status: 502 });
  }

  // Buffer<ArrayBufferLike> (tipo de Node) no matchea directo con el tipo
  // BodyInit que espera NextResponse -- Uint8Array plano si.
  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType ?? "application/octet-stream",
      // 1h, mismo horizonte que las signed URLs del resto del storage --
      // suficiente para no repetir la lectura de MinIO en cada request, sin
      // dejar el logo pegado indefinidamente si se reemplaza.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
