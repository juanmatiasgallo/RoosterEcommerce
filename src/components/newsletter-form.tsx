"use client";

import { useState } from "react";
import { toast } from "sonner";
import { subscribeToNewsletter } from "@/lib/newsletter/actions";
import { subscribeToNewsletterSchema } from "@/lib/newsletter/schema";

// Gancho estilo Tata.com.uy en el footer: solo el mail, sin cuenta.
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = subscribeToNewsletterSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Ingresa un email valido.");
      return;
    }

    setIsSubmitting(true);
    try {
      await subscribeToNewsletter(parsed.data);
      toast.success("Listo, te vamos a avisar de las proximas promos.");
      setEmail("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar tu mail.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="nombre@correo.com"
        required
        className="w-full rounded border border-neutral-300 px-3 py-2 text-sm sm:w-64 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50 hover:bg-accent-hover"
      >
        {isSubmitting ? "Enviando..." : "Suscribirme"}
      </button>
    </form>
  );
}
