import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bloque neutro reutilizable para cuando un producto todavia no tiene
 * imagen real (en vez de una foto de stock generica). Unifica el criterio
 * que antes estaba repetido a mano en product-card.tsx y
 * product-gallery-client.tsx.
 */
export function ProductPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400 dark:bg-neutral-900 dark:text-neutral-600",
        className,
      )}
    >
      <ImageOff className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
      <span className="sr-only">Sin imagen</span>
    </div>
  );
}
