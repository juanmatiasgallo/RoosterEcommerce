import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products, productVariants } from "@/lib/db/schema";
import { getDefaultStoreId } from "@/lib/db/store";
import { NEXT_PRODUCT_CODE_SQL, nextVariantCode } from "./code";

// Catalogo de demostracion amplio para probar el sitio con variedad real de
// categorias/productos antes de tener carga real del cliente (pedido
// explicito: "carga con muchos articulos... catalogo amplio todo en
// español... si tienes referencia uruguay mejor"). Idempotente por slug: se
// puede correr mas de una vez (local o como accion admin en produccion, ver
// seed-demo-actions.ts) sin duplicar nada -- si el slug de una categoria o
// producto ya existe, esa fila se saltea entera (incluidas sus variantes).
//
// Genera `code` igual que createProduct/createVariant (ver code.ts) -- por
// eso este seed tiene que correr DESPUES de la migracion que agrega la
// columna code y la secuencia product_code_seq (task #88), no antes. Antes
// de esa migracion, este archivo directamente no compila (code es NOT NULL
// en el schema), lo cual es la señal correcta de que el orden importa.

type VariantSeed = {
  material: string;
  color?: string;
  size?: string;
  price: string;
  stock: number;
};

type ProductSeed = {
  slug: string;
  name: string;
  description: string;
  basePrice: string;
  variants: VariantSeed[];
};

type CategorySeed = {
  slug: string;
  name: string;
  parentSlug?: string;
  products: ProductSeed[];
};

