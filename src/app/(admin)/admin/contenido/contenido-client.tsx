"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { z } from "zod";
import {
  createDeliveryTierSchema,
  createMaterialSchema,
  createServiceSchema,
} from "@/lib/site-content/schema";
import {
  createDeliveryTier,
  createMaterial,
  createService,
  deleteDeliveryTier,
  deleteMaterial,
  deleteService,
  updateDeliveryTier,
  updateMaterial,
  updateService,
  type DeliveryTierRow,
  type MaterialRow,
  type ServiceRow,
} from "@/lib/site-content/actions";
import { SERVICE_ICON_KEYS, SERVICE_ICONS } from "@/lib/site-content/icon-registry";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";
const labelClass = "mb-1 block text-sm font-medium";

export function ContenidoClient({
  initialTiers,
  initialMaterials,
  initialServices,
}: {
  initialTiers: DeliveryTierRow[];
  initialMaterials: MaterialRow[];
  initialServices: ServiceRow[];
}) {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="text-lg font-semibold">Tiempos de entrega</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Tarjetas de la home que muestran cuanto tarda cada tipo de pieza. El orden en pantalla sigue el numero de
          orden (mas chico primero).
        </p>
        <div className="mt-4">
          <DeliveryTiersManager initialTiers={initialTiers} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Material y colores</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Descripcion del material (ej. PLA estandar), sus caracteristicas y los colores disponibles, tal como se
          muestran en la home.
        </p>
        <div className="mt-4">
          <MaterialsManager initialMaterials={initialMaterials} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Servicios</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Las tarjetas de "Que hacemos" en la home, con icono, titulo y descripcion.
        </p>
        <div className="mt-4">
          <ServicesManager initialServices={initialServices} />
        </div>
      </section>
    </div>
  );
}

// --- Tiempos de entrega -----------------------------------------------------

type TierFormValues = z.infer<typeof createDeliveryTierSchema>;

