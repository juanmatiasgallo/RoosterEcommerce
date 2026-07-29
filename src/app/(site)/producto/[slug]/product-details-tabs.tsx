"use client";

import { useState } from "react";

type Spec = { label: string; value: string };
type TabKey = "description" | "specs" | "technical";

function SpecList({ specs }: { specs: Spec[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {specs.map((spec, index) => (
        <div
          key={`${spec.label}-${index}`}
          className="flex justify-between gap-4 border-b border-neutral-100 pb-2 text-sm dark:border-neutral-800"
        >
          <dt className="font-medium text-neutral-700 dark:text-neutral-300">{spec.label}</dt>
          <dd className="text-right text-neutral-500">{spec.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Hasta tres pestanas: "Descripcion" (texto libre), "Detalles del producto"
// (specs "humanas": material, cuidados, etc.) y "Caracteristicas tecnicas"
// (specs tecnicas: tolerancias, compatibilidad, resistencia — ver
// producto-form-dialog.tsx en el admin, mismo componente de edicion
// label/value para las dos listas). Solo se muestran las que tienen
// contenido; si ninguna tiene, el componente no renderiza nada.
export function ProductDetailsTabs({
  description,
  specs,
  technicalSpecs,
}: {
  description: string | null;
  specs: Spec[] | null;
  technicalSpecs: Spec[] | null;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    ...(description ? [{ key: "description" as const, label: "Descripcion" }] : []),
    ...(specs && specs.length > 0 ? [{ key: "specs" as const, label: "Detalles del producto" }] : []),
    ...(technicalSpecs && technicalSpecs.length > 0
      ? [{ key: "technical" as const, label: "Caracteristicas tecnicas" }]
      : []),
  ];

  const [tab, setTab] = useState<TabKey | null>(tabs[0]?.key ?? null);

  if (tabs.length === 0 || !tab) return null;

  return (
    <section className="mt-10 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      {tabs.length > 1 ? (
        <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : (
        <h2 className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">{tabs[0].label}</h2>
      )}

      <div className="animate-in fade-in duration-200 pt-4">
        {tab === "description" && description && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {description}
          </p>
        )}
        {tab === "specs" && specs && specs.length > 0 && <SpecList specs={specs} />}
        {tab === "technical" && technicalSpecs && technicalSpecs.length > 0 && <SpecList specs={technicalSpecs} />}
      </div>
    </section>
  );
}
