import {
  Boxes,
  Package,
  PenTool,
  Recycle,
  Ruler,
  Search,
  Settings2,
  Sparkles,
  Truck,
  UploadCloud,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// Set curado (no texto libre): el admin elige de un <select> al crear un
// servicio, y esta misma clave se usa en la home para renderizar el icono
// real -- evita guardar en la DB un nombre de export de lucide-react que
// podria dejar de existir en una version futura de la libreria.
export const SERVICE_ICONS = {
  upload: { icon: UploadCloud, label: "Subida de archivo" },
  search: { icon: Search, label: "Busqueda" },
  package: { icon: Package, label: "Paquete / cantidad" },
  wrench: { icon: Wrench, label: "Reparacion / repuesto" },
  design: { icon: PenTool, label: "Diseno" },
  boxes: { icon: Boxes, label: "Multiples piezas" },
  ruler: { icon: Ruler, label: "Medidas / precision" },
  settings: { icon: Settings2, label: "Personalizacion" },
  sparkles: { icon: Sparkles, label: "Terminacion / calidad" },
  truck: { icon: Truck, label: "Envio" },
  recycle: { icon: Recycle, label: "Material / sustentable" },
} satisfies Record<string, { icon: LucideIcon; label: string }>;

export type ServiceIconKey = keyof typeof SERVICE_ICONS;

export const SERVICE_ICON_KEYS = Object.keys(SERVICE_ICONS) as ServiceIconKey[];

export function getServiceIcon(key: string): LucideIcon {
  return (SERVICE_ICONS as Record<string, { icon: LucideIcon; label: string }>)[key]?.icon ?? Package;
}
