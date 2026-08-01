import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getMyInquiries } from "@/lib/inquiries/actions";
import { formatDate } from "@/lib/format";

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
        <div className="mt-6 flex flex-col gap-3">
          {inquiries.map(({ inquiry, productName, productSlug, lastMessage }) => (
            <Link
              key={inquiry.id}
              href={`/producto/${productSlug}#preguntas`}
              className="rounded border border-neutral-200 p-4 transition-shadow hover:shadow-sm dark:border-neutral-800"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{productName}</p>
                <span className="shrink-0 text-xs text-neutral-400">{formatDate(inquiry.lastMessageAt)}</span>
              </div>
              {lastMessage && (
                <p className="mt-1.5 flex items-start gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                  <MessageCircle size={14} className="mt-0.5 shrink-0" />
                  <span className="line-clamp-2">
                    {lastMessage.senderRole === "empleado" ? "Equipo: " : "Vos: "}
                    {lastMessage.body}
                  </span>
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
