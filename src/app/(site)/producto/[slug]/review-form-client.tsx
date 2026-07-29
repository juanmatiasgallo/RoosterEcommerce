"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StarRating } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { createReview } from "@/lib/reviews/actions";
import { createReviewSchema } from "@/lib/reviews/schema";

export function ReviewFormClient({ productId, productSlug }: { productId: string; productSlug: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = createReviewSchema.safeParse({ rating, comment: comment || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos de la reseña.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createReview(productId, parsed.data, productSlug);
      toast.success("Gracias por tu reseña.");
      setRating(0);
      setComment("");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo guardar la reseña.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-sm font-medium">Dejar una reseña</p>

      <div className="mt-2">
        <StarRating value={rating} onChange={setRating} size={22} />
      </div>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Contanos tu experiencia con el producto (opcional)."
        className="mt-3 w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" size="sm" disabled={isSubmitting} className="mt-3">
        {isSubmitting ? "Enviando..." : "Publicar reseña"}
      </Button>
    </form>
  );
}