const CATALOG: CategorySeed[] = [
  {
    slug: "fantasia",
    name: "Fantasia",
    parentSlug: "figuras-y-decoracion",
    products: [
      {
        slug: "figura-articulada-pulpo",
        name: "Figura articulada pulpo",
        description: "Pulpo articulado impreso en una sola pieza, tentaculos con movimiento real.",
        basePrice: "790.00",
        variants: [
          { material: "PLA", color: "Naranja", size: "20cm", price: "790.00", stock: 6 },
          { material: "PLA", color: "Violeta", size: "20cm", price: "790.00", stock: 4 },
          { material: "PETG", color: "Negro", size: "30cm", price: "1090.00", stock: 2 },
        ],
      },
      {
        slug: "busto-gargola-decorativa",
        name: "Busto de gargola decorativa",
        description: "Busto de gargola con acabado detallado, ideal para estanteria o escritorio.",
        basePrice: "1290.00",
        variants: [
          { material: "PLA", color: "Gris piedra", size: "18cm", price: "1290.00", stock: 5 },
          { material: "Resina", color: "Negro", size: "18cm", price: "1890.00", stock: 2 },
        ],
      },
    ],
  },
  {
    slug: "animales",
    name: "Animales",
    parentSlug: "figuras-y-decoracion",
    products: [
      {
        slug: "figura-articulada-zorro",
        name: "Figura articulada zorro",
        description: "Zorro articulado de cuerpo flexible, se imprime y se mueve sin armado.",
        basePrice: "690.00",
        variants: [
          { material: "PLA", color: "Naranja", size: "15cm", price: "690.00", stock: 8 },
          { material: "PLA", color: "Blanco", size: "15cm", price: "690.00", stock: 5 },
        ],
      },
      {
        slug: "miniatura-nandu",
        name: "Miniatura de ñandu",
        description: "Miniatura de ñandu, ave autoctona de nuestros campos, para coleccion o regalo.",
        basePrice: "590.00",
        variants: [
          { material: "PLA", color: "Marron tierra", size: "12cm", price: "590.00", stock: 6 },
          { material: "PLA", color: "Natural", size: "12cm", price: "590.00", stock: 4 },
        ],
      },
    ],
  },
  {
    slug: "mate-y-asado",
    name: "Mate y asado",
    products: [
      {
        slug: "posamate-individual",
        name: "Posamate individual",
        description: "Posamate antideslizante, base estable para no derramar en la mesa o el auto.",
        basePrice: "290.00",
        variants: [
          { material: "PLA", color: "Negro", size: "10cm", price: "290.00", stock: 15 },
          { material: "PLA", color: "Verde botella", size: "10cm", price: "290.00", stock: 12 },
          { material: "PETG", color: "Natural", size: "10cm", price: "350.00", stock: 8 },
        ],
      },
      {
        slug: "base-para-termo",
        name: "Base para termo",
        description: "Base robusta para termo, evita que se caiga con la manija en uso.",
        basePrice: "450.00",
        variants: [
          { material: "PETG", color: "Negro", size: "Estandar", price: "450.00", stock: 10 },
          { material: "PETG", color: "Gris", size: "Estandar", price: "450.00", stock: 7 },
        ],
      },
      {
        slug: "portavirutilla-y-bombilla",
        name: "Portavirutilla y bombilla",
        description: "Soporte de mesa para virutilla y bombilla, higienico y facil de limpiar.",
        basePrice: "390.00",
        variants: [
          { material: "PLA", color: "Blanco", size: "Estandar", price: "390.00", stock: 9 },
          { material: "PLA", color: "Negro", size: "Estandar", price: "390.00", stock: 9 },
        ],
      },
      {
        slug: "cuchillero-de-mesa-asado",
        name: "Cuchillero de mesa para asado",
        description: "Cuchillero de mesa con ranuras individuales, mantiene los cuchillos ordenados y a mano.",
        basePrice: "690.00",
        variants: [
          { material: "PETG", color: "Negro", size: "6 cuchillos", price: "690.00", stock: 5 },
          { material: "PETG", color: "Marron", size: "6 cuchillos", price: "690.00", stock: 4 },
        ],
      },
    ],
  },
  {
    slug: "hogar-y-organizacion",
    name: "Hogar y organizacion",
    products: [
      {
        slug: "organizador-escritorio-modular",
        name: "Organizador de escritorio modular",
        description: "Modulos apilables para ordenar lapices, clips y accesorios de escritorio a medida.",
        basePrice: "590.00",
        variants: [
          { material: "PLA", color: "Blanco", size: "Modulo simple", price: "590.00", stock: 10 },
          { material: "PLA", color: "Negro", size: "Modulo simple", price: "590.00", stock: 10 },
        ],
      },
      {
        slug: "portalapices-geometrico",
        name: "Portalapices geometrico",
        description: "Portalapices de diseño geometrico bajo, liviano y estable sobre cualquier escritorio.",
        basePrice: "350.00",
        variants: [
          { material: "PLA", color: "Celeste", size: "Estandar", price: "350.00", stock: 12 },
          { material: "PLA", color: "Amarillo", size: "Estandar", price: "350.00", stock: 12 },
        ],
      },
      {
        slug: "maceta-autorregante-pequena",
        name: "Maceta autorregante pequeña",
        description: "Maceta con reserva de agua interna, ideal para suculentas y plantas de interior.",
        basePrice: "490.00",
        variants: [
          { material: "PETG", color: "Blanco", size: "10cm", price: "490.00", stock: 14 },
          { material: "PETG", color: "Terracota", size: "10cm", price: "490.00", stock: 10 },
          { material: "PETG", color: "Verde salvia", size: "14cm", price: "650.00", stock: 6 },
        ],
      },
      {
        slug: "soporte-control-remoto",
        name: "Soporte para control remoto",
        description: "Soporte de pared o mesa para controles remotos, se acabaron los controles perdidos.",
        basePrice: "320.00",
        variants: [
          { material: "PLA", color: "Negro", size: "Estandar", price: "320.00", stock: 11 },
          { material: "PLA", color: "Blanco", size: "Estandar", price: "320.00", stock: 11 },
        ],
      },
    ],
  },
  {
    slug: "tecnologia-y-gadgets",
    name: "Tecnologia y gadgets",
    products: [
      {
        slug: "soporte-celular-articulado",
        name: "Soporte para celular articulado",
        description: "Soporte de escritorio con angulo ajustable, compatible con la mayoria de los celulares.",
        basePrice: "490.00",
        variants: [
          { material: "PETG", color: "Negro", size: "Estandar", price: "490.00", stock: 13 },
          { material: "PETG", color: "Gris", size: "Estandar", price: "490.00", stock: 13 },
        ],
      },
      {
        slug: "organizador-cargador-cables",
        name: "Organizador de cargador y cables",
        description: "Base para mantener el cargador y los cables enrollados y ordenados sobre el escritorio.",
        basePrice: "390.00",
        variants: [
          { material: "PLA", color: "Blanco", size: "Estandar", price: "390.00", stock: 15 },
          { material: "PLA", color: "Negro", size: "Estandar", price: "390.00", stock: 15 },
        ],
      },
      {
        slug: "soporte-auriculares",
        name: "Soporte para auriculares",
        description: "Soporte de escritorio para colgar auriculares o headset, base con peso para estabilidad.",
        basePrice: "590.00",
        variants: [
          { material: "PETG", color: "Negro", size: "Estandar", price: "590.00", stock: 9 },
          { material: "PETG", color: "Blanco", size: "Estandar", price: "590.00", stock: 9 },
        ],
      },
      {
        slug: "stand-para-notebook",
        name: "Stand para notebook",
        description: "Elevador de notebook plegable, mejora la ventilacion y la postura al trabajar.",
        basePrice: "990.00",
        variants: [
          { material: "PETG", color: "Negro", size: "Estandar", price: "990.00", stock: 6 },
          { material: "PETG", color: "Gris", size: "Estandar", price: "990.00", stock: 6 },
        ],
      },
    ],
  },
  {
    slug: "jardin-y-exterior",
    name: "Jardin y exterior",
    products: [
      {
        slug: "maceta-colgante-con-gancho",
        name: "Maceta colgante con gancho",
        description: "Maceta liviana con gancho integrado para colgar en balcones o patios.",
        basePrice: "450.00",
        variants: [
          { material: "PETG", color: "Verde", size: "12cm", price: "450.00", stock: 10 },
          { material: "PETG", color: "Blanco", size: "12cm", price: "450.00", stock: 10 },
        ],
      },
      {
        slug: "regadera-mini-precision",
        name: "Regadera mini de precision",
        description: "Regadera pequeña de pico fino, ideal para plantines y almacigos.",
        basePrice: "390.00",
        variants: [
          { material: "PETG", color: "Verde", size: "500ml", price: "390.00", stock: 8 },
          { material: "PETG", color: "Amarillo", size: "500ml", price: "390.00", stock: 8 },
        ],
      },
      {
        slug: "marcadores-plantas-set-x6",
        name: "Marcadores de plantas (set x6)",
        description: "Set de 6 marcadores para identificar almacigos y canteros, reutilizables.",
        basePrice: "290.00",
        variants: [{ material: "PETG", color: "Blanco", size: "Set x6", price: "290.00", stock: 12 }],
      },
    ],
  },
  {
    slug: "mascotas",
    name: "Mascotas",
    products: [
      {
        slug: "comedero-doble-mascotas",
        name: "Comedero doble para mascotas",
        description: "Comedero de dos bocas para agua y alimento, base antideslizante.",
        basePrice: "690.00",
        variants: [
          { material: "PETG", color: "Blanco", size: "Chico", price: "690.00", stock: 7 },
          { material: "PETG", color: "Negro", size: "Grande", price: "890.00", stock: 5 },
        ],
      },
      {
        slug: "dispensador-premios-perro",
        name: "Dispensador de premios para perro",
        description: "Juguete rellenable que libera premios de a poco, entretiene mientras estimula.",
        basePrice: "590.00",
        variants: [
          { material: "PETG", color: "Azul", size: "Estandar", price: "590.00", stock: 9 },
          { material: "PETG", color: "Rojo", size: "Estandar", price: "590.00", stock: 9 },
        ],
      },
      {
        slug: "placa-identificadora-personalizable",
        name: "Placa identificadora personalizable",
        description: "Placa liviana para collar, se personaliza con nombre y telefono a pedido.",
        basePrice: "250.00",
        variants: [
          { material: "PETG", color: "Negro", size: "Chica", price: "250.00", stock: 20 },
          { material: "PETG", color: "Rosa", size: "Chica", price: "250.00", stock: 20 },
        ],
      },
    ],
  },
  {
    slug: "regalos-y-souvenirs",
    name: "Regalos y souvenirs",
    products: [
      {
        slug: "llavero-silueta-uruguay",
        name: "Llavero silueta Uruguay",
        description: "Llavero con la silueta del pais, terminacion prolija, ideal como recuerdo o regalo.",
        basePrice: "250.00",
        variants: [
          { material: "PLA", color: "Celeste", size: "Estandar", price: "250.00", stock: 25 },
          { material: "PLA", color: "Blanco", size: "Estandar", price: "250.00", stock: 25 },
        ],
      },
      {
        slug: "portarretrato-geometrico",
        name: "Portarretrato geometrico",
        description: "Portarretrato de lineas geometricas, para foto de 10x15cm.",
        basePrice: "450.00",
        variants: [
          { material: "PLA", color: "Blanco", size: "10x15cm", price: "450.00", stock: 10 },
          { material: "PLA", color: "Negro", size: "10x15cm", price: "450.00", stock: 10 },
        ],
      },
      {
        slug: "trofeo-personalizado-mini",
        name: "Trofeo personalizado mini",
        description: "Trofeo chico personalizable con texto, para reconocimientos y regalos con humor.",
        basePrice: "390.00",
        variants: [
          { material: "PLA", color: "Dorado", size: "12cm", price: "390.00", stock: 8 },
          { material: "PLA", color: "Plateado", size: "12cm", price: "390.00", stock: 8 },
        ],
      },
    ],
  },
  {
    slug: "herramientas-y-utilidades",
    name: "Herramientas y utilidades",
    products: [
      {
        slug: "organizador-tornillos-brocas",
        name: "Organizador de tornillos y brocas",
        description: "Organizador de compartimentos para tornillos, brocas y accesorios chicos de taller.",
        basePrice: "590.00",
        variants: [
          { material: "PETG", color: "Negro", size: "24 compartimentos", price: "590.00", stock: 6 },
          { material: "PETG", color: "Gris", size: "24 compartimentos", price: "590.00", stock: 6 },
        ],
      },
      {
        slug: "soporte-destornilladores",
        name: "Soporte para destornilladores",
        description: "Soporte de pared o banco de trabajo, mantiene los destornilladores ordenados y visibles.",
        basePrice: "450.00",
        variants: [{ material: "PETG", color: "Negro", size: "8 lugares", price: "450.00", stock: 7 }],
      },
      {
        slug: "ganchos-multiuso-pared-set-x4",
        name: "Ganchos multiuso para pared (set x4)",
        description: "Set de 4 ganchos resistentes para herramientas, bicicletas o utensilios de cocina.",
        basePrice: "350.00",
        variants: [{ material: "PETG", color: "Negro", size: "Set x4", price: "350.00", stock: 14 }],
      },
    ],
  },
];

