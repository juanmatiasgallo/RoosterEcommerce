"use client";

import { useState } from "react";

type Spec = { label: string; value: string };

// Dos pestanas simples: "Descripcion" (texto libre del producto) y
// "Detalles del producto" (specs estructuradas, ver producto-form-dialog.tsx
// en el admin). Si falta una de las dos, no se muestra esa pestana; si
// faltan las dos, el componente no renderiza nada (ver uso en page.tsx).
export function ProductDetailsTabs({ description, specs }: { description: string | null; specs: Spec[] | null }) {
  const hasDescription = Boolean(description);
  const hasSpecs = Boolean(specs && specs.length > 0);

  const [tab, setTab] = useState<"description" | "specs">(hasDescription ? "description" : "specs");

  if (!hasDescription && !hasSpecs) return null;

  return (
    <section className="mt-10 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      {hasDescription && hasSpecs ? (
        <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setTab("description")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === "description"
                ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            Descripcion
          </button>
          <button
            type="button"
            onClick={() => setTab("specs")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === "specs"
                ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            Detalles del producto
          </button>
        </div>
      ) : (
        <h2 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {hasDescription ? "Descripcion" : "Detalles del producto"}
        </h2>
      )}

      <div className="animate-in fade-in duration-200 pt-4">
        {tab === "description" && hasDescription && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {description}
          </p>
        )}
        {tab === "specs" && hasSpecs && (
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {specs!.map((spec, index) => (
              <div key={`${spec.label}-${index}`} className="flex justify-between gap-4 border-b border-neutral-100 pb-2 text-sm dark:border-neutral-800">
                <dt className="font-medium text-neutral-700 dark:text-neutral-300">{spec.label}</dt>
                <dd className="text-right text-neutral-500">{spec.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
