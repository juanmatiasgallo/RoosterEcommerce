import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { CategoryTreeNode } from "@/lib/catalog/queries";

export function FeaturedCategories({ categoryTree }: { categoryTree: CategoryTreeNode[] }) {
  if (categoryTree.length === 0) return null;

  return (
    <section className="py-10">
      <h2 className="text-2xl font-semibold">Categorias</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categoryTree.map((category) => (
          <Link key={category.id} href={`/?categoryId=${category.id}#catalogo`}>
            <Card className="flex h-28 items-center justify-center p-4 text-center transition hover:border-accent hover:shadow-md">
              <span className="font-medium">{category.name}</span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
