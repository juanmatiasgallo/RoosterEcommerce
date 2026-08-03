import {
  Gamepad2,
  Gift,
  Home,
  Lightbulb,
  Palette,
  PartyPopper,
  Puzzle,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// Set curado (no texto libre), mismo criterio que SERVICE_ICONS en
// site-content/icon-registry.ts: el admin elige de un <select> al cargar un
// proyecto, y esa misma clave se usa en /proyectos (carousel + grilla +
// lightbox) para renderizar el icono real -- evita guardar en la DB un
// nombre de export de lucide-react que podria dejar de existir en una
// version futura de la libreria.
export const PROJECT_THEMES = {
  decoracion: { icon: Home, label: "Decoracion" },
  regalos: { icon: Gift, label: "Regalos" },
  cosplay: { icon: PartyPopper, label: "Cosplay / eventos" },
  juguetes: { icon: Puzzle, label: "Juguetes" },
  gaming: { icon: Gamepad2, label: "Gaming" },
  arte: { icon: Palette, label: "Arte / diseno" },
  repuestos: { icon: Wrench, label: "Repuestos / reparacion" },
  prototipado: { icon: Lightbulb, label: "Prototipado" },
} satisfies Record<string, { icon: LucideIcon; label: string }>;

export type ProjectThemeKey = keyof typeof PROJECT_THEMES;

export const PROJECT_THEME_KEYS = Object.keys(PROJECT_THEMES) as ProjectThemeKey[];

export function getProjectThemeIcon(theme: string | null): LucideIcon {
  if (!theme) return Sparkles;
  return (PROJECT_THEMES as Record<string, { icon: LucideIcon; label: string }>)[theme]?.icon ?? Sparkles;
}

export function getProjectThemeLabel(theme: string | null): string | null {
  if (!theme) return null;
  return (PROJECT_THEMES as Record<string, { icon: LucideIcon; label: string }>)[theme]?.label ?? null;
}
