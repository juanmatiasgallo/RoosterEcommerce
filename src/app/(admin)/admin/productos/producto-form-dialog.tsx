"use client";

import { useState } from "react";
import Image from "next/image";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import { ChevronDown, ChevronsUpDown, ChevronUp, Trash2, Upload, Video, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  archiveVariant,
  createProduct,
  createVariant,
  deleteProductImage,
  reorderProductImages,
  updateProduct,
  updateVariant,
  uploadProductImage,
  type AdminProductListItem,
} from "@/lib/catalog/actions";
import type { CategoryTreeNode } from "@/lib/catalog/queries";
import { Spinner } from "@/components/ui/spinner";

type ProductImage = AdminProductListItem["images"][number];

function flattenTree(nodes: CategoryTreeNode[], depth = 0): { id: string; name: string; depth: number }[] {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...flattenTree(node.children, depth + 1),
  ]);
}

const variantRowSchema = z.object({
  id: z.string().optional(),
  material: z.string().min(1, "Requerido").max(50),
  color: z.string().max(50).optional(),
  size: z.string().max(50).optional(),
  price: z.coerce.number().positive("Debe ser mayor a 0"),
  stock: z.coerce.number().int().min(0, "No puede ser negativo"),
  sku: z.string().max(100).optional(),
});

const specRowSchema = z.object({
  label: z.string().min(1, "Requerido").max(80),
  value: z.string().min(1, "Requerido").max(300),
});

const productFormSchema = z.object({
  name: z.string().min(1, "Requerido").max(200),
  slug: z.string().min(1, "Requerido").max(220),
  description: z.string().max(5000).optional(),
  categoryId: z.string().optional(),
  basePrice: z.coerce.number().positive("Debe ser mayor a 0"),
  variants: z.array(variantRowSchema),
  specs: z.array(specRowSchema),
  technicalSpecs: z.array(specRowSchema),
});

// z.coerce.number() en basePrice/price/stock hace que el tipo de "entrada"
// (lo que RHF maneja mientras el usuario tipea) y el de "salida" (lo que
// llega ya validado a onSubmit) sean distintos: number vs unknown/string.
// useForm<Input, Context, Output> es el soporte oficial de RHF para eso.
type FormInput = z.input<typeof productFormSchema>;
type FormOutput = z.output<typeof productFormSchema>;

type Props =
  | { mode: "create"; product?: undefined; categoryTree: CategoryTreeNode[]; onClose: () => void }
  | { mode: "edit"; product: AdminProductListItem; categoryTree: CategoryTreeNode[]; onClose: () => void };

