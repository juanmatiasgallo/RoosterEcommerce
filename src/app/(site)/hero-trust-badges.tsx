"use client";

import { useEffect, useState } from "react";
import { PackageSearch, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Pago seguro con Mercado Pago" },
  { icon: Truck, label: "Coordinamos el envío a todo el país" },
  { icon: PackageSearch, label: "Cotización antes de pagar" },
];

const HIGHLIGHT_MS = 1900;

/**
 * Spotlight secuencial: recorre los 3 badges de a uno, en loop infinito,
 * agrandando + resaltando en color de acento al que le toca el turno --
 * nunca se detiene (no depende de scroll ni de viewport), asi siempre hay
 * foco de atencion puesto en alguno de los 3 mientras el Hero esta
 * montado. setInterval + estado en vez de keyframes de Framer Motion: con
 * clases condicionales + transition-all de Tailwind es mas simple de leer
 * y de ajustar que armar el timing a mano con `times` en cada badge.
 */
export function HeroTrustBadges() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % TRUST_BADGES.length);
    }, HIGHLIGHT_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <ul className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-3 text-sm">
      {TRUST_BADGES.map((badge, index) => {
        const active = index === activeIndex;
        return (
          <li
            key={badge.label}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-500 ease-out",
              active
                ? "scale-110 bg-accent/10 text-accent shadow-sm shadow-accent/30 ring-1 ring-accent/30"
                : "scale-100 text-neutral-500 dark:text-neutral-400",
            )}
          >
            <badge.icon
              size={15}
              className={cn("shrink-0 transition-colors duration-500", active ? "text-accent" : "text-accent/60")}
              aria-hidden="true"
            />
            {badge.label}
          </li>
        );
      })}
    </ul>
  );
}
