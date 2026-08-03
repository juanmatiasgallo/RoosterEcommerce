"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 20;

// Paginacion client-side sobre un array ya cargado entero (task #146:
// "paginacion en todos los listados"). Ninguna de estas queries pasa por
// limit/offset en el server todavia -- este hook solo corta el array en
// paginas de `pageSize` para la UI, mismo criterio de simplicidad que el
// resto del proyecto (el volumen de una tienda chica no lo justifica hoy).
// Si el volumen de filas crece mucho mas adelante, se puede migrar a
// paginacion real en la query sin tocar <Pagination> (components/ui), solo
// este hook.
export function usePagination<T>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Si la lista de origen cambia (busqueda, archivar/eliminar una fila) y
  // la pagina actual queda vacia, volver a la 1 en vez de mostrar una
  // pagina en blanco.
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, totalPages, pageItems };
}
