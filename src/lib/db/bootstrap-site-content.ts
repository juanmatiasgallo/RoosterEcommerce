import { eq } from "drizzle-orm";
import { db } from "./index";
import { deliveryTiers, materials, services, stores } from "./schema";

/**
 * Siembra el contenido inicial de la home (tiempos de entrega, material,
 * servicios) la primera vez que arranca el contenedor -- mismo patron que
 * bootstrapAdmin: idempotente (solo inserta si la tabla esta vacia para esa
 * tienda), sin pasos manuales en el VPS. Una vez sembrado, el owner lo edita
 * desde /admin/contenido; este bootstrap no vuelve a tocar filas existentes.
 */
export async function bootstrapSiteContent() {
  const [store] = await db.select().from(stores).limit(1);
  if (!store) return;

  await seedDeliveryTiers(store.id);
  await seedMaterials(store.id);
  await seedServices(store.id);
}

async function seedDeliveryTiers(storeId: string) {
  const [existing] = await db.select({ id: deliveryTiers.id }).from(deliveryTiers).where(eq(deliveryTiers.storeId, storeId)).limit(1);
  if (existing) return;

  await db.insert(deliveryTiers).values([
    {
      storeId,
      title: "Pieza pequeña",
      description: "Llaveros, accesorios, piezas pequeñas de hasta ~30g de filamento.",
      rangeLabel: "1–2",
      unitLabel: "días hábiles",
      sortOrder: 0,
    },
    {
      storeId,
      title: "Pieza mediana",
      description: "Macetas, soportes, organizadores. Piezas de tamaño intermedio.",
      rangeLabel: "2–4",
      unitLabel: "días hábiles",
      sortOrder: 1,
    },
    {
      storeId,
      title: "Pedido grande",
      description: "Multiples piezas, piezas complejas o pedidos en cantidad para negocios.",
      rangeLabel: "5–7",
      unitLabel: "días o acuerdo",
      sortOrder: 2,
    },
  ]);
}

async function seedMaterials(storeId: string) {
  const [existing] = await db.select({ id: materials.id }).from(materials).where(eq(materials.storeId, storeId)).limit(1);
  if (existing) return;

  await db.insert(materials).values({
    storeId,
    name: "PLA estándar",
    description:
      "El PLA es el material mas usado en impresion 3D FDM. Resistente, liviano, y disponible en multiples colores. Ideal para uso cotidiano, decoracion, y piezas funcionales.",
    features: [
      { text: "Resistente y liviano para uso diario", positive: true },
      { text: "Apto para decoracion e interiores", positive: true },
      { text: "Disponible en 6 colores estandar", positive: true },
      { text: "Otros colores con pedido previo", positive: true },
      { text: "No apto para exposicion a altas temperaturas", positive: false },
    ],
    colors: [
      { name: "Negro", hex: "#1a1a1a" },
      { name: "Blanco", hex: "#f5f5f5" },
      { name: "Gris", hex: "#9e9e9e" },
      { name: "Rojo", hex: "#d32f2f" },
      { name: "Azul", hex: "#1976d2" },
      { name: "Amarillo", hex: "#fbc02d" },
    ],
    sortOrder: 0,
  });
}

async function seedServices(storeId: string) {
  const [existing] = await db.select({ id: services.id }).from(services).where(eq(services.storeId, storeId)).limit(1);
  if (existing) return;

  await db.insert(services).values([
    {
      storeId,
      icon: "upload",
      title: "Imprimimos tu diseño",
      description: "Si tenes un archivo .STL, .OBJ o .3MF lo imprimimos tal cual. Tambien aceptamos referencias o fotos.",
      sortOrder: 0,
    },
    {
      storeId,
      icon: "search",
      title: "Buscamos el modelo por vos",
      description: "Buscamos en Thingiverse, Printables y otros sitios el modelo ideal. Sin costo extra por la busqueda.",
      sortOrder: 1,
    },
    {
      storeId,
      icon: "design",
      title: "Diseño 3D",
      description: "¿No tenes un archivo propio? Diseñamos la pieza desde cero segun lo que necesites.",
      sortOrder: 2,
    },
    {
      storeId,
      icon: "boxes",
      title: "Pedidos en cantidad",
      description: "Para negocios, ferreterias o eventos. Series de piezas iguales con descuento por volumen.",
      sortOrder: 3,
    },
    {
      storeId,
      icon: "wrench",
      title: "Piezas tecnicas y repuestos",
      description: "¿Rompiste algo y no conseguis el repuesto? Lo imprimimos. Soportes, carcasas, piezas a medida.",
      sortOrder: 4,
    },
  ]);
}
