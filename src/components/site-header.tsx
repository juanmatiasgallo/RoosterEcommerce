"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ShoppingCart } from "lucide-react";
import type { CategoryTreeNode } from "@/lib/catalog/queries";
import type { Role } from "@/lib/auth/schema";
import type { notifications } from "@/lib/db/schema";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notification-bell";

function initialsOf(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

function CartIcon({ cartItemCount }: { cartItemCount: number }) {
  return (
    <Link href="/carrito" aria-label="Carrito" className="relative flex items-center text-neutral-600 hover:text-accent dark:text-neutral-300">
      <ShoppingCart size={20} />
      {cartItemCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-foreground">
          {cartItemCount > 99 ? "99+" : cartItemCount}
        </span>
      )}
    </Link>
  );
}

function UserAvatarMenu({
  user,
  accountHref,
  accountLabel,
}: {
  user: { name?: string | null; email?: string | null };
  accountHref: string;
  accountLabel: string;
}) {
  return (
    <details className="relative">
      <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white [&::-webkit-details-marker]:hidden dark:bg-neutral-100 dark:text-neutral-900">
        {initialsOf(user.name, user.email)}
      </summary>
      <div className="absolute top-full right-0 z-10 mt-2 flex min-w-48 flex-col gap-1 rounded border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        <p className="truncate px-2 py-1 text-xs text-neutral-500">{user.name ?? user.email}</p>
        <Link href={accountHref} className="rounded px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
          {accountLabel}
        </Link>
        <Link
          href="/mi-cuenta/cambiar-contrasena"
          className="rounded px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Cambiar contrasena
        </Link>
        <div className="px-2 py-1.5">
          <LogoutButton />
        </div>
      </div>
    </details>
  );
}

type SessionUser = {
  name?: string | null;
  email?: string | null;
  role: Role;
} | null;

const linkClass = "text-sm text-neutral-600 hover:text-accent dark:text-neutral-300";
// Sin marker nativo (list-none + ocultar el de WebKit): el ChevronDown de al
// lado hace de indicador de que es un desplegable.
const summaryClass = `${linkClass} flex cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden`;

function CategoryLinks({ categoryTree, onSelect }: { categoryTree: CategoryTreeNode[]; onSelect?: () => void }) {
  if (categoryTree.length === 0) {
    return <span className="px-2 py-1 text-sm text-neutral-500">Sin categorias todavia</span>;
  }
  return (
    <>
      {categoryTree.map((category) => (
        <Link
          key={category.id}
          href={`/?categoryId=${category.id}#catalogo`}
          onClick={onSelect}
          className="rounded px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {category.name}
        </Link>
      ))}
    </>
  );
}

export function SiteHeader({
  categoryTree,
  user,
  cartItemCount,
  notificationItems = [],
  notificationUnreadCount = 0,
}: {
  categoryTree: CategoryTreeNode[];
  user: SessionUser;
  cartItemCount: number;
  notificationItems?: (typeof notifications.$inferSelect)[];
  notificationUnreadCount?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // No existe todavia un /admin (index) que redirija segun rol, por eso el
  // destino real es /admin/dashboard, que ya es el hub del panel de admin.
  const isStaff = user?.role === "admin" || user?.role === "empleado";
  const accountHref = user ? (isStaff ? "/admin/dashboard" : "/mi-cuenta/pedidos") : null;
  const accountLabel = isStaff ? "Panel" : "Mis pedidos";
  const cartLabel = `Carrito${cartItemCount > 0 ? ` (${cartItemCount})` : ""}`;

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold">
          Tienda 3D
        </Link>

        <nav className="hidden items-center gap-4 sm:flex">
          <details className="relative">
            <summary className={summaryClass}>
              Categorias
              <ChevronDown size={14} />
            </summary>
            <div className="absolute top-full left-0 z-10 mt-2 flex min-w-44 flex-col gap-1 rounded border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
              <CategoryLinks categoryTree={categoryTree} />
            </div>
          </details>

          {/* Ofertas: placeholder sin link real (el catalogo todavia no
              tiene el concepto de descuento, paso aparte). Solo visible para
              clientes logueados — a un invitado no le sirve ver una promesa
              de algo que no puede usar sin cuenta. */}
          {user?.role === "cliente" && (
            <span
              aria-disabled="true"
              className="cursor-not-allowed text-sm text-neutral-400 opacity-50 dark:text-neutral-600"
            >
              Ofertas
            </span>
          )}

          <Link href="/pedido-a-medida" className={linkClass}>
            Pedido a medida
          </Link>
        </nav>

        <div className="hidden items-center gap-4 sm:flex">
          {user && <NotificationBell initialItems={notificationItems} initialUnreadCount={notificationUnreadCount} />}
          <CartIcon cartItemCount={cartItemCount} />

          {user && accountHref ? (
            <UserAvatarMenu user={user} accountHref={accountHref} accountLabel={accountLabel} />
          ) : (
            <Link href="/login" className={linkClass}>
              Iniciar sesion
            </Link>
          )}
        </div>

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

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-neutral-200 px-4 py-3 sm:hidden dark:border-neutral-800">
          <details>
            <summary className="flex cursor-pointer list-none items-center gap-1 py-1 text-sm text-neutral-600 [&::-webkit-details-marker]:hidden dark:text-neutral-300">
              Categorias
              <ChevronDown size={14} />
            </summary>
            <div className="flex flex-col gap-1 pl-3">
              <CategoryLinks categoryTree={categoryTree} onSelect={() => setMenuOpen(false)} />
            </div>
          </details>

          {user?.role === "cliente" && (
            <span aria-disabled="true" className="cursor-not-allowed py-1 text-sm text-neutral-400 opacity-50 dark:text-neutral-600">
              Ofertas
            </span>
          )}

          <Link
            href="/pedido-a-medida"
            className="py-1 text-sm text-neutral-600 dark:text-neutral-300"
            onClick={() => setMenuOpen(false)}
          >
            Pedido a medida
          </Link>
          <Link
            href="/carrito"
            className="py-1 text-sm text-neutral-600 dark:text-neutral-300"
            onClick={() => setMenuOpen(false)}
          >
            {cartLabel}
          </Link>
          {accountHref && (
            <Link
              href={accountHref}
              className="py-1 text-sm text-neutral-600 dark:text-neutral-300"
              onClick={() => setMenuOpen(false)}
            >
              {accountLabel}
            </Link>
          )}
          {user && (
            <Link
              href="/mi-cuenta/cambiar-contrasena"
              className="py-1 text-sm text-neutral-600 dark:text-neutral-300"
              onClick={() => setMenuOpen(false)}
            >
              Cambiar contrasena
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-2 py-1 text-sm text-neutral-500">
              {user.name ?? user.email}
              <LogoutButton />
            </div>
          ) : (
            <Link
              href="/login"
              className="py-1 text-sm text-neutral-600 dark:text-neutral-300"
              onClick={() => setMenuOpen(false)}
            >
              Iniciar sesion
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
