import { auth } from "@/auth";
import { listCategoryTree } from "@/lib/catalog/queries";
import { getCartItemCount } from "@/lib/cart/actions";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// listCategoryTree consulta la DB: sin esto, el build de Docker en
// EasyPanel intenta pre-renderizar este layout (y todo lo que envuelve) en
// build time y falla (no tiene red hacia la base ahi).
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [categoryTree, session, cartItemCount] = await Promise.all([
    listCategoryTree(),
    auth(),
    getCartItemCount(),
  ]);

  return (
    <>
      <SiteHeader categoryTree={categoryTree} user={session?.user ?? null} cartItemCount={cartItemCount} />
      {children}
      <SiteFooter categoryTree={categoryTree} />
    </>
  );
}
