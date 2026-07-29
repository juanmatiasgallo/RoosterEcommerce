import Link from "next/link";
import { Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { CategoryTreeNode } from "@/lib/catalog/queries";
import { AnimatedHeading } from "@/components/animated-heading";

export function FeaturedCategories({ categoryTree }: { categoryTree: CategoryTreeNode[] }) {
  if (categoryTree.length === 0) return null;

  return (
    <section className="py-14">
      <AnimatedHeading text="Categorias" className="text-2xl font-semibold" />
      <p className="mt-1 text-neutral-500">Explora el catalogo por tipo de pieza.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categoryTree.map((category, index) => (
          <Link
            key={category.id}
            href={`/?categoryId=${category.id}#catalogo`}
            style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
          >
            <Card className="group flex h-28 flex-col items-center justify-center gap-2 p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-accent hover:shadow-md">
              <Layers
                size={18}
                className="text-neutral-400 transition-colors group-hover:text-accent"
                aria-hidden="true"
              />
              <span className="font-medium">{category.name}</span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
