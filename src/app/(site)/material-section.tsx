import { getActiveMaterials } from "@/lib/site-content/actions";
import { MaterialSectionClient } from "./material-section-client";

export async function MaterialSection() {
  const items = await getActiveMaterials();
  if (items.length === 0) return null;

  // Por ahora se muestra solo el primero (el caso comun: un unico material
  // destacado, PLA). El schema soporta varios a futuro (otro material =
  // otra fila desde /admin/contenido) sin tocar este componente -- ahi se
  // pasaria a iterar y renderizar un bloque por material.
  return <MaterialSectionClient material={items[0]} />;
}