export type SeedDemoCatalogSummary = {
  categoriesCreated: number;
  categoriesSkipped: number;
  productsCreated: number;
  productsSkipped: number;
};

export async function seedDemoCatalog(): Promise<SeedDemoCatalogSummary> {
  const storeId = await getDefaultStoreId();
  const summary: SeedDemoCatalogSummary = {
    categoriesCreated: 0,
    categoriesSkipped: 0,
    productsCreated: 0,
    productsSkipped: 0,
  };

  const categoryIdBySlug = new Map<string, string>();

  // Primera pasada: categorias top-level y con padre ya resuelto entre si
  // mismas en este archivo (todas las parentSlug referenciadas son o bien
  // "figuras-y-decoracion", que ya existe del seed original, o no tienen
  // padre) -- no hace falta ordenar topologicamente mas alla de eso.
  const [figurasYDecoracion] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, "figuras-y-decoracion"))
    .limit(1);
  if (figurasYDecoracion) categoryIdBySlug.set("figuras-y-decoracion", figurasYDecoracion.id);

  for (const categorySeed of CATALOG) {
    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, categorySeed.slug))
      .limit(1);

    if (existing) {
      categoryIdBySlug.set(categorySeed.slug, existing.id);
      summary.categoriesSkipped++;
      continue;
    }

    const parentId = categorySeed.parentSlug ? categoryIdBySlug.get(categorySeed.parentSlug) : undefined;
    const [created] = await db
      .insert(categories)
      .values({ storeId, name: categorySeed.name, slug: categorySeed.slug, parentId })
      .returning();
    categoryIdBySlug.set(categorySeed.slug, created.id);
    summary.categoriesCreated++;
  }

  for (const categorySeed of CATALOG) {
    const categoryId = categoryIdBySlug.get(categorySeed.slug);

    for (const productSeed of categorySeed.products) {
      const [existing] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.slug, productSeed.slug))
        .limit(1);

      if (existing) {
        summary.productsSkipped++;
        continue;
      }

      const [createdProduct] = await db
        .insert(products)
        .values({
          storeId,
          categoryId,
          slug: productSeed.slug,
          code: NEXT_PRODUCT_CODE_SQL,
          name: productSeed.name,
          description: productSeed.description,
          basePrice: productSeed.basePrice,
        })
        .returning();

      // Secuencial, no Promise.all: nextVariantCode cuenta variantes ya
      // insertadas del producto para calcular el sufijo (A, B, C...), asi
      // que insertar en paralelo pisaria el mismo indice para todas.
      for (const variant of productSeed.variants) {
        const variantCode = await nextVariantCode(createdProduct.id, createdProduct.code);
        await db.insert(productVariants).values({
          productId: createdProduct.id,
          code: variantCode,
          material: variant.material,
          color: variant.color,
          size: variant.size,
          price: variant.price,
          stock: variant.stock,
        });
      }

      summary.productsCreated++;
    }
  }

  return summary;
}
