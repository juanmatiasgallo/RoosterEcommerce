"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { z } from "zod";
import { createCustomOrderSchema } from "@/lib/custom-orders/schema";
import { createCustomOrder } from "@/lib/custom-orders/actions";
import { Spinner } from "@/components/ui/spinner";

type FormValues = z.infer<typeof createCustomOrderSchema>;

export function PedidoAMedidaFormClient({ maxSizeMb }: { maxSizeMb: number }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(createCustomOrderSchema),
    defaultValues: {
      material: "",
      color: "",
      quantity: 1,
      approxSize: "",
      notes: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    if (!file) {
      setFileError("Subi un archivo .stl o .obj.");
      return;
    }
    setFileError(null);

    try {
      await createCustomOrder(
        {
          material: values.material || undefined,
          color: values.color || undefined,
          quantity: values.quantity,
          approxSize: values.approxSize || undefined,
          notes: values.notes || undefined,
        },
        file,
      );

      toast.success("Pedido recibido. Te vamos a enviar una cotizacion antes de cobrarte nada.");
      router.push("/mi-cuenta/pedidos");
    } catch (error) {
      // Se muestra el error real que devuelve la Server Action (extension
      // invalida, archivo muy pesado, etc.), no un mensaje generico que lo
      // esconda.
      setSubmitError(error instanceof Error ? error.message : "No se pudo enviar el pedido.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <label htmlFor="file" className="mb-1 block text-sm font-medium">
          Archivo (.stl o .obj, maximo {maxSizeMb} MB)
        </label>
        <input
          id="file"
          type="file"
          accept=".stl,.obj"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setFileError(null);
          }}
          className="block w-full text-sm"
        />
        {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
      </div>

      <div>
        <label htmlFor="material" className="mb-1 block text-sm font-medium">
          Material (opcional)
        </label>
        <input
          id="material"
          {...register("material")}
          placeholder="PLA, PETG, Resina..."
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div>
        <label htmlFor="color" className="mb-1 block text-sm font-medium">
          Color (opcional)
        </label>
        <input
          id="color"
          {...register("color")}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div>
        <label htmlFor="quantity" className="mb-1 block text-sm font-medium">
          Cantidad
        </label>
        <input
          id="quantity"
          type="number"
          min={1}
          {...register("quantity", { valueAsNumber: true })}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>}
      </div>

      <div>
        <label htmlFor="approxSize" className="mb-1 block text-sm font-medium">
          Tamano aproximado (opcional)
        </label>
        <input
          id="approxSize"
          {...register("approxSize")}
          placeholder='ej. "15cm x 10cm"'
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">
          Notas (opcional)
        </label>
        <textarea
          id="notes"
          rows={3}
          {...register("notes")}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-red-600">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center justify-center gap-2 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {isSubmitting && <Spinner size={14} />}
        {isSubmitting ? "Enviando..." : "Enviar pedido"}
      </button>
    </form>
  );
}
