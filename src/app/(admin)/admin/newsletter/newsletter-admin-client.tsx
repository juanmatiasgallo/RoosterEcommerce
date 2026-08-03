"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { NewsletterSubscriberRow } from "@/lib/newsletter/actions";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";

export function NewsletterAdminClient({ subscribers }: { subscribers: NewsletterSubscriberRow[] }) {
  // El CSV sigue exportando la lista entera (subscribers), no solo la
  // pagina visible -- la paginacion (task #146) es puramente de UI.
  const { page, setPage, totalPages, pageItems } = usePagination(subscribers);

  function handleDownloadCsv() {
    const rows = ["email,fecha", ...subscribers.map((s) => `${s.email},${new Date(s.createdAt).toISOString()}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "newsletter-suscriptores.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {subscribers.length} suscriptor{subscribers.length === 1 ? "" : "es"}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={handleDownloadCsv} disabled={subscribers.length === 0}>
          Descargar CSV
        </Button>
      </div>

      {subscribers.length === 0 ? (
        <p className="text-sm text-neutral-500">Todavia no hay suscriptores.</p>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {pageItems.map((subscriber) => (
                  <li key={subscriber.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span>{subscriber.email}</span>
                    <span className="text-neutral-500">{formatDate(subscriber.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
