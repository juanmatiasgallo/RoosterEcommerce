import { getActiveServices } from "@/lib/site-content/actions";
import { ServicesSectionClient } from "./services-section-client";

// Server Component: trae los servicios activos (editables desde
// /admin/contenido) y se los pasa al cliente animado. Si todavia no hay
// ninguno cargado (tabla vacia, ej. justo despues de un delete masivo) la
// seccion no se renderiza -- no tiene sentido mostrar un titulo sin
// contenido debajo.
export async function ServicesSection() {
  const services = await getActiveServices();
  if (services.length === 0) return null;

  return <ServicesSectionClient services={services} />;
}
