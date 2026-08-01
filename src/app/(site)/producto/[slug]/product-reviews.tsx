import Link from "next/link";
import { StarRating } from "@/components/star-rating";
import { Badge } from "@/components/ui/badge";
import { getProductReviews, getReviewEligibility } from "@/lib/reviews/actions";
import { formatDate } from "@/lib/format";
import { ReviewFormClient } from "./review-form-client";

export async function ProductReviews({ productId, productSlug }: { productId: string; productSlug: string }) {
  const [{ average, total, reviews }, eligibility] = await Promise.all([
    getProductReviews(productId),
    getReviewEligibility(productId),
  ]);

  return (
    <section className="mt-14">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Reseñas</h2>
        {total > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={average} size={16} />
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {average.toFixed(1)} · {total} reseña{total === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {reviews.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Todavia no hay reseñas para este producto.
            </p>
          ) : (
            reviews.map(({ review, userName }) => (
              <div key={review.id} className="border-b border-neutral-200 pb-4 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <StarRating value={review.rating} size={14} />
                  <span className="text-sm font-medium">{userName}</span>
                  <Badge variant="success" className="text-[10px]">
                    Compra verificada
                  </Badge>
                </div>
                {review.comment && (
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{review.comment}</p>
                )}
                {review.images && review.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {review.images.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-16 w-16 overflow-hidden rounded border border-neutral-200 dark:border-neutral-800"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- foto de usuario en /uploads, no en el dominio de next/image */}
                        <img src={url} alt="Foto de la reseña" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-xs text-neutral-400">{formatDate(review.createdAt)}</p>
              </div>
            ))
          )}
        </div>

        <div>
          {eligibility.canReview && <ReviewFormClient productId={productId} productSlug={productSlug} />}
          {eligibility.reason === "already_reviewed" && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Ya dejaste tu reseña de este producto.</p>
          )}
          {eligibility.reason === "not_purchased" && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Solo los clientes que compraron este producto pueden dejar una reseña.
            </p>
          )}
          {eligibility.reason === "not_logged_in" && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              <Link href="/login" className="underline">
                Inicia sesion
              </Link>{" "}
              para dejar una reseña si ya compraste este producto.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
