import { z } from "zod";

// --- Tiempos de entrega -----------------------------------------------------

export const createDeliveryTierSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  rangeLabel: z.string().min(1).max(20),
  unitLabel: z.string().min(1).max(60),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateDeliveryTierSchema = createDeliveryTierSchema.partial().extend({
  active: z.boolean().optional(),
});

// --- Material ----------------------------------------------------------------

const materialFeatureSchema = z.object({
  text: z.string().min(1).max(200),
  positive: z.boolean(),
});

const materialColorSchema = z.object({
  name: z.string().min(1).max(60),
  hex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Formato hex invalido (ej: #1a1a1a)"),
});

export const createMaterialSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  features: z.array(materialFeatureSchema).max(20).default([]),
  colors: z.array(materialColorSchema).max(30).default([]),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateMaterialSchema = createMaterialSchema.partial().extend({
  active: z.boolean().optional(),
});

// --- Servicios -----------------------------------------------------------------

export const createServiceSchema = z.object({
  icon: z.string().min(1).max(40),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateServiceSchema = createServiceSchema.partial().extend({
  active: z.boolean().optional(),
});
