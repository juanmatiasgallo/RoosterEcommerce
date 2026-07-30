"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, Heart, Home, Lock, Menu, MessageCircle, ShoppingBag, UserCircle, Wand2, X } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

type SessionUser = {
  name?: string | null;
  email?: string | null;
};

// Mismo patron que AdminSidebar (src/components/admin-sidebar.tsx): shell
// con sidebar unificado, ahora tambien para el cliente (task #115) -- antes
// /mi-cuenta/* eran paginas sueltas sin navegacion propia, solo accesibles
// desde el menu del avatar en el header. Iconos agregados en task #119 para
// mantener paridad visual con AdminSidebar.
const NAV_ITEMS = [
  { href: "/mi-cuenta/perfil", label: "Mi perfil", icon: UserCircle },
  { href: "/mi-cuenta/compras", label: "Mis compras", icon: ShoppingBag },
  { href: "/mi-cuenta/pedidos", label: "Mis pedidos", icon: Wand2 },
  { href: "/mi-cuenta/favoritos", label: "Favoritos", icon: Heart },
  { href: "/mi-cuenta/preguntas", label: "Mis preguntas", icon: MessageCircle },
  { href: "/mi-cuenta/puntos", label: "Mis puntos", icon: Gift },
  { href: "/mi-cuenta/cambiar-contrasena", label: "Contrasena", icon: Lock },
];

export function ClienteSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function linkClass(href: string) {
    const active = pathname === href || pathname?.startsWith(`${href}/`);
    return `flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors ${
      active
        ? "bg-accent text-accent-foreground"
        : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
    }`;
  }

  return (
    <aside className="border-b border-neutral-200 sm:w-56 sm:shrink-0 sm:border-r sm:border-b-0 dark:border-neutral-800">
      <div className="flex items-center justify-between px-4 py-3 sm:px-3 sm:py-4">
        <div className="flex items-center gap-2.5">
          <div>
            <p className="text-sm font-semibold">Mi cuenta</p>
            <p className="truncate text-xs text-neutral-500">{user.name ?? user.email}</p>
          </div>
          {/* Volver a la tienda / Cerrar sesion (task #125): antes vivian al
              pie del sidebar, habia que scrollear para llegar. Ahora quedan
              arriba, junto al logo, siempre visibles. */}
          <Link
            href="/"
            title="Volver a la tienda"
            aria-label="Volver a la tienda"
            className="flex items-center text-neutral-500 transition-colors hover:text-accent dark:text-neutral-400"
          >
            <Home size={17} strokeWidth={1.75} />
          </Link>
          <LogoutButton variant="icon" />
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Abrir menu"
            className="text-neutral-600 sm:hidden dark:text-neutral-300"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <nav
        className={`flex-col gap-1 px-3 pb-4 sm:flex ${
          menuOpen ? "animate-in fade-in-0 slide-in-from-top-2 flex duration-150" : "hidden"
        }`}
      >
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)} onClick={() => setMenuOpen(false)}>
            <item.icon size={16} strokeWidth={1.75} aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
