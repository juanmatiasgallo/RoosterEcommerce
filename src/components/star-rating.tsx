"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Presentacional: se usa tanto en modo solo-lectura (promedio de reseñas,
// tarjeta de producto) como interactivo (el picker del formulario de
// reseña) — un solo componente para no duplicar el render de las 5
// estrellas en dos lugares.
export function StarRating({
  value,
  onChange,
  size = 18,
  className,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  className?: string;
}) {
  const interactive = Boolean(onChange);

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)} role={interactive ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value);
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            aria-label={`${star} de 5 estrellas`}
            className={cn(interactive ? "cursor-pointer" : "cursor-default")}
          >
            <Star
              size={size}
              className={filled ? "fill-amber-400 text-amber-400" : "fill-none text-neutral-300 dark:text-neutral-700"}
            />
          </button>
        );
      })}
    </div>
  );
}
