"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { NewsletterSubscriberRow } from "@/lib/newsletter/actions";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-UY", { year: "numeric", month: "short", day: "numeric" });
}

export function NewsletterAdminClient({ subscribers }: { subscribers: NewsletterSubscriberRow[] }) {
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
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {subscribers.map((subscriber) => (
                <li key={subscriber.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>{subscriber.email}</span>
                  <span className="text-neutral-500">{formatDate(subscriber.createdAt)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
