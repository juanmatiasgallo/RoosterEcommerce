"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { createReview } from "@/lib/reviews/actions";
import { createReviewSchema } from "@/lib/reviews/schema";

const MAX_REVIEW_IMAGES = 5;

export function ReviewFormClient({ productId, productCode }: { productId: string; productCode: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // object URLs solo para preview local (nunca se suben) — se regeneran
  // cada vez que cambia la lista de archivos y se liberan al desmontar o
  // reemplazar, para no filtrar memoria.
  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  function handleImagesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    setImages((prev) => [...prev, ...selected].slice(0, MAX_REVIEW_IMAGES));
    // Permite volver a elegir el mismo archivo si lo saca y lo quiere sumar
    // de nuevo — sin esto el input no dispara onChange una segunda vez.
    event.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

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
      await createReview(productId, parsed.data, productCode, images);
      toast.success("Gracias por tu reseña.");
      setRating(0);
      setComment("");
      setImages([]);
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

      <div className="mt-3">
        {previewUrls.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {previewUrls.map((url, index) => (
              <div key={url} className="relative h-16 w-16 overflow-hidden rounded border border-neutral-200 dark:border-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element -- preview local (object URL), no aplica next/image */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  aria-label="Quitar foto"
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        {images.length < MAX_REVIEW_IMAGES && (
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-neutral-500 underline">
            Agregar fotos ({images.length}/{MAX_REVIEW_IMAGES})
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImagesChange} className="hidden" />
          </label>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" size="sm" disabled={isSubmitting} className="mt-3">
        {isSubmitting ? "Enviando..." : "Publicar reseña"}
      </Button>
    </form>
  );
}
