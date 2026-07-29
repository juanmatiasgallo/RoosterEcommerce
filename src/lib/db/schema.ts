import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  varchar,
  numeric,
  integer,
  serial,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  check,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Nota multi-tenant: hoy la tienda es una sola empresa, pero dejamos
// `storeId` en las tablas de catalogo/pedidos desde el dia uno (fijo a un
// unico registro en `stores` por ahora). El dia que este proyecto se
// replique para otro cliente, la migracion es agregar filas a `stores` y
// filtrar por storeId en las queries (mismo patron que `companyId` en
// ChickenHouseContab), no reescribir el schema.
// ---------------------------------------------------------------------------

export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  // Config SMTP, 1:1 con la tienda (por eso vive aca y no en tabla aparte).
  // smtpPasswordEncrypted es el resultado de encrypt() (src/lib/crypto.ts),
  // nunca texto plano. Todos nullable: la tienda puede no tener SMTP
  // configurado todavia.
  smtpHost: varchar("smtp_host", { length: 255 }),
  smtpPort: integer("smtp_port"),
  smtpUser: varchar("smtp_user", { length: 255 }),
  smtpPasswordEncrypted: text("smtp_password_encrypted"),
  smtpFromEmail: varchar("smtp_from_email", { length: 255 }),
  smtpFromName: varchar("smtp_from_name", { length: 200 }),
  smtpSecure: boolean("smtp_secure").notNull().default(false),
  // Mercado Pago, mismo patron que SMTP arriba: access token y webhook
  // secret encriptados (nunca en texto plano), la public key no es sensible
  // (se usa del lado del cliente) asi que va directo. Todos nullable: si no
  // estan seteados, src/lib/mercadopago/client.ts cae a las env vars
  // MP_ACCESS_TOKEN / MP_WEBHOOK_SECRET (no rompe el deploy que ya las usa).
  mpAccessTokenEncrypted: text("mp_access_token_encrypted"),
  mpPublicKey: varchar("mp_public_key", { length: 200 }),
  mpWebhookSecretEncrypted: text("mp_webhook_secret_encrypted"),
  // Instrucciones de pago para los medios manuales (texto libre, no
  // sensible: se le muestra tal cual al cliente en el checkout y en el
  // mail). Nulo/vacio = ese medio no se ofrece en el checkout todavia (ver
  // getAvailableManualPaymentMethods en src/lib/orders/actions.ts) — asi se
  // evita mostrar una opcion de pago sin datos reales detras.
  paymentInstructionsTransferencia: text("payment_instructions_transferencia"),
  paymentInstructionsAbitab: text("payment_instructions_abitab"),
  paymentInstructionsRedpagos: text("payment_instructions_redpagos"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userRoleEnum = pgEnum("user_role", ["admin", "empleado", "cliente"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("cliente"),
  phone: varchar("phone", { length: 50 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Catalogo -----------------------------------------------------------

// Arbol padre/hijo: parentId nulo = categoria de primer nivel.
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  parentId: uuid("parent_id").references((): AnyPgColumn => categories.id),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull().unique(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  slug: varchar("slug", { length: 220 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  categoryId: uuid("category_id").references(() => categories.id),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
});

// Variante concreta comprable: material + color + tamano, con su propio
// precio (puede diferir del basePrice) y stock.
export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  material: varchar("material", { length: 50 }).notNull(), // PLA, PETG, Resina...
  color: varchar("color", { length: 50 }),
  size: varchar("size", { length: 50 }), // ej. "15cm", "25cm"
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  sku: varchar("sku", { length: 100 }),
  active: boolean("active").notNull().default(true),
});

// Solo la tabla por ahora (spec-homepage-ux.md): sin query, action ni UI
// todavia. Se implementa completo cuando haya compradores reales.
export const productReviews = pgTable(
  "product_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    verifiedPurchase: boolean("verified_purchase").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [check("product_reviews_rating_range", sql`${table.rating} >= 1 AND ${table.rating} <= 5`)],
);

// --- Carrito --------------------------------------------------------------

// Un carrito pertenece a userId O a guestId (invitado sin login, ver
// src/lib/cart/actions.ts), nunca a ninguno o a los dos — el CHECK de abajo
// hace cumplir esa regla a nivel DB, no solo en el codigo de la action.
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    guestId: uuid("guest_id"),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "cart_items_owner_xor",
      sql`(${table.userId} IS NOT NULL AND ${table.guestId} IS NULL) OR (${table.userId} IS NULL AND ${table.guestId} IS NOT NULL)`,
    ),
  ],
);

// --- Pedidos a medida (cotizacion) ----------------------------------------

export const customOrderStatusEnum = pgEnum("custom_order_status", [
  "pendiente",   // el cliente lo envio, esperando cotizacion
  "cotizado",    // el admin le puso precio, esperando que el cliente pague
  "pagado",      // Mercado Pago confirmo el pago (via webhook)
  "en_impresion",
  "listo",
  "entregado",
  "rechazado",   // el admin decide que no se puede cotizar/imprimir
  "cancelado",   // el cliente lo cancelo antes de pagar
]);

export const customOrders = pgTable("custom_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  fileUrl: text("file_url").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  material: varchar("material", { length: 50 }),
  color: varchar("color", { length: 50 }),
  quantity: integer("quantity").notNull().default(1),
  approxSize: varchar("approx_size", { length: 100 }),
  notes: text("notes"),
  status: customOrderStatusEnum("status").notNull().default("pendiente"),
  quotedPrice: numeric("quoted_price", { precision: 12, scale: 2 }),
  quotedNotes: text("quoted_notes"),
  quotedAt: timestamp("quoted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Pedidos confirmados / pagos ------------------------------------------

export const orderStatusEnum = pgEnum("order_status", [
  "pendiente_pago",
  // El cliente eligio un medio de pago manual (no Mercado Pago): la orden
  // ("orden de servicio") ya existe y se le mandaron las instrucciones por
  // mail, pero nadie confirmo todavia que el dinero llego. Solo un admin
  // puede pasarla a "pagado" a mano (ver updateOrderStatus/confirmManualPayment
  // en src/lib/orders/actions.ts) — a diferencia de Mercado Pago, aca no hay
  // webhook que lo haga solo.
  "pendiente_confirmacion",
  "pagado",
  "en_preparacion",
  "enviado",
  "entregado",
  "cancelado",
]);

export const orderSourceEnum = pgEnum("order_source", ["catalogo", "pedido_custom"]);

// "mercado_pago" confirma sola via webhook. Las otras tres son medios
// manuales/offline (sin integracion de API): el cliente elige una, recibe
// instrucciones (texto libre configurado en /admin/configuracion) por mail,
// y un admin confirma el pago a mano cuando lo verifica.
export const paymentMethodEnum = pgEnum("payment_method", ["mercado_pago", "transferencia", "abitab", "redpagos"]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Numero corto y secuencial para mostrarle al cliente/admin ("Orden
  // #1042") en vez del uuid — mas facil de comunicar por telefono/WhatsApp
  // al coordinar un pago manual.
  orderNumber: serial("order_number").notNull(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  source: orderSourceEnum("source").notNull().default("catalogo"),
  customOrderId: uuid("custom_order_id").references(() => customOrders.id),
  status: orderStatusEnum("status").notNull().default("pendiente_pago"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("mercado_pago"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  shippingAddress: jsonb("shipping_address"),
  mpPreferenceId: varchar("mp_preference_id", { length: 100 }),
  mpPaymentId: varchar("mp_payment_id", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id),
  productName: varchar("product_name", { length: 200 }).notNull(),
  variantLabel: varchar("variant_label", { length: 200 }),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
});

// --- Auditoria (mismo patron que ChickenHouseContab) -----------------------

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: uuid("entity_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
