"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, ZoomIn } from "lucide-react";
import { ProductPlaceholder } from "@/components/product-placeholder";

type GalleryImage = { id: string; url: string };

export function ProductGalleryClient({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const active = images[activeIndex];

  // Cerrar con Escape, mismo criterio de "sin librerias de modal" del resto
  // del proyecto (details/summary para el dropdown del header, etc.).
  useEffect(() => {
    if (!zoomOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setZoomOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomOpen]);

  if (!active) {
    return (
      <div className="aspect-square overflow-hidden rounded-lg">
        <ProductPlaceholder />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setZoomOpen(true)}
        aria-label="Ampliar imagen"
        className="group relative aspect-square overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900"
      >
        <Image
          src={active.url}
          alt={productName}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          <ZoomIn size={14} />
          Ampliar
        </span>
      </button>

      {zoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} ampliado`}
          onClick={() => setZoomOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="Cerrar"
            className="absolute right-4 top-4 text-white/80 hover:text-white"
          >
            <X size={28} />
          </button>
          <div className="relative h-full max-h-[90vh] w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <Image src={active.url} alt={productName} fill className="object-contain" sizes="100vw" />
          </div>
        </div>
      )}

      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border ${
                index === activeIndex
                  ? "border-neutral-900 dark:border-neutral-100"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <Image src={image.url} alt="" fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
