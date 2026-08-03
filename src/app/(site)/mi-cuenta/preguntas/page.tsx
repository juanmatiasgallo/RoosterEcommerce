import Link from "next/link";
import { getMyInquiries } from "@/lib/inquiries/actions";
import { PreguntasClient } from "./preguntas-client";

export const dynamic = "force-dynamic";

export default async function MiCuentaPreguntasPage() {
  const inquiries = await getMyInquiries();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Mis preguntas</h1>
      <p className="mt-1 text-neutral-500">Consultas privadas que hiciste sobre productos, y las respuestas del equipo.</p>

      {inquiries.length === 0 ? (
        <p className="mt-6 text-neutral-500">
          Todavia no le preguntaste nada al equipo.{" "}
          <Link href="/#catalogo" className="underline">
            Ver catalogo
          </Link>
          .
        </p>
      ) : (
        <PreguntasClient inquiries={inquiries} />
      )}
    </div>
  );
}
