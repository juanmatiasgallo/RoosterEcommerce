"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInquiryMessagesForAdmin, replyProductInquiry, type AdminInquiryRow } from "@/lib/inquiries/actions";
import type { productInquiryMessages } from "@/lib/db/schema";

type Message = typeof productInquiryMessages.$inferSelect;

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("es-UY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ message }: { message: Message }) {
  const fromStaff = message.senderRole === "empleado";
  return (
    <div className={`flex flex-col ${fromStaff ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          fromStaff
            ? "bg-accent text-accent-foreground"
            : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
        }`}
      >
        {message.body}
      </div>
      <span className="mt-0.5 text-[11px] text-neutral-400">
        {fromStaff ? "Vos" : "Cliente"} · {formatDateTime(message.createdAt)}
      </span>
    </div>
  );
}

export function PreguntasClient({ inquiries }: { inquiries: AdminInquiryRow[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = inquiries.find((row) => row.inquiry.id === selectedId) ?? null;

  async function openInquiry(inquiryId: string) {
    setSelectedId(inquiryId);
    setLoadingThread(true);
    setError(null);
    try {
      const thread = await getInquiryMessagesForAdmin(inquiryId);
      setMessages(thread);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar la conversacion.");
    } finally {
      setLoadingThread(false);
    }
  }

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const trimmed = reply.trim();
    if (!trimmed) return;

    setIsSending(true);
    setError(null);
    try {
      const message = await replyProductInquiry({ inquiryId: selected.inquiry.id, message: trimmed });
      setMessages((prev) => [...prev, message]);
      setReply("");
      toast.success("Respuesta enviada.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo enviar la respuesta.");
    } finally {
      setIsSending(false);
    }
  }

  if (inquiries.length === 0) {
    return <p className="text-sm text-neutral-500">Todavia no hay preguntas de clientes.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[300px_1fr]">
      <div className="flex flex-col gap-1 overflow-y-auto md:max-h-[560px]">
        {inquiries.map((row) => (
          <button
            key={row.inquiry.id}
            type="button"
            onClick={() => openInquiry(row.inquiry.id)}
            className={`rounded border p-3 text-left transition-colors ${
              selectedId === row.inquiry.id
                ? "border-accent bg-accent/5"
                : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
            }`}
          >
            <p className="truncate text-sm font-medium">{row.productName}</p>
            <p className="truncate text-xs text-neutral-500">{row.customerName ?? row.customerEmail}</p>
            <p className="mt-1 text-[11px] text-neutral-400">{formatDateTime(row.inquiry.lastMessageAt)}</p>
          </button>
        ))}
      </div>

      <div className="rounded border border-neutral-200 dark:border-neutral-800">
        {!selected ? (
          <p className="flex h-full items-center justify-center p-8 text-sm text-neutral-500">
            <MessageCircle size={14} className="mr-1.5 inline" />
            Elegi una consulta para ver la conversacion.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
              <div>
                <p className="text-sm font-medium">{selected.productName}</p>
                <p className="text-xs text-neutral-500">{selected.customerName ?? selected.customerEmail}</p>
              </div>
              <Link
                href={`/producto/${selected.productSlug}`}
                target="_blank"
                className="flex shrink-0 items-center gap-1 text-xs text-neutral-500 underline"
              >
                Ver producto <ExternalLink size={12} />
              </Link>
            </div>

            <div className="flex max-h-96 flex-col gap-3 overflow-y-auto p-4">
              {loadingThread ? (
                <p className="text-sm text-neutral-500">Cargando...</p>
              ) : (
                messages.map((message) => <MessageBubble key={message.id} message={message} />)
              )}
            </div>

            <form onSubmit={handleReply} className="border-t border-neutral-200 p-3 dark:border-neutral-800">
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Escribi tu respuesta..."
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
              <Button type="submit" size="sm" disabled={isSending} className="mt-2">
                {isSending ? "Enviando..." : "Responder"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
