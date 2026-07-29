"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

// Task #119: mismo nivel de pulido visual que /admin/configuracion, ahora en
// el dashboard. Entrada escalonada con Framer Motion (primera vez que se usa
// fuera del modal de newsletter) + icono por metrica para que cada numero se
// lea mas rapido de un vistazo.
//
// icon es un ReactNode (ya renderizado, ej. <Wand2 size={18} />) y no el
// componente en si (LucideIcon): AdminDashboardPage es un Server Component y
// esto es un Client Component, y React solo puede pasar objetos planos (o
// elementos ya renderizados) entre ese limite -- pasar la referencia a la
// funcion del componente rompe la serializacion (ver bug reportado).
export type DashboardStat = {
  href: string;
  label: string;
  value: number | string;
  icon: ReactNode;
};

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 320, damping: 26 } },
};

export function DashboardStatCards({ stats }: { stats: DashboardStat[] }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4"
    >
      {stats.map((stat) => (
        <motion.div key={stat.href + stat.label} variants={item} whileHover={{ y: -3 }}>
          <Link href={stat.href}>
            <Card className="h-full transition-colors hover:border-accent hover:shadow-md">
              <CardContent className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-3xl font-semibold">{stat.value}</p>
                  <p className="mt-1 text-sm text-neutral-500">{stat.label}</p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  {stat.icon}
                </span>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
