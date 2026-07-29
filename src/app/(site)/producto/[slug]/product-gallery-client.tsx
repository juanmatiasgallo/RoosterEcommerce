"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play, X, ZoomIn } from "lucide-react";
import { ProductPlaceholder } from "@/components/product-placeholder";

type GalleryImage = { id: string; url: string; mediaType: "image" | "video" };

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

  function goTo(index: number) {
    setActiveIndex((index + images.length) % images.length);
  }

  // Cerrar con Escape y navegar con las flechas del teclado en el zoom,
  // mismo criterio de "sin librerias de modal" del resto del proyecto
  // (details/summary para el dropdown del header, etc.).
  useEffect(() => {
    if (!zoomOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setZoomOpen(false);
      if (event.key === "ArrowLeft") goTo(activeIndex - 1);
      if (event.key === "ArrowRight") goTo(activeIndex + 1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomOpen, activeIndex]);

  if (!active) {
    return (
      <div className="aspect-square overflow-hidden rounded-lg">
        <ProductPlaceholder />
      </div>
    );
  }

  const hasMultiple = images.length > 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="group relative aspect-square overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
        {active.mediaType === "video" ? (
          <video
            key={active.id}
            src={active.url}
            controls
            className="h-full w-full object-contain"
          />
        ) : (
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            aria-label="Ampliar imagen"
            className="absolute inset-0 h-full w-full"
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
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Anterior"
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Siguiente"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {zoomOpen && active.mediaType === "image" && (
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
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goTo(activeIndex - 1);
                }}
                aria-label="Anterior"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
              >
                <ChevronLeft size={36} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goTo(activeIndex + 1);
                }}
                aria-label="Siguiente"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
              >
                <ChevronRight size={36} />
              </button>
            </>
          )}
          <div className="relative h-full max-h-[90vh] w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <Image src={active.url} alt={productName} fill className="object-contain" sizes="100vw" />
          </div>
        </div>
      )}

      {hasMultiple && (
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
              {image.mediaType === "video" ? (
                <div className="flex h-full w-full items-center justify-center bg-neutral-900">
                  <Play size={18} className="text-white" />
                </div>
              ) : (
                <Image src={image.url} alt="" fill className="object-cover" sizes="64px" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
