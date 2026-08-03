"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { getMyInquiries } from "@/lib/inquiries/actions";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";

type InquiryRow = Awaited<ReturnType<typeof getMyInquiries>>[number];

// Separado de page.tsx (Server Component) solo para poder usar usePagination
// (task #146).
export function PreguntasClient({ inquiries }: { inquiries: InquiryRow[] }) {
  const { page, setPage, totalPages, pageItems } = usePagination(inquiries);

  return (
    <div className="mt-6 flex flex-col gap-3">
      {pageItems.map(({ inquiry, productName, productCode, lastMessage }) => (
        <Link
          key={inquiry.id}
          href={`/producto/${productCode}#preguntas`}
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

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
