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
  unique,
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
  paymentInstructionsMiDinero: text("payment_instructions_mi_dinero"),
  paymentInstructionsPrex: text("payment_instructions_prex"),
  paymentInstructionsContraentrega: text("payment_instructions_contraentrega"),
  // Datos de la tienda + fiscales: descriptivos por ahora (se muestran en
  // /quienes-somos, footer, mail de orden de servicio, etc.) — todavia no
  // hay un motor de facturacion real, invoicePrefix/nextInvoiceNumber son
  // para cuando se necesite numerar comprobantes propios.
  legalName: varchar("legal_name", { length: 200 }),
  taxId: varchar("tax_id", { length: 50 }),
  address: varchar("address", { length: 300 }),
  city: varchar("city", { length: 100 }),
  department: varchar("department", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  // Redes sociales para los iconos del footer (site-footer.tsx). URL
  // completa (ej. "https://instagram.com/tutienda"), nulo = no se muestra
  // ese icono. El de WhatsApp reutiliza contactPhone, no necesita campo
  // aparte.
  instagramUrl: varchar("instagram_url", { length: 300 }),
  facebookUrl: varchar("facebook_url", { length: 300 }),
  invoicePrefix: varchar("invoice_prefix", { length: 20 }),
  nextInvoiceNumber: integer("next_invoice_number").notNull().default(1),
  // Modo vacaciones: si esta prendido, checkoutCart e
  // initiateCustomOrderPayment rechazan nuevas compras y el sitio muestra
  // vacationMessage — el catalogo sigue navegable, solo se bloquea pagar.
  vacationMode: boolean("vacation_mode").notNull().default(false),
  vacationMessage: text("vacation_message"),
  // Puntos y recompensas (ver src/lib/loyalty/actions.ts): cuantos puntos
  // se ganan por cada $100 gastados en una compra confirmada, y cuanto vale
  // 1 punto en pesos al canjearlo por un cupon de descuento. En 0 el
  // sistema queda apagado (no se otorgan puntos nuevos), sin tener que
  // tocar codigo — el owner lo prende cargando una tasa desde
  // /admin/configuracion.
  loyaltyPointsPer100: integer("loyalty_points_per_100").notNull().default(0),
  loyaltyPointValue: numeric("loyalty_point_value", { precision: 12, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userRoleEnum = pgEnum("user_role", ["admin", "empleado", "cliente"]);

// "mercado_pago" confirma sola via webhook. El resto son medios
// manuales/offline (sin integracion de API): el cliente elige uno, recibe
// instrucciones (texto libre configurado en /admin/configuracion) por mail,
// y un admin confirma el pago a mano cuando lo verifica. Declarado aca
// arriba (no junto a `orders` mas abajo) porque users.lastPaymentMethod
// tambien lo usa y las columnas necesitan el enum ya definido en ese punto
// del archivo.
export const paymentMethodEnum = pgEnum("payment_method", [
  "mercado_pago",
  "transferencia",
  "abitab",
  "redpagos",
  "mi_dinero",
  "prex",
  "contra_entrega",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("cliente"),
  phone: varchar("phone", { length: 50 }),
  active: boolean("active").notNull().default(true),
  // Registro de consentimiento (cuando acepto terminos y condiciones al
  // crear la cuenta) — nulo para cuentas creadas antes de que existiera
  // este campo (admin/empleado creados por seed, clientes viejos).
  termsAcceptedAt: timestamp("terms_accepted_at"),
  // "Olvide mi contrasena": en vez de un link con token, se le manda al
  // usuario una contrasena nueva generada por el server, que solo es valida
  // hasta tempPasswordExpiresAt (ver requestPasswordReset en
  // src/lib/auth/actions.ts). mustChangePassword fuerza el redirect a
  // /mi-cuenta/cambiar-contrasena la primera vez que entra con esa
  // temporal, para que no se quede usandola.
  tempPasswordExpiresAt: timestamp("temp_password_expires_at"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  // Ultima direccion de envio usada en un checkout exitoso: se precarga en
  // el Paso 2 del wizard para que el cliente no tenga que volver a tipear
  // todo en cada compra. No es sensible (misma forma que orders.shippingAddress),
  // se pisa cada vez que confirma una compra con una direccion distinta.
  defaultShippingAddress: jsonb("default_shipping_address"),
  defaultShippingZoneId: uuid("default_shipping_zone_id").references((): AnyPgColumn => shippingZones.id),
  // Ultimo medio de pago elegido en un checkout exitoso (mismo criterio que
  // defaultShippingAddress arriba): se precarga en el Paso 3 del wizard para
  // que no tenga que volver a elegirlo cada vez. Nulo = todavia no compro
  // nada, el wizard sigue arrancando en "mercado_pago" por default.
  lastPaymentMethod: paymentMethodEnum("last_payment_method"),
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
  // Especificaciones estructuradas (material, dimensiones, peso, cuidados,
  // etc.), lista libre de filas {label, value} en vez de columnas fijas —
  // no todos los productos comparten los mismos atributos. Se muestran en
  // la pestana "Detalles del producto" de la ficha publica, separado de
  // `description` (que sigue siendo el texto libre de la pestana
  // "Descripcion"). Nulo/vacio = esa pestana no se muestra.
  specs: jsonb("specs").$type<{ label: string; value: string }[]>(),
  // Separado de `specs` (que es descripcion "humana": material, cuidados,
  // etc.) — esta es la solapa "Caracteristicas tecnicas" de la ficha
  // publica: tolerancias, compatibilidad, resistencia, y similares. Mismo
  // formato label/value para reusar el mismo componente de edicion.
  technicalSpecs: jsonb("technical_specs").$type<{ label: string; value: string }[]>(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productMediaTypeEnum = pgEnum("product_media_type", ["image", "video"]);

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
  // "video" = mp4/webm subido por el admin (mismo volumen persistente que
  // el resto de los uploads). El default "image" cubre todas las filas
  // viejas sin tener que migrarlas a mano.
  mediaType: productMediaTypeEnum("media_type").notNull().default("image"),
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
  (table) => [
    check("product_reviews_rating_range", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
    // Un usuario deja como maximo una reseña por producto (puede editarla,
    // no duplicarla).
    unique("product_reviews_product_user_unique").on(table.productId, table.userId),
  ],
);

// Favoritos / lista de deseos: solo para usuarios logueados (a diferencia
// del carrito, no hay version de invitado por cookie — guardar favoritos
// sin cuenta no tiene mucho sentido de negocio y complica menos).
export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique("favorites_user_product_unique").on(table.userId, table.productId)],
);

// --- Puntos y recompensas -----------------------------------------------

export const loyaltyPointsTypeEnum = pgEnum("loyalty_points_type", ["earned", "redeemed"]);

// Ledger simple (solo sumar/restar, sin un campo "balance" separado que se
// pueda desincronizar): el saldo de un usuario es la suma de sus filas
// (earned suma, redeemed resta). Una fila "earned" se crea automaticamente
// cuando una orden pasa a pagado (ver markOrderAsPaid en
// src/lib/orders/mark-paid.ts), usando stores.loyaltyPointsPer100 vigente en
// ese momento — si despues el admin cambia la tasa, no se recalculan puntos
// ya otorgados. Una fila "redeemed" se crea al canjear puntos por un cupon
// de descuento (ver src/lib/loyalty/actions.ts).
export const loyaltyPoints = pgTable("loyalty_points", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  orderId: uuid("order_id").references((): AnyPgColumn => orders.id, { onDelete: "set null" }),
  type: loyaltyPointsTypeEnum("type").notNull(),
  points: integer("points").notNull(), // siempre positivo; el signo lo da `type`
  note: varchar("note", { length: 300 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Cupon de descuento generado al canjear puntos (ver redeemLoyaltyPoints en
// src/lib/loyalty/actions.ts). Personal e intransferible: solo el userId
// dueño lo puede aplicar en /checkout (ver checkoutCart en
// src/lib/orders/actions.ts), y una sola vez (usedAt/usedOrderId se llenan
// al usarlo). Sin fecha de vencimiento por ahora — mantenerlo simple hasta
// que haya un motivo real para agregar una.
export const discountCoupons = pgTable("discount_coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  code: varchar("code", { length: 30 }).notNull().unique(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  pointsSpent: integer("points_spent").notNull(),
  usedAt: timestamp("used_at"),
  usedOrderId: uuid("used_order_id").references((): AnyPgColumn => orders.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Newsletter -------------------------------------------------------

// Suscripcion a promos/novedades desde el footer: solo el mail, sin cuenta
// ni login (puede ser de alguien que ni siquiera compro todavia). Todavia
// no hay motor de envio de campañas — esto solo guarda la lista para que el
// admin la vea/exporte desde /admin/newsletter.
export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id),
    email: varchar("email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique("newsletter_subscribers_store_email_unique").on(table.storeId, table.email)],
);

// --- Notificaciones ---------------------------------------------------

// recipientUserId nulo = notificacion "para todo el staff" de la tienda
// (admin+empleado), no de un usuario puntual — mas simple que insertar una
// fila por cada empleado (y sigue andando si se suma un empleado nuevo
// despues). Con recipientUserId seteado, es para ese cliente puntual (sus
// propios pedidos). No hay tiempo real (websockets/SSE): se lee al navegar,
// mismo criterio de simplicidad que el resto del proyecto (gastos
// operativos = solo el VPS).
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  recipientUserId: uuid("recipient_user_id").references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  link: varchar("link", { length: 300 }),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Envios -----------------------------------------------------------

// Zonas de envio informativas: nombre + costo + cobertura en texto libre
// (no un listado estructurado de departamentos, para no sumar complejidad
// antes de que haga falta). Se muestran en /envios y en /admin/configuracion.
// Todavia no se cobran automaticamente en el checkout (el total de una
// orden sigue siendo solo productos) — eso queda para cuando el checkout
// pida direccion real.
export const shippingZones = pgTable("shipping_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  cost: numeric("cost", { precision: 12, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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

// Pipeline de impresion (reemplaza el viejo "en_preparacion" unico por 4
// pasos mas finos, aplicado tanto a compras de catalogo como a pedidos a
// medida): pagado -> en_cola -> imprimiendo -> postprocesado -> enviado ->
// entregado. El admin avanza el estado a mano desde /admin/pedidos (ver
// ORDER_STATUS_TRANSITIONS en src/lib/orders/actions.ts), sin saltos.
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
  "en_cola",
  "imprimiendo",
  "postprocesado",
  "enviado",
  "entregado",
  "cancelado",
]);

export const orderSourceEnum = pgEnum("order_source", ["catalogo", "pedido_custom"]);

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
  // total ya incluye shippingCost sumado (nunca se recalcula sumandolos por
  // separado en el front) — shippingCost queda aparte solo para poder
  // mostrarlo desglosado en /admin/pedidos y en el mail de confirmacion.
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  shippingZoneId: uuid("shipping_zone_id").references(() => shippingZones.id),
  shippingCost: numeric("shipping_cost", { precision: 12, scale: 2 }).notNull().default("0.00"),
  // Descuento de un cupon de puntos aplicado en el checkout (ver
  // checkoutCart) — ya restado de `total`, se guarda aparte solo para poder
  // mostrarlo desglosado en /admin/pedidos y en /mi-cuenta/compras. Copia
  // del codigo (no solo el id) para que siga siendo legible aunque el cupon
  // se borre despues.
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  couponCode: varchar("coupon_code", { length: 30 }),
  shippingAddress: jsonb("shipping_address"),
  mpPreferenceId: varchar("mp_preference_id", { length: 100 }),
  mpPaymentId: varchar("mp_payment_id", { length: 100 }),
  // Comprobante de pago (ej. captura de la transferencia) que el cliente
  // puede subir despues de crear una orden de servicio, para que el admin
  // lo revise antes de confirmar el pago en /admin/pedidos.
  receiptUrl: varchar("receipt_url", { length: 300 }),
  receiptUploadedAt: timestamp("receipt_uploaded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id),
  productName: varchar("product_name", { length: 200 }).notNull(),
  variantLabel: varchar("variant_label", { length: 200 }),
  // Copia del sku de la variante al momento de la compra (igual criterio que
  // productName/variantLabel: si la variante despues se edita o se borra, la
  // orden sigue mostrando con que codigo se identificaba en ese momento —
  // clave para "quiero el mismo que compre la vez pasada").
  variantSku: varchar("variant_sku", { length: 100 }),
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
