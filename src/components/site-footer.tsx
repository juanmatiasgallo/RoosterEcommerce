import Link from "next/link";
import type { CategoryTreeNode } from "@/lib/catalog/queries";
import { LogoutButton } from "@/components/logout-button";

type SessionUser = {
  name?: string | null;
  email?: string | null;
} | null;

export function SiteFooter({
  categoryTree,
  user,
}: {
  categoryTree: CategoryTreeNode[];
  user: SessionUser;
}) {
  return (
    <footer className="mt-16 border-t border-neutral-200 py-10 dark:border-neutral-800">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3">
        <div>
          <p className="font-semibold">Tienda 3D</p>
          <p className="mt-2 text-sm text-neutral-500">Catalogo de impresion 3D y pedidos a medida.</p>
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Categorias</p>
          <ul className="mt-2 flex flex-col gap-1">
            {categoryTree.slice(0, 5).map((category) => (
              <li key={category.id}>
                <Link href={`/?categoryId=${category.id}#catalogo`} className="text-sm text-neutral-500 hover:text-accent">
                  {category.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/pedido-a-medida" className="text-sm text-neutral-500 hover:text-accent">
                Pedido a medida
              </Link>
            </li>
            <li>
              {user ? (
                <span className="flex items-center gap-2 text-sm text-neutral-500">
                  {user.name ?? user.email}
                  <LogoutButton />
                </span>
              ) : (
                <Link href="/login" className="text-sm text-neutral-500 hover:text-accent">
                  Iniciar sesion
                </Link>
              )}
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Contacto</p>
          {/* TODO: reemplazar con datos reales de contacto */}
          <ul className="mt-2 flex flex-col gap-1 text-sm text-neutral-500">
            <li>hola@tutienda.example</li>
            <li>+598 00 000 000</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
