"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/auth/schema";
import { LogoutButton } from "@/components/logout-button";

type SessionUser = {
  name?: string | null;
  email?: string | null;
  role: Role;
};

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/pedidos-custom", label: "Pedidos a medida" },
];

// Usuarios y Configuracion son admin-only: Configuracion ya lo era (expone
// credenciales SMTP reales), Usuarios se construye admin-only en el
// proximo prompt (21) — el link ya queda armado aunque la pagina todavia
// no exista.
const ADMIN_ONLY_ITEMS = [
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/configuracion", label: "Configuracion" },
];

export function AdminSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = user.role === "admin" ? [...NAV_ITEMS, ...ADMIN_ONLY_ITEMS] : NAV_ITEMS;

  function linkClass(href: string) {
    const active = pathname === href || pathname?.startsWith(`${href}/`);
    return `block rounded px-3 py-2 text-sm ${
      active
        ? "bg-accent text-accent-foreground"
        : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
    }`;
  }

  return (
    <aside className="border-b border-neutral-200 sm:w-56 sm:shrink-0 sm:border-r sm:border-b-0 dark:border-neutral-800">
      <div className="flex items-center justify-between px-4 py-3 sm:px-3 sm:py-4">
        <Link href="/" className="text-sm font-semibold">
          Tienda 3D
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Abrir menu"
          className="text-sm text-neutral-600 sm:hidden dark:text-neutral-300"
        >
          Menu
        </button>
      </div>

      <nav className={`flex-col gap-1 px-3 pb-4 sm:flex ${menuOpen ? "flex" : "hidden"}`}>
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)} onClick={() => setMenuOpen(false)}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div
        className={`flex-col gap-2 border-t border-neutral-200 px-3 py-4 text-sm sm:flex dark:border-neutral-800 ${
          menuOpen ? "flex" : "hidden"
        }`}
      >
        <span className="text-neutral-500">{user.name ?? user.email}</span>
        <LogoutButton />
        <Link href="/" className="text-neutral-500 underline hover:text-accent">
          Volver a la tienda
        </Link>
      </div>
    </aside>
  );
}