function DeliveryTiersManager({ initialTiers }: { initialTiers: DeliveryTierRow[] }) {
  const [tiers, setTiers] = useState(initialTiers);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TierFormValues>({
    resolver: zodResolver(createDeliveryTierSchema),
    defaultValues: { title: "", description: "", rangeLabel: "", unitLabel: "", sortOrder: 0 },
  });

  function startEdit(tier: DeliveryTierRow) {
    setEditingId(tier.id);
    reset({
      title: tier.title,
      description: tier.description,
      rangeLabel: tier.rangeLabel,
      unitLabel: tier.unitLabel,
      sortOrder: tier.sortOrder,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    reset({ title: "", description: "", rangeLabel: "", unitLabel: "", sortOrder: 0 });
  }

  async function onSubmit(values: TierFormValues) {
    try {
      if (editingId) {
        const updated = await updateDeliveryTier(editingId, values);
        setTiers((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
        toast.success("Tiempo de entrega actualizado.");
        cancelEdit();
      } else {
        const created = await createDeliveryTier(values);
        setTiers((prev) => [...prev, created]);
        reset({ title: "", description: "", rangeLabel: "", unitLabel: "", sortOrder: 0 });
        toast.success("Tiempo de entrega agregado.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  }

  async function handleToggleActive(tier: DeliveryTierRow) {
    try {
      const updated = await updateDeliveryTier(tier.id, { active: !tier.active });
      setTiers((prev) => prev.map((t) => (t.id === tier.id ? updated : t)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar.");
    }
  }

  async function handleDelete(tier: DeliveryTierRow) {
    try {
      await deleteDeliveryTier(tier.id);
      setTiers((prev) => prev.filter((t) => t.id !== tier.id));
      if (editingId === tier.id) cancelEdit();
      toast.success("Eliminado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {tiers.length > 0 && (
        <div className="flex flex-col gap-2">
          {tiers.map((tier) => (
            <Card key={tier.id}>
              <CardContent className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {tier.rangeLabel} {tier.unitLabel} — {tier.title}
                    {tier.active ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Inactivo</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">{tier.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => startEdit(tier)}>
                    Editar
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleToggleActive(tier)}>
                    {tier.active ? "Desactivar" : "Activar"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(tier)}>
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <p className="text-sm font-medium">{editingId ? "Editar tiempo de entrega" : "Agregar tiempo de entrega"}</p>
            <div className="grid gap-4 sm:grid-cols-[100px_1fr_100px]">
              <div>
                <label className={labelClass}>Rango</label>
                <input {...register("rangeLabel")} placeholder="1–2" className={inputClass} />
                {errors.rangeLabel && <p className="mt-1 text-xs text-red-600">{errors.rangeLabel.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Unidad</label>
                <input {...register("unitLabel")} placeholder="dias habiles" className={inputClass} />
                {errors.unitLabel && <p className="mt-1 text-xs text-red-600">{errors.unitLabel.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Orden</label>
                <input type="number" min={0} {...register("sortOrder", { valueAsNumber: true })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Titulo</label>
              <input {...register("title")} placeholder="Pieza pequena" className={inputClass} />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Descripcion</label>
              <textarea
                rows={2}
                {...register("description")}
                placeholder="Llaveros, accesorios, piezas pequenas de hasta ~30g de filamento."
                className={inputClass}
              />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting} className="self-start">
                {isSubmitting ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar"}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={cancelEdit} className="self-start">
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Material ------------------------------------------------------------------

type MaterialFormValues = z.infer<typeof createMaterialSchema>;

function MaterialsManager({ initialMaterials }: { initialMaterials: MaterialRow[] }) {
  const [items, setItems] = useState(initialMaterials);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MaterialFormValues>({
    resolver: zodResolver(createMaterialSchema),
    defaultValues: { name: "", description: "", features: [], colors: [], sortOrder: 0 },
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control,
    name: "features",
  });
  const { fields: colorFields, append: appendColor, remove: removeColor } = useFieldArray({
    control,
    name: "colors",
  });

  function startEdit(material: MaterialRow) {
    setEditingId(material.id);
    reset({
      name: material.name,
      description: material.description,
      features: material.features ?? [],
      colors: material.colors ?? [],
      sortOrder: material.sortOrder,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    reset({ name: "", description: "", features: [], colors: [], sortOrder: 0 });
  }

  async function onSubmit(values: MaterialFormValues) {
    try {
      if (editingId) {
        const updated = await updateMaterial(editingId, values);
        setItems((prev) => prev.map((m) => (m.id === editingId ? updated : m)));
        toast.success("Material actualizado.");
        cancelEdit();
      } else {
        const created = await createMaterial(values);
        setItems((prev) => [...prev, created]);
        reset({ name: "", description: "", features: [], colors: [], sortOrder: 0 });
        toast.success("Material agregado.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  }

  async function handleToggleActive(material: MaterialRow) {
    try {
      const updated = await updateMaterial(material.id, { active: !material.active });
      setItems((prev) => prev.map((m) => (m.id === material.id ? updated : m)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar.");
    }
  }

  async function handleDelete(material: MaterialRow) {
    try {
      await deleteMaterial(material.id);
      setItems((prev) => prev.filter((m) => m.id !== material.id));
      if (editingId === material.id) cancelEdit();
      toast.success("Eliminado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((material) => (
            <Card key={material.id}>
              <CardContent className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {material.name}
                    {material.active ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Inactivo</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">{material.description}</p>
                  {material.colors && material.colors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {material.colors.map((color) => (
                        <span
                          key={color.name}
                          title={color.name}
                          className="h-4 w-4 rounded-full border border-neutral-300 dark:border-neutral-700"
                          style={{ backgroundColor: color.hex }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => startEdit(material)}>
                    Editar
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleToggleActive(material)}>
                    {material.active ? "Desactivar" : "Activar"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(material)}>
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <p className="text-sm font-medium">{editingId ? "Editar material" : "Agregar material"}</p>
            <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
              <div>
                <label className={labelClass}>Nombre</label>
                <input {...register("name")} placeholder="PLA estandar" className={inputClass} />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Orden</label>
                <input type="number" min={0} {...register("sortOrder", { valueAsNumber: true })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Descripcion</label>
              <textarea
                rows={3}
                {...register("description")}
                placeholder="El PLA es el material mas usado en impresion 3D FDM..."
                className={inputClass}
              />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium">Caracteristicas</h3>
                <button
                  type="button"
                  onClick={() => appendFeature({ text: "", positive: true })}
                  className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium hover:bg-neutral-100 active:scale-[0.98] dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  + Agregar fila
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {featureFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <input
                      {...register(`features.${index}.text`)}
                      placeholder="Resistente y liviano para uso diario"
                      className={inputClass}
                    />
                    <label className="flex shrink-0 items-center gap-1 text-xs text-neutral-500">
                      <input type="checkbox" {...register(`features.${index}.positive`)} />
                      Positiva
                    </label>
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      aria-label="Quitar fila"
                      className="shrink-0 rounded p-1.5 text-neutral-500 hover:bg-neutral-100 active:scale-[0.98] dark:hover:bg-neutral-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {featureFields.length === 0 && <p className="text-xs text-neutral-400">Sin caracteristicas todavia.</p>}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium">Colores disponibles</h3>
                <button
                  type="button"
                  onClick={() => appendColor({ name: "", hex: "#000000" })}
                  className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium hover:bg-neutral-100 active:scale-[0.98] dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  + Agregar color
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {colorFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <input
                      type="color"
                      {...register(`colors.${index}.hex`)}
                      className="h-8 w-10 shrink-0 rounded border border-neutral-300 dark:border-neutral-700"
                    />
                    <input {...register(`colors.${index}.name`)} placeholder="Negro" className={inputClass} />
                    <button
                      type="button"
                      onClick={() => removeColor(index)}
                      aria-label="Quitar color"
                      className="shrink-0 rounded p-1.5 text-neutral-500 hover:bg-neutral-100 active:scale-[0.98] dark:hover:bg-neutral-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {colorFields.length === 0 && <p className="text-xs text-neutral-400">Sin colores todavia.</p>}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting} className="self-start">
                {isSubmitting ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar"}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={cancelEdit} className="self-start">
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Servicios -------------------------------------------------------------------

type ServiceFormValues = z.infer<typeof createServiceSchema>;

function ServicesManager({ initialServices }: { initialServices: ServiceRow[] }) {
  const [items, setItems] = useState(initialServices);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: { icon: SERVICE_ICON_KEYS[0], title: "", description: "", sortOrder: 0 },
  });

  function startEdit(service: ServiceRow) {
    setEditingId(service.id);
    reset({ icon: service.icon, title: service.title, description: service.description, sortOrder: service.sortOrder });
  }

  function cancelEdit() {
    setEditingId(null);
    reset({ icon: SERVICE_ICON_KEYS[0], title: "", description: "", sortOrder: 0 });
  }

  async function onSubmit(values: ServiceFormValues) {
    try {
      if (editingId) {
        const updated = await updateService(editingId, values);
        setItems((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
        toast.success("Servicio actualizado.");
        cancelEdit();
      } else {
        const created = await createService(values);
        setItems((prev) => [...prev, created]);
        reset({ icon: SERVICE_ICON_KEYS[0], title: "", description: "", sortOrder: 0 });
        toast.success("Servicio agregado.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  }

  async function handleToggleActive(service: ServiceRow) {
    try {
      const updated = await updateService(service.id, { active: !service.active });
      setItems((prev) => prev.map((s) => (s.id === service.id ? updated : s)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar.");
    }
  }

  async function handleDelete(service: ServiceRow) {
    try {
      await deleteService(service.id);
      setItems((prev) => prev.filter((s) => s.id !== service.id));
      if (editingId === service.id) cancelEdit();
      toast.success("Eliminado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((service) => {
            const iconInfo = SERVICE_ICONS[service.icon as keyof typeof SERVICE_ICONS];
            const Icon = iconInfo?.icon;
            return (
              <Card key={service.id}>
                <CardContent className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3">
                    {Icon && (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                        <Icon size={18} strokeWidth={1.75} />
                      </span>
                    )}
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {service.title}
                        {service.active ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Inactivo</Badge>}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => startEdit(service)}>
                      Editar
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleToggleActive(service)}>
                      {service.active ? "Desactivar" : "Activar"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(service)}>
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <p className="text-sm font-medium">{editingId ? "Editar servicio" : "Agregar servicio"}</p>
            <div className="grid gap-4 sm:grid-cols-[160px_1fr_100px]">
              <div>
                <label className={labelClass}>Icono</label>
                <select {...register("icon")} className={inputClass}>
                  {SERVICE_ICON_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {SERVICE_ICONS[key].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Titulo</label>
                <input {...register("title")} placeholder="Imprimimos tu diseno" className={inputClass} />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Orden</label>
                <input type="number" min={0} {...register("sortOrder", { valueAsNumber: true })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Descripcion</label>
              <textarea
                rows={2}
                {...register("description")}
                placeholder="Si tenes un archivo .STL, .OBJ o .3MF lo imprimimos tal cual."
                className={inputClass}
              />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting} className="self-start">
                {isSubmitting ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar"}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={cancelEdit} className="self-start">
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
