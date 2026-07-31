"use client";

import * as React from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

// Wrapper delgado sobre @base-ui/react/tabs, mismo criterio que el resto de
// src/components/ui/*: componentes "copiados" (no un paquete cerrado),
// compuestos sobre Base UI (no Radix). Usado por primera vez en
// /admin/configuracion (rediseno por categorias) -- pensado para
// reutilizarse en cualquier otra pantalla de admin que necesite pestanas.
export const Tabs = BaseTabs.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      className={cn(
        "relative flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTab({ className, ...props }: React.ComponentProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      className={cn(
        "relative shrink-0 px-3 py-2.5 text-sm font-medium whitespace-nowrap text-neutral-500 outline-none transition-colors select-none hover:text-neutral-900 data-[active]:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 dark:data-[active]:text-neutral-100",
        className,
      )}
      {...props}
    />
  );
}

export function TabsIndicator({ className, ...props }: React.ComponentProps<typeof BaseTabs.Indicator>) {
  return (
    <BaseTabs.Indicator
      className={cn(
        "absolute bottom-0 left-0 h-0.5 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] rounded-full bg-accent transition-all duration-200",
        className,
      )}
      {...props}
    />
  );
}

export function TabsPanel({ className, ...props }: React.ComponentProps<typeof BaseTabs.Panel>) {
  return <BaseTabs.Panel className={cn("flex flex-col gap-10 pt-6", className)} {...props} />;
}
