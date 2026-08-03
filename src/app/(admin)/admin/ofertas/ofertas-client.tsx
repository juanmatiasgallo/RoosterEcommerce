"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { formatCurrency } from "@/lib/format";
import {
  createDiscountCampaign,
  deleteDiscountCampaign,
  updateDiscountCampaign,
  type DiscountCampaignRow,
} from "@/lib/discount-campaigns/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";

const inputClass =
  "w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";
const labelClass = "mb-1 block text-sm font-medium";

// Schema propio del formulario, distinto del que usa la server action
// (src/lib/discount-campaigns/schema.ts): "value" y "usageLimit" viajan
// como string aca (se convierten a numero recien en onSubmit). z.coerce.
// number() se probo primero y rompe el build: el tipo de ENTRADA que espera
// zodResolver para ese campo queda en `unknown`, y useForm<FormValues> (el
// tipo de SALIDA, con value ya en number) no matchea -- mismo bug de fondo
// que compareAtPrice en producto-form-dialog.tsx y usageLimit un poco mas
// abajo, mismo arreglo: campo string en el form, Number(...) manual en
// onSubmit.
const campaignFormSchema = z.object({
  code: z.string().min(3, "Minimo 3 caracteres").max(30),
  type: z.enum(["percent", "fixed"]),
  value: z.string().refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, "Debe ser mayor a 0"),
  usageLimit: z.string().max(10).optional(),
});

type FormValues = z.infer<typeof campaignFormSchema>;

function formatValue(campaign: DiscountCampaignRow): string {
  return campaign.type === "percent" ? `${Number(campaign.value)}%` : formatCurrency(Number(campaign.value));
}

function formatUsage(campaign: DiscountCampaignRow): string {
  return campaign.usageLimit === null
    ? `${campaign.usageCount} usos (sin limite)`
    : `${campaign.usageCount} / ${campaign.usageLimit} usos`;
}

export function OfertasClient({ initialCampaigns }: { initialCampaigns: DiscountCampaignRow[] }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const { page, setPage, totalPages, pageItems: pagedCampaigns } = usePagination(campaigns);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: { code: "", type: "percent", value: "10", usageLimit: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      const usageLimit = values.usageLimit ? Number(values.usageLimit) : undefined;
      const created = await createDiscountCampaign({
        code: values.code,
        type: values.type,
        value: Number(values.value),
        usageLimit: usageLimit && !Number.isNaN(usageLimit) ? usageLimit : undefined,
      });
      setCampaigns((prev) => [created, ...prev]);
      reset({ code: "", type: "percent", value: "10", usageLimit: "" });
      toast.success("Codigo de promocion creado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el codigo.");
    }
  }

  async function handleToggleActive(campaign: DiscountCampaignRow) {
    try {
      const updated = await updateDiscountCampaign(campaign.id, { active: !campaign.active });
      setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? updated : c)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar.");
    }
  }

  async function handleDelete(campaign: DiscountCampaignRow) {
    try {
      await deleteDiscountCampaign(campaign.id);
      setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
      toast.success("Eliminado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {campaigns.length > 0 && (
        <div className="flex flex-col gap-2">
          {pagedCampaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="flex items-center gap-2 font-mono text-sm font-medium">
                    {campaign.code}
                    {campaign.active ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Inactivo</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {formatValue(campaign)} de descuento · {formatUsage(campaign)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => handleToggleActive(campaign)}>
                    {campaign.active ? "Desactivar" : "Activar"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(campaign)}>
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <p className="text-sm font-medium">Nuevo codigo</p>
            <div className="grid gap-4 sm:grid-cols-[1fr_120px_120px_120px]">
              <div>
                <label className={labelClass}>Codigo</label>
                <input {...register("code")} placeholder="VERANO10" className={`${inputClass} uppercase`} />
                {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Tipo</label>
                <select {...register("type")} className={inputClass}>
                  <option value="percent">% porcentaje</option>
                  <option value="fixed">$ fijo</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Valor</label>
                <input type="number" step="0.01" {...register("value")} className={inputClass} />
                {errors.value && <p className="mt-1 text-xs text-red-600">{errors.value.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Limite de usos</label>
                <input
                  type="number"
                  min={1}
                  placeholder="Sin limite"
                  {...register("usageLimit")}
                  className={inputClass}
                />
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting} className="self-start">
              {isSubmitting ? "Creando..." : "Crear codigo"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
