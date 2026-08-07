import type { categories } from "@/lib/db/schema";

// Separado de queries.ts a proposito (fix de build, no relacionado al
// icono/Hero de esta tanda de cambios): queries.ts importa `db` desde
// "@/lib/db" (el driver `postgres`, que usa modulos nativos de Node --
// fs/net/tls/perf_hooks). catalog-client.tsx ("use client") importaba
// findCategoryPath directo de queries.ts -- como no es "use server", el
// bundler no puede separar esa funcion pura del resto del modulo, y arrastra
// TODO el archivo (incluido el import de `db`) al bundle del navegador,
// donde esos modulos de Node no existen. Resultado: "Module not found:
// Can't resolve 'fs'/'net'/'tls'/'perf_hooks'" en `npm run build`.
//
// Este archivo solo importa el TYPE de `categories` (drizzle-orm/pg-core,
// sin driver real, se borra en compile time) y no tiene ningun import con
// efectos de runtime -- es seguro de importar desde un Client Component.
// queries.ts re-exporta desde aca para que el resto del codigo (que ya
// importaba CategoryTreeNode/findCategoryPath desde "@/lib/catalog/queries")
// siga funcionando sin tocar cada call site.

export type CategoryTreeNode = typeof categories.$inferSelect & { children: CategoryTreeNode[] };

// Camino desde la raiz hasta la categoria buscada (para el breadcrumb
// "Inicio > Categoria > Subcategoria"). null si no aparece en el arbol.
export function findCategoryPath(tree: CategoryTreeNode[], categoryId: string): CategoryTreeNode[] | null {
  for (const node of tree) {
    if (node.id === categoryId) return [node];

    const childPath = findCategoryPath(node.children, categoryId);
    if (childPath) return [node, ...childPath];
  }

  return null;
}
