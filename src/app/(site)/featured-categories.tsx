"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { CategoryTreeNode } from "@/lib/catalog/queries";
import { AnimatedHeading } from "@/components/animated-heading";

// Mucha mas animacion en los iconos de categoria (task #194, pedido
// explicito del owner: "ponerle mucho mas animaciones a los iconos... que
// termine siendo amigable y bueno para el usuario", aclarando que sea "con
// lo que ya tenemos" -- por eso se mantiene el mismo icono generico
// (Layers) para todas las categorias, no se suma un icono por categoria
// (categories no tiene ese campo en el schema, seria otra tarea aparte).
//
// Mismo lenguaje de "el icono viene al frente" que ValueProps (task #30/
// #36: arranca mas grande y mas cerca, se asienta con un spring blando, y
// una vez asentado le late un anillo de color detras en loop) para que se
// sienta parte de la misma familia visual del sitio -- la diferencia aca
// es que ademas reacciona al hover con un saludito: un par de rebotes de
// rotacion, como si te saludara al pasar el mouse.

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const card = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 140, damping: 16 } },
};

const iconWrap = {
  hidden: { opacity: 0, scale: 1.8, rotate: -10 },
  show: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: "spring" as const, stiffness: 110, damping: 18, mass: 0.9 },
  },
  // Se dispara via propagacion de variants cuando se hace hover en
  // CUALQUIER parte de la tarjeta (whileHover="hover" en el motion.div
  // padre, no en este icono directamente) -- asi el gesto se activa con un
  // target grande y facil, no solo si el mouse pasa justo por el icono.
  hover: {
    scale: 1.18,
    rotate: [0, -12, 10, -6, 4, 0],
    transition: { duration: 0.55, ease: "easeInOut" as const },
  },
};

export function FeaturedCategories({ categoryTree }: { categoryTree: CategoryTreeNode[] }) {
  if (categoryTree.length === 0) return null;

  return (
    <section className="py-14">
      <AnimatedHeading text="Categorias" className="text-2xl font-semibold" />
      <p className="mt-1 text-neutral-500">Explora el catalogo por tipo de pieza.</p>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, amount: 0.3 }}
        variants={container}
        className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      >
        {categoryTree.map((category, index) => (
          <motion.div key={category.id} variants={card} whileHover="hover" whileTap={{ scale: 0.96 }}>
            <Link href={`/?categoryId=${category.id}#catalogo`} className="block">
              <Card className="flex h-28 flex-col items-center justify-center gap-2 p-4 text-center transition-colors duration-300 hover:border-accent hover:shadow-md">
                <motion.div variants={iconWrap} className="relative flex h-10 w-10 items-center justify-center">
                  {/* Latido continuo detras del icono (mismo patron que
                      ValueProps): corre en loop una vez que el icono ya
                      esta visible, con delay escalonado por indice para que
                      las tarjetas no laten todas al mismo tiempo. */}
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-accent/25"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: (index % 5) * 0.4 + 0.8,
                    }}
                  />
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Layers size={18} strokeWidth={1.75} aria-hidden="true" />
                  </div>
                </motion.div>
                <span className="font-medium">{category.name}</span>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