export function ProductoFormDialog(props: Props) {
  const { mode, categoryTree, onClose } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<ProductImage[]>(mode === "edit" ? props.product.images : []);
  const [isUploading, setIsUploading] = useState(false);
  const [removedVariantIds, setRemovedVariantIds] = useState<string[]>([]);

  const categoryOptions = flattenTree(categoryTree);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues:
      mode === "edit"
        ? {
            name: props.product.name,
            slug: props.product.slug,
            description: props.product.description ?? "",
            categoryId: props.product.categoryId ?? undefined,
            basePrice: Number(props.product.basePrice),
            variants: props.product.variants.map((variant) => ({
              id: variant.id,
              material: variant.material,
              color: variant.color ?? "",
              size: variant.size ?? "",
              price: Number(variant.price),
              stock: variant.stock,
              sku: variant.sku ?? "",
            })),
            specs: props.product.specs ?? [],
            technicalSpecs: props.product.technicalSpecs ?? [],
          }
        : {
            name: "",
            slug: "",
            description: "",
            categoryId: undefined,
            basePrice: 0,
            variants: [],
            specs: [],
            technicalSpecs: [],
          },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });
  const { fields: specFields, append: appendSpec, remove: removeSpec } = useFieldArray({ control, name: "specs" });
  const {
    fields: technicalSpecFields,
    append: appendTechnicalSpec,
    remove: removeTechnicalSpec,
  } = useFieldArray({ control, name: "technicalSpecs" });

  function removeVariantRow(index: number) {
    const row = fields[index];
    if (row.id && mode === "edit" && props.product.variants.some((v) => v.id === row.id)) {
      setRemovedVariantIds((prev) => [...prev, row.id as string]);
    }
    remove(index);
  }

  async function onSubmit(values: FormOutput) {
    setIsSubmitting(true);
    try {
      const productPayload = {
        name: values.name,
        slug: values.slug,
        description: values.description || undefined,
        categoryId: values.categoryId || undefined,
        basePrice: values.basePrice,
        specs: values.specs,
        technicalSpecs: values.technicalSpecs,
      };

      const product = mode === "edit" ? await updateProduct(props.product.id, productPayload) : await createProduct(productPayload);

      for (const variantId of removedVariantIds) {
        await archiveVariant(variantId);
      }

      for (const variant of values.variants) {
        const payload = {
          material: variant.material,
          color: variant.color || undefined,
          size: variant.size || undefined,
          price: variant.price,
          stock: variant.stock,
          sku: variant.sku || undefined,
        };
        if (variant.id) {
          await updateVariant(variant.id, payload);
        } else {
          await createVariant({ productId: product.id, ...payload });
        }
      }

      toast.success(mode === "edit" ? "Producto actualizado." : "Producto creado.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el producto.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (mode !== "edit") return;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    try {
      const created = await uploadProductImage(props.product.id, file);
      setImages((prev) => [...prev, created].sort((a, b) => a.position - b.position));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir la imagen.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteImage(imageId: string) {
    try {
      await deleteProductImage(imageId);
      setImages((prev) => prev.filter((image) => image.id !== imageId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la imagen.");
    }
  }

  async function moveImage(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const current = images[index];
    const target = images[targetIndex];

    const next = [...images];
    next[index] = { ...target, position: current.position };
    next[targetIndex] = { ...current, position: target.position };
    next.sort((a, b) => a.position - b.position);
    setImages(next);

    try {
      await reorderProductImages([
        { id: current.id, position: target.position },
        { id: target.id, position: current.position },
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reordenar.");
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <Dialog.Title className="text-lg font-semibold">
            {mode === "edit" ? "Editar producto" : "Nuevo producto"}
          </Dialog.Title>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label htmlFor="product-name" className="mb-1 block text-sm font-medium">
                  Nombre
                </label>
                <input
                  id="product-name"
                  {...register("name")}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="product-slug" className="mb-1 block text-sm font-medium">
                  Slug
                </label>
                <input
                  id="product-slug"
                  {...register("slug")}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
              </div>

              <div>
                <label htmlFor="product-price" className="mb-1 block text-sm font-medium">
                  Precio base
                </label>
                <input
                  id="product-price"
                  type="number"
                  step="0.01"
                  min={0}
                  {...register("basePrice")}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                {errors.basePrice && <p className="mt-1 text-xs text-red-600">{errors.basePrice.message}</p>}
              </div>

              <div className="col-span-2">
                <label htmlFor="product-description" className="mb-1 block text-sm font-medium">
                  Descripcion
                </label>
                <textarea
                  id="product-description"
                  rows={3}
                  {...register("description")}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </div>

              <div className="col-span-2">
                <span className="mb-1 block text-sm font-medium">Categoria</span>
                {/* Select de Base UI: registrado con Controller, no register directo. */}
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select.Root
                      value={field.value ?? null}
                      onValueChange={(value) => field.onChange(value ?? undefined)}
                    >
                      <Select.Trigger className="flex w-full items-center justify-between rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                        <Select.Value placeholder="Sin categoria" />
                        <Select.Icon>
                          <ChevronsUpDown size={14} className="text-neutral-500" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Positioner sideOffset={4} className="z-50">
                          <Select.Popup className="max-h-64 overflow-y-auto rounded border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                            <Select.List>
                              <Select.Item
                                value={null}
                                className="cursor-pointer px-3 py-1.5 text-sm data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800"
                              >
                                <Select.ItemText>Sin categoria</Select.ItemText>
                              </Select.Item>
                              {categoryOptions.map((option) => (
                                <Select.Item
                                  key={option.id}
                                  value={option.id}
                                  className="cursor-pointer px-3 py-1.5 text-sm data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800"
                                >
                                  <Select.ItemText>
                                    {"  ".repeat(option.depth)}
                                    {option.name}
                                  </Select.ItemText>
                                </Select.Item>
                              ))}
                            </Select.List>
                          </Select.Popup>
                        </Select.Positioner>
                      </Select.Portal>
                    </Select.Root>
                  )}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium">Variantes</h2>
                <button
                  type="button"
                  onClick={() => append({ material: "", color: "", size: "", price: 0, stock: 0, sku: "" })}
                  className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  + Agregar variante
                </button>
              </div>

              {fields.length === 0 ? (
                <p className="text-xs text-neutral-500">Todavia no hay variantes.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-7 items-end gap-2 rounded border border-neutral-200 p-2 dark:border-neutral-800"
                    >
                      <div className="col-span-2">
                        <label className="mb-0.5 block text-xs text-neutral-500">Material</label>
                        <input
                          {...register(`variants.${index}.material`)}
                          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-xs text-neutral-500">Color</label>
                        <input
                          {...register(`variants.${index}.color`)}
                          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-xs text-neutral-500">Tamano</label>
                        <input
                          {...register(`variants.${index}.size`)}
                          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-xs text-neutral-500">Precio</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register(`variants.${index}.price`)}
                          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-xs text-neutral-500">Stock</label>
                        <input
                          type="number"
                          {...register(`variants.${index}.stock`)}
                          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        />
                      </div>
                      <div className="flex items-end gap-1">
                        <div className="flex-1">
                          <label className="mb-0.5 block text-xs text-neutral-500">Codigo</label>
                          <input
                            placeholder="Auto"
                            {...register(`variants.${index}.sku`)}
                            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVariantRow(index)}
                          aria-label="Quitar variante"
                          className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {errors.variants?.[index] && (
                        <p className="col-span-6 text-xs text-red-600">Revisa los campos de esta variante.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium">Detalles del producto</h2>
                <button
                  type="button"
                  onClick={() => appendSpec({ label: "", value: "" })}
                  className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium hover:bg-neutral-100 active:scale-[0.98] dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  + Agregar fila
                </button>
              </div>
              <p className="mb-2 text-xs text-neutral-500">
                Filas libres (ej. "Material" / "PLA biodegradable") que se muestran en la pestana "Detalles del
                producto" de la ficha publica, aparte de la Descripcion.
              </p>

              {specFields.length === 0 ? (
                <p className="text-xs text-neutral-500">Todavia no hay filas de detalle.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {specFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                      <div className="w-2/5">
                        <label className="mb-0.5 block text-xs text-neutral-500">Etiqueta</label>
                        <input
                          placeholder="Material"
                          {...register(`specs.${index}.label`)}
                          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-0.5 block text-xs text-neutral-500">Valor</label>
                        <input
                          placeholder="PLA biodegradable"
                          {...register(`specs.${index}.value`)}
                          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSpec(index)}
                        aria-label="Quitar fila"
                        className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 active:scale-[0.98] dark:hover:bg-neutral-800"
                      >
                        <Trash2 size={16} />
                      </button>
                      {errors.specs?.[index] && (
                        <p className="text-xs text-red-600">Completa etiqueta y valor.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium">Caracteristicas tecnicas</h2>
                <button
                  type="button"
                  onClick={() => appendTechnicalSpec({ label: "", value: "" })}
                  className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium hover:bg-neutral-100 active:scale-[0.98] dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  + Agregar fila
                </button>
              </div>
              <p className="mb-2 text-xs text-neutral-500">
                Filas libres (ej. "Tolerancia" / "±0.2mm") para la pestana aparte "Caracteristicas tecnicas" de la
                ficha publica — mas tecnico que "Detalles del producto".
              </p>

              {technicalSpecFields.length === 0 ? (
                <p className="text-xs text-neutral-500">Todavia no hay filas tecnicas.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {technicalSpecFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                      <div className="w-2/5">
                        <label className="mb-0.5 block text-xs text-neutral-500">Etiqueta</label>
                        <input
                          placeholder="Tolerancia"
                          {...register(`technicalSpecs.${index}.label`)}
                          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-0.5 block text-xs text-neutral-500">Valor</label>
                        <input
                          placeholder="±0.2mm"
                          {...register(`technicalSpecs.${index}.value`)}
                          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTechnicalSpec(index)}
                        aria-label="Quitar fila"
                        className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 active:scale-[0.98] dark:hover:bg-neutral-800"
                      >
                        <Trash2 size={16} />
                      </button>
                      {errors.technicalSpecs?.[index] && (
                        <p className="text-xs text-red-600">Completa etiqueta y valor.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {mode === "edit" ? (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-medium">Imagenes y videos</h2>
                  <label className="flex cursor-pointer items-center gap-1 rounded border border-neutral-300 px-2 py-1 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
                    <Upload size={12} />
                    {isUploading ? "Subiendo..." : "Subir imagen o video"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                      className="hidden"
                      onChange={handleUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>

                {images.length === 0 ? (
                  <p className="text-xs text-neutral-500">Todavia no hay imagenes ni videos.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {images.map((image, index) => (
                      <div
                        key={image.id}
                        className="relative h-20 w-20 overflow-hidden rounded border border-neutral-200 dark:border-neutral-800"
                      >
                        {image.mediaType === "video" ? (
                          <div className="flex h-full w-full items-center justify-center bg-neutral-900">
                            <Video size={20} className="text-white" />
                          </div>
                        ) : (
                          <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => moveImage(index, -1)}
                            disabled={index === 0}
                            aria-label="Mover antes"
                            className="text-white disabled:opacity-30"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(index, 1)}
                            disabled={index === images.length - 1}
                            aria-label="Mover despues"
                            className="text-white disabled:opacity-30"
                          >
                            <ChevronDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(image.id)}
                            aria-label="Eliminar imagen"
                            className="text-white"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                Podes agregar imagenes despues de guardar, abriendo "Editar" en el producto ya creado.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Dialog.Close
                type="button"
                className="rounded px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                Cancelar
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              >
                {isSubmitting && <Spinner size={14} />}
                {isSubmitting ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
