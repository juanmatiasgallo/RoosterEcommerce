"use client";

import { AnimatedHeading } from "@/components/animated-heading";
import { AnimatedParagraph } from "@/components/animated-paragraph";

// Encabezado compartido por las 3 secciones nuevas de la home (Servicios,
// Entrega, Material): mismo lenguaje visual que el eyebrow del Hero
// ("Catalogo + pedidos a medida"), con un guion largo adelante como en la
// referencia que paso el owner ("— Entrega", "— Material", "— Servicios").
export function SectionIntro({
  eyebrow,
  heading,
  subtitle,
}: {
  eyebrow: string;
  heading: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">— {eyebrow}</p>
      <AnimatedHeading text={heading} className="mt-2 text-2xl font-semibold sm:text-3xl" />
      {subtitle && (
        <AnimatedParagraph
          text={subtitle}
          delay={0.3}
          className="mt-3 block text-neutral-500 dark:text-neutral-400"
        />
      )}
    </div>
  );
}
