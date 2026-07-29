"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FolderTree,
  Home,
  LayoutDashboard,
  Mail,
  Menu,
  Package,
  Settings,
  Users,
  Wand2,
  X,
} from "lucide-react";
import type { Role } from "@/lib/auth/schema";
import type { notifications } from "@/lib/db/schema";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

type SessionUser = {
  name?: string | null;
  email?: string | null;
  role: Role;
};

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/pedidos-custom", label: "Pedidos a medida", icon: Wand2 },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
];

// Usuarios y Configuracion son admin-only: Configuracion ya lo era (expone
// credenciales SMTP reales), Usuarios se construye admin-only en el
// proximo prompt (21) — el link ya queda armado aunque la pagina todavia
// no exista.
const ADMIN_ONLY_ITEMS = [
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/configuracion", label: "Configuracion", icon: Settings },
];

export function AdminSidebar({
  user,
  notificationItems = [],
  notificationUnreadCount = 0,
}: {
  user: SessionUser;
  notificationItems?: (typeof notifications.$inferSelect)[];
  notificationUnreadCount?: number;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = user.role === "admin" ? [...NAV_ITEMS, ...ADMIN_ONLY_ITEMS] : NAV_ITEMS;

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
          <Link href="/admin/dashboard" className="text-sm font-semibold">
            Tienda 3D
          </Link>
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
          <NotificationBell initialItems={notificationItems} initialUnreadCount={notificationUnreadCount} />
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
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)} onClick={() => setMenuOpen(false)}>
            <item.icon size={16} strokeWidth={1.75} aria-hidden="true" />
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
      </div>
    </aside>
  );
}
