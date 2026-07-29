import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Un solo spinner reutilizable para todos los botones con estado "cargando"
// del sitio (antes cada uno solo cambiaba el texto a "Guardando...", sin
// feedback visual) — sr-only en vez de aria-hidden puro para que un lector
// de pantalla igual sepa que hay una carga en curso.
export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <>
      <Loader2 size={size} className={cn("animate-spin", className)} aria-hidden="true" />
      <span className="sr-only">Cargando</span>
    </>
  );
}
