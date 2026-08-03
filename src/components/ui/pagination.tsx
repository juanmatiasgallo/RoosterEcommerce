import { ChevronLeft, ChevronRight } from "lucide-react";

// Componente chico y reusable (task #146) para todos los listados
// paginados client-side por usePagination (ver src/hooks/use-pagination.ts).
// Se esconde solo si hay una sola pagina, para no ensuciar listas cortas.
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 rounded border border-neutral-300 px-2.5 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        <ChevronLeft size={16} /> Anterior
      </button>
      <p className="text-sm text-neutral-500">
        Pagina {page} de {totalPages}
      </p>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 rounded border border-neutral-300 px-2.5 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        Siguiente <ChevronRight size={16} />
      </button>
    </div>
  );
}
