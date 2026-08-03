"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Box, CheckCircle2, FileText, Rocket, Sparkles, UploadCloud, Wand2, X } from "lucide-react";
import { createCustomOrderSchema } from "@/lib/custom-orders/schema";
import { createCustomOrder } from "@/lib/custom-orders/actions";
import { IdentifyStep } from "@/components/identify-step";
import { Spinner } from "@/components/ui/spinner";
import { trackEvent } from "@/lib/analytics/track";
import { Model3DDialog } from "@/components/model-3d-dialog";
import { getModel3DExtension } from "@/components/model-3d-viewer";

type Step = "identify" | "details" | "confirm";
type FormValues = z.infer<typeof createCustomOrderSchema>;

const STEP_ORDER: { key: Exclude<Step, "identify">; label: string }[] = [
  { key: "details", label: "Tu pieza" },
  { key: "confirm", label: "Confirmar" },
];

const inputClass =
  "w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

// Wizard de 2-3 pasos (identificacion opcional + detalles + confirmacion)
// para /pedido-a-medida (task #111). El pedido sigue requiriendo una cuenta
// -- igual que el checkout -- porque es la unica forma que tiene hoy el
// sitio de que el cliente despues vea el estado de su pedido en
// /mi-cuenta/pedidos y reciba mails de cotizacion/pago; lo que cambia es
// que ahora se puede crear esa cuenta sin salir de esta pagina (comparte
// el mismo paso de identificacion que el checkout, que ya pide telefono de
// contacto al registrarse).
export function PedidoAMedidaWizard({
  startedLoggedIn,
  maxSizeMb,
  allowedExtensions,
}: {
  startedLoggedIn: boolean;
  maxSizeMb: number;
  allowedExtensions: string[];
}) {
  const [step, setStep] = useState<Step>(startedLoggedIn ? "details" : "identify");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [modelPreviewOpen, setModelPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Visor 3D del archivo antes de mandarlo (task #148, pedido explicito:
  // "como parte del proceso el cliente pueda verlo"): blob: URL local, no
  // se sube a ningun lado todavia. Se recrea cada vez que cambia el archivo
  // elegido y se libera al desmontar/cambiar para no dejar memoria colgada.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const modelExtension = file ? getModel3DExtension(file.name) : null;

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createCustomOrderSchema),
    defaultValues: { material: "", color: "", quantity: 1, approxSize: "", notes: "" },
  });

  function pickFile(candidate: File | null) {
    setFile(candidate);
    setFileError(null);
  }

  function onDetailsSubmit() {
    if (!file) {
      setFileError("Subi un archivo .stl o .obj.");
      return;
    }
    setStep("confirm");
  }

  async function handleConfirm() {
    if (!file) return;
    setSubmitError(null);
    setIsSubmitting(true);
    const values = getValues();
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
      trackEvent("pedido_a_medida_enviado", {
        material: values.material || undefined,
        quantity: values.quantity,
      });
      setShowSuccess(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo enviar el pedido.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const values = getValues();

  return (
    <>
      <div className="mx-auto max-w-xl">
        {step !== "identify" && (
          <div className="mb-6 flex items-center justify-center gap-2 text-sm">
            {STEP_ORDER.map((s, index) => (
              <div key={s.key} className="flex items-center gap-2">
                {index > 0 && <span className="text-neutral-300 dark:text-neutral-700">→</span>}
                <span
                  className={
                    s.key === step
                      ? "flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-medium text-accent-foreground"
                      : STEP_ORDER.findIndex((x) => x.key === step) > index
                        ? "flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "flex items-center gap-1.5 rounded-full px-3 py-1 text-neutral-400"
                  }
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {step === "identify" && (
            <IdentifyStep title="Primero, identificate" onIdentified={() => setStep("details")} />
          )}

          {step === "details" && (
            <form
              onSubmit={handleSubmit(onDetailsSubmit)}
              className="flex flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Tu archivo ({allowedExtensions.join(", ")}, maximo {maxSizeMb} MB)
                </label>
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    pickFile(e.dataTransfer.files?.[0] ?? null);
                  }}
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
                    isDraggingFile
                      ? "border-accent bg-accent/5"
                      : "border-neutral-300 hover:border-accent/60 dark:border-neutral-700"
                  }`}
                >
                  {file ? (
                    <>
                      <FileText className="h-8 w-8 text-accent" strokeWidth={1.5} />
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-neutral-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                      <div className="mt-1 flex items-center gap-3">
                        {modelExtension && previewUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setModelPreviewOpen(true);
                            }}
                            className="flex items-center gap-1 text-xs font-medium text-accent underline"
                          >
                            <Box size={12} /> Ver en 3D
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            pickFile(null);
                          }}
                          className="flex items-center gap-1 text-xs text-neutral-500 underline"
                        >
                          <X size={12} /> Sacar archivo
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-8 w-8 text-neutral-400" strokeWidth={1.5} />
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Arrastra tu archivo aca o hace click para elegirlo
                      </p>
                    </>
                  )}
                  <input
                    type="file"
                    accept={allowedExtensions.map((ext) => `.${ext}`).join(",")}
                    onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
                {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="material" className="mb-1 block text-sm font-medium">
                    Material (opcional)
                  </label>
                  <input id="material" {...register("material")} placeholder="PLA, PETG, Resina..." className={inputClass} />
                </div>
                <div>
                  <label htmlFor="color" className="mb-1 block text-sm font-medium">
                    Color (opcional)
                  </label>
                  <input id="color" {...register("color")} className={inputClass} />
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
                    className={inputClass}
                  />
                  {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>}
                </div>
                <div>
                  <label htmlFor="approxSize" className="mb-1 block text-sm font-medium">
                    Tamano aproximado (opcional)
                  </label>
                  <input id="approxSize" {...register("approxSize")} placeholder='ej. "15cm x 10cm"' className={inputClass} />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="mb-1 block text-sm font-medium">
                  Notas (opcional)
                </label>
                <textarea id="notes" rows={3} {...register("notes")} className={inputClass} />
              </div>

              <button
                type="submit"
                className="flex items-center justify-center gap-2 self-end rounded bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white active:scale-[0.98] dark:bg-neutral-100 dark:text-neutral-900"
              >
                Revisar pedido
              </button>
            </form>
          )}

          {step === "confirm" && (
            <div className="flex flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-accent" />
                <h2 className="font-medium">Revisa tu pedido antes de enviarlo</h2>
              </div>

              <dl className="flex flex-col gap-2 rounded-lg bg-neutral-50 p-4 text-sm dark:bg-neutral-900/50">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">Archivo</dt>
                  <dd className="text-right font-medium">{file?.name}</dd>
                </div>
                {values.material && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">Material</dt>
                    <dd className="text-right">{values.material}</dd>
                  </div>
                )}
                {values.color && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">Color</dt>
                    <dd className="text-right">{values.color}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">Cantidad</dt>
                  <dd className="text-right">{values.quantity}</dd>
                </div>
                {values.approxSize && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">Tamano aprox.</dt>
                    <dd className="text-right">{values.approxSize}</dd>
                  </div>
                )}
                {values.notes && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">Notas</dt>
                    <dd className="text-right">{values.notes}</dd>
                  </div>
                )}
              </dl>

              <p className="text-xs text-neutral-500">
                Te vamos a mandar una cotizacion antes de cobrarte nada. Podes ver el estado desde /mi-cuenta/pedidos.
              </p>

              {submitError && <p className="text-sm text-red-600">{submitError}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 rounded bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
                >
                  {isSubmitting && <Spinner size={14} />}
                  {isSubmitting ? "Enviando..." : "Enviar pedido"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="rounded border border-neutral-300 px-5 py-2.5 text-sm dark:border-neutral-700"
                >
                  Volver
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {file && modelExtension && previewUrl && (
        <Model3DDialog
          open={modelPreviewOpen}
          onClose={() => setModelPreviewOpen(false)}
          url={previewUrl}
          extension={modelExtension}
          title={file.name}
        />
      )}

      {showSuccess && <SubmittedModal />}
    </>
  );
}

function SubmittedModal() {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pedido enviado"
      className="animate-in fade-in-0 fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 duration-200"
    >
      <div className="animate-in fade-in-0 zoom-in-95 relative w-full max-w-sm overflow-hidden rounded-2xl bg-neutral-950 p-8 text-center text-white shadow-2xl duration-300">
        <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-accent/25 blur-3xl motion-safe:animate-pulse" />
        <div
          className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl motion-safe:animate-pulse"
          style={{ animationDelay: "0.8s" }}
        />

        <div className="relative flex flex-col items-center gap-3">
          <span className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-accent/20 motion-safe:animate-ping" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-accent">
              <Rocket className="h-8 w-8" strokeWidth={1.75} />
            </span>
          </span>

          <div className="flex items-center gap-1 text-accent">
            <Sparkles size={14} />
            <span className="text-xs font-medium tracking-wide uppercase">Pedido enviado</span>
            <Sparkles size={14} />
          </div>

          <h2 className="text-xl font-semibold">Tu diseno ya esta en manos de nuestro equipo</h2>
          <p className="text-sm text-neutral-400">
            Lo vamos a revisar y te mandamos una cotizacion antes de cobrarte nada. Te avisamos por mail y podes
            seguir el estado desde tu cuenta.
          </p>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
            <CheckCircle2 size={14} className="text-accent" />
            Guardado con exito
          </div>

          <div className="mt-4 flex w-full flex-col gap-2">
            <Link
              href="/mi-cuenta/pedidos"
              className="rounded bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Ver mis pedidos
            </Link>
            <Link href="/" className="rounded border border-white/20 px-4 py-2.5 text-sm text-white hover:bg-white/10">
              Volver al catalogo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
