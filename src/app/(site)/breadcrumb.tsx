import Link from "next/link";

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-neutral-500">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            {index > 0 && <span aria-hidden="true">›</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-neutral-800 hover:underline dark:hover:text-neutral-200">
                {item.label}
              </Link>
            ) : (
              <span className="text-neutral-800 dark:text-neutral-200">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
