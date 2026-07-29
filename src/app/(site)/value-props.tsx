"use client";

import { motion } from "framer-motion";
import { FileCheck2, PackageSearch, Truck, Wallet } from "lucide-react";
import { AnimatedParagraph } from "@/components/animated-paragraph";

// Solo funcionalidad que ya existe de verdad en el sitio (nada de promesas
// tipo "garantia de por vida" que no podemos respaldar): catalogo con stock
// real por variante, cotizacion antes de pagar en pedido a medida, pagina de
// envios ya armada, y varios medios de pago (MP + manuales) ya wireados.
const VALUE_PROPS = [
  {
    icon: PackageSearch,
    title: "Stock real, sin sorpresas",
    description: "Cada variante del catalogo muestra el stock disponible antes de que compres.",
  },
  {
    icon: FileCheck2,
    title: "Cotizacion antes de pagar",
    description: "En un pedido a medida, te confirmamos el precio y recien ahi decidis si pagar.",
  },
  {
    icon: Truck,
    title: "Envios coordinados",
    description: "Te contactamos para coordinar entrega o retiro apenas se confirma el pago.",
  },
  {
    icon: Wallet,
    title: "Pagas como prefieras",
    description: "Mercado Pago, transferencia, o coordinamos el pago contra entrega.",
  },
];

const container = {
  hidden: {},
  // delayChildren mas grande que en otras secciones: esta seccion suele
  // entrar en pantalla justo despues de la timeline de "Como funciona", asi
  // que le damos un respiro antes de arrancar en vez de superponerse.
  show: { transition: { staggerChildren: 0.22, delayChildren: 0.05 } },
};

// Cada tarjeta orquesta su PROPIO stagger interno (icono -> titulo) en vez
// de dejar que icono/titulo de las 4 tarjetas se entrelacen en una sola
// lista plana -- asi el "icono, despues titulo" se lee tarjeta por
// tarjeta, no salteado entre tarjetas distintas.
const card = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

// El icono "viene al frente": arranca mas grande de lo que va a quedar y
// mas cerca (scale > 1), como si se acercara a camara, y se asienta en su
// tamano final -- nunca anima top/left, solo transform/opacity.
const iconWrap = {
  hidden: { opacity: 0, scale: 1.9, y: -6 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 220, damping: 20 } },
};

const title = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const, delay: 0.2 } },
};

// Coreografia de entrada (task #30): 1) el icono aparece "al frente" y se
// asienta en su lugar, 2) el titulo aparece, 3) la descripcion se arma
// palabra por palabra (AnimatedParagraph, con tiempo de sobra para leer),
// 4) una vez asentado, un pulso lento e infinito detras del icono le da esa
// sensacion de "latido"/vida que se pidio, sin volver a animar la entrada.
export function ValueProps() {
  return (
    <section className="border-y border-neutral-200 py-10 dark:border-neutral-800">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={container}
        className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
      >
        {VALUE_PROPS.map((item, index) => (
          <motion.div key={item.title} variants={card} className="flex flex-col items-start gap-2">
            <motion.div variants={iconWrap} className="relative flex h-9 w-9 items-center justify-center">
              {/* Latido continuo: animate (no variants) para que corra
                  independiente en loop una vez que el padre ya es visible
                  -- invisible hasta entonces porque hereda opacity:0 del
                  padre via la cascada normal del DOM. */}
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-md bg-accent/30"
                animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 + 1 }}
              />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-accent/10 text-accent">
                <item.icon size={18} strokeWidth={1.75} aria-hidden="true" />
              </div>
            </motion.div>
            <motion.h3 variants={title} className="font-heading text-sm font-medium">
              {item.title}
            </motion.h3>
            <AnimatedParagraph text={item.description} delay={0.4} className="text-sm text-neutral-500" />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
