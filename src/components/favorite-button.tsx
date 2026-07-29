"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleFavorite } from "@/lib/favorites/actions";

// Dos variantes: "overlay" (circulo chico sobre la miniatura en
// product-card.tsx, dentro de un <Link> asi que frena la propagacion del
// click) y "button" (boton grande con texto, para la ficha de producto).
export function FavoriteButton({
  productId,
  initialFavorited,
  variant = "overlay",
}: {
  productId: string;
  initialFavorited: boolean;
  variant?: "overlay" | "button";
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const next = !favorited;
    setFavorited(next);
    startTransition(async () => {
      try {
        await toggleFavorite(productId);
      } catch (error) {
        setFavorited(!next);
        if (error instanceof Error && error.message.includes("Inicia sesion")) {
          toast.error("Inicia sesion para guardar favoritos.");
          router.push("/login");
          return;
        }
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar favoritos.");
      }
    });
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`flex items-center justify-center gap-2 rounded border px-4 py-2 text-sm font-medium transition-colors active:scale-[0.98] disabled:opacity-50 ${
          favorited
            ? "border-accent bg-accent/10 text-accent"
            : "border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        }`}
      >
        <Heart size={16} fill={favorited ? "currentColor" : "none"} aria-hidden="true" />
        {favorited ? "En tus favoritos" : "Agregar a favoritos"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={favorited ? "Quitar de favoritos" : "Agregar a favoritos"}
      className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-neutral-500 shadow transition-transform hover:scale-110 active:scale-95 dark:bg-neutral-900/90 dark:text-neutral-400"
    >
      <Heart
        size={14}
        className={favorited ? "text-accent" : undefined}
        fill={favorited ? "currentColor" : "none"}
        aria-hidden="true"
      />
    </button>
  );
}
