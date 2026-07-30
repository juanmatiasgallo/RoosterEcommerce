"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendProductQuestion } from "@/lib/inquiries/actions";
import type { productInquiries, productInquiryMessages } from "@/lib/db/schema";

type Inquiry = typeof productInquiries.$inferSelect;
type Message = typeof productInquiryMessages.$inferSelect;

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("es-UY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ message }: { message: Message }) {
  const fromStaff = message.senderRole === "empleado";
  return (
    <div className={`flex flex-col ${fromStaff ? "items-start" : "items-end"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          fromStaff
            ? "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
            : "bg-accent text-accent-foreground"
        }`}
      >
        {message.body}
      </div>
      <span className="mt-0.5 text-[11px] text-neutral-400">
        {fromStaff ? "Equipo Tienda 3D" : "Vos"} · {formatDateTime(message.createdAt)}
      </span>
    </div>
  );
}

export function ProductInquiryClient({
  productId,
  productSlug,
  initialInquiry,
  initialMessages,
}: {
  productId: string;
  productSlug: string;
  initialInquiry: Inquiry | null;
  initialMessages: Message[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [hasThread, setHasThread] = useState(Boolean(initialInquiry));
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmed = text.trim();
    if (trimmed.length < 3) {
      setError("Escribi al menos unas palabras.");
      return;
    }

    setIsSubmitting(true);
    try {
      await sendProductQuestion({ productId, message: trimmed });
      // Optimista: se agrega el mensaje del cliente en el momento, sin
      // esperar el round-trip completo -- el hilo ya queda armado para el
      // caso de "primera pregunta" -> "chat" sin recargar la pagina.
      setMessages((prev) => [
        ...prev,
        {
          id: `optimistic-${Date.now()}`,
          inquiryId: initialInquiry?.id ?? "pending",
          senderId: "self",
          senderRole: "cliente",
          body: trimmed,
          createdAt: new Date(),
        } as Message,
      ]);
      setHasThread(true);
      setText("");
      toast.success("Pregunta enviada.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo enviar la pregunta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
      {hasThread && (
        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto border-b border-neutral-200 p-4 dark:border-neutral-800">
          {messages.length === 0 ? (
            <p className="text-sm text-neutral-500">
              <MessageCircle size={14} className="mr-1 inline" />
              Todavia no hay mensajes.
            </p>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4">
        <label htmlFor={`inquiry-${productSlug}`} className="text-sm font-medium">
          {hasThread ? "Seguir la conversacion" : "Hacer una pregunta"}
        </label>
        <textarea
          id={`inquiry-${productSlug}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Por ejemplo: ¿este modelo lo tenes en otro color?"
          className="mt-2 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" size="sm" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Enviando..." : "Enviar"}
        </Button>
      </form>
    </div>
  );
}
