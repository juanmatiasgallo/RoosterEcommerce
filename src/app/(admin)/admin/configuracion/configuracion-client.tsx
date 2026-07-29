"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import {
  updateMercadoPagoSettingsSchema,
  updatePaymentInstructionsSchema,
  updateSmtpSettingsSchema,
  updateStoreInfoSchema,
  updateVacationModeSchema,
} from "@/lib/settings/schema";
import {
  sendTestEmail,
  updateMercadoPagoSettings,
  updatePaymentInstructions,
  updateSmtpSettings,
  updateStoreInfo,
  updateVacationMode,
  type MercadoPagoSettings,
  type PaymentInstructionsSettings,
  type SmtpSettings,
  type StoreInfoSettings,
} from "@/lib/settings/actions";
import { formatCurrency } from "@/lib/format";
import { createShippingZoneSchema } from "@/lib/shipping/schema";
import {
  createShippingZone,
  deleteShippingZone,
  updateShippingZone,
  type ShippingZoneRow,
} from "@/lib/shipping/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type SmtpFormValues = z.infer<typeof updateSmtpSettingsSchema>;
type MpFormValues = z.infer<typeof updateMercadoPagoSettingsSchema>;
type PaymentInstructionsFormValues = z.infer<typeof updatePaymentInstructionsSchema>;
type StoreInfoFormValues = z.infer<typeof updateStoreInfoSchema>;
type VacationFormValues = z.infer<typeof updateVacationModeSchema>;
type ShippingZoneFormValues = z.infer<typeof createShippingZoneSchema>;

export function ConfiguracionClient({
  initialSmtp,
  initialMp,
  initialPaymentInstructions,
  initialStoreInfo,
  initialVacation,
  initialShippingZones,
}: {
  initialSmtp: SmtpSettings;
  initialMp: MercadoPagoSettings;
  initialPaymentInstructions: PaymentInstructionsSettings;
  initialStoreInfo: StoreInfoSettings;
  initialVacation: { vacationMode: boolean; vacationMessage: string | null };
  initialShippingZones: ShippingZoneRow[];
}) {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="text-lg font-semibold">Datos de la tienda</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Razon social, RUT y contacto. Se usan en el footer del sitio y como referencia para numerar comprobantes.
        </p>
        <div className="mt-4">
          <StoreInfoForm initial={initialStoreInfo} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Envios</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Zonas y costos de envio que se muestran en{" "}
          <a href="/envios" className="underline">
            /envios
          </a>
          . Todavia no se suman automaticamente al total del checkout.
        </p>
        <div className="mt-4">
          <ShippingZonesManager initialZones={initialShippingZones} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Modo vacaciones</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Si lo activas, se bloquean nuevas compras (catalogo y pedidos a medida) y se muestra un aviso en todo el
          sitio. El catalogo sigue navegable.
        </p>
        <div className="mt-4">
          <VacationModeForm initial={initialVacation} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Mercado Pago</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Credenciales de Checkout Pro. Si dejas esto vacio, se usan las variables de entorno
          MP_ACCESS_TOKEN / MP_WEBHOOK_SECRET configuradas en el servidor.
        </p>
        <div className="mt-4">
          <MercadoPagoSettingsForm initial={initialMp} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Medios de pago manuales</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Alternativa a Mercado Pago: transferencia, Abitab o Red Pagos. Cada uno solo aparece como opcion en
          el checkout si le cargas instrucciones aca. El cliente que elige uno de estos genera una{" "}
          <strong>orden de servicio</strong> (no se cobra sola) y vos confirmas el pago a mano desde{" "}
          <a href="/admin/pedidos" className="underline">
            /admin/pedidos
          </a>{" "}
          cuando lo verificas.
        </p>
        <div className="mt-4">
          <PaymentInstructionsForm initial={initialPaymentInstructions} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">SMTP</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Se usa para enviar notificaciones por email.
        </p>
        <div className="mt-4">
          <SmtpSettingsForm initial={initialSmtp} />
        </div>
      </section>
    </div>
  );
}

function PaymentInstructionsForm({ initial }: { initial: PaymentInstructionsSettings }) {
  const [settings, setSettings] = useState(initial);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PaymentInstructionsFormValues>({
    resolver: zodResolver(updatePaymentInstructionsSchema),
    defaultValues: {
      paymentInstructionsTransferencia: settings.paymentInstructionsTransferencia ?? "",
      paymentInstructionsAbitab: settings.paymentInstructionsAbitab ?? "",
      paymentInstructionsRedpagos: settings.paymentInstructionsRedpagos ?? "",
      paymentInstructionsMiDinero: settings.paymentInstructionsMiDinero ?? "",
      paymentInstructionsPrex: settings.paymentInstructionsPrex ?? "",
    },
  });

  async function onSubmit(values: PaymentInstructionsFormValues) {
    try {
      const updated = await updatePaymentInstructions(values);
      setSettings(updated);
      toast.success("Instrucciones de pago guardadas.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label htmlFor="paymentInstructionsTransferencia" className="mb-1 flex items-center gap-2 text-sm font-medium">
              Transferencia bancaria
              {settings.paymentInstructionsTransferencia ? (
                <Badge variant="success">Activo</Badge>
              ) : (
                <Badge variant="neutral">No se ofrece</Badge>
              )}
            </label>
            <textarea
              id="paymentInstructionsTransferencia"
              rows={3}
              {...register("paymentInstructionsTransferencia")}
              placeholder="Ej: Transferi a cuenta N. XXXX del Banco X a nombre de..."
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          <div>
            <label htmlFor="paymentInstructionsAbitab" className="mb-1 flex items-center gap-2 text-sm font-medium">
              Abitab
              {settings.paymentInstructionsAbitab ? (
                <Badge variant="success">Activo</Badge>
              ) : (
                <Badge variant="neutral">No se ofrece</Badge>
              )}
            </label>
            <textarea
              id="paymentInstructionsAbitab"
              rows={3}
              {...register("paymentInstructionsAbitab")}
              placeholder="Ej: Paga en cualquier local Abitab con el codigo de cobranza XXXX..."
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          <div>
            <label htmlFor="paymentInstructionsRedpagos" className="mb-1 flex items-center gap-2 text-sm font-medium">
              Red Pagos
              {settings.paymentInstructionsRedpagos ? (
                <Badge variant="success">Activo</Badge>
              ) : (
                <Badge variant="neutral">No se ofrece</Badge>
              )}
            </label>
            <textarea
              id="paymentInstructionsRedpagos"
              rows={3}
              {...register("paymentInstructionsRedpagos")}
              placeholder="Ej: Paga en cualquier local Red Pagos con el codigo de cobranza XXXX..."
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          <div>
            <label htmlFor="paymentInstructionsMiDinero" className="mb-1 flex items-center gap-2 text-sm font-medium">
              Debito Mi Dinero
              {settings.paymentInstructionsMiDinero ? (
                <Badge variant="success">Activo</Badge>
              ) : (
                <Badge variant="neutral">No se ofrece</Badge>
              )}
            </label>
            <textarea
              id="paymentInstructionsMiDinero"
              rows={3}
              {...register("paymentInstructionsMiDinero")}
              placeholder="Ej: Transferi desde tu app Mi Dinero a..."
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          <div>
            <label htmlFor="paymentInstructionsPrex" className="mb-1 flex items-center gap-2 text-sm font-medium">
              Prex
              {settings.paymentInstructionsPrex ? (
                <Badge variant="success">Activo</Badge>
              ) : (
                <Badge variant="neutral">No se ofrece</Badge>
              )}
            </label>
            <textarea
              id="paymentInstructionsPrex"
              rows={3}
              {...register("paymentInstructionsPrex")}
              placeholder="Ej: Manda a mi alias de Prex @xxxxx..."
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="self-start">
            {isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MercadoPagoSettingsForm({ initial }: { initial: MercadoPagoSettings }) {
  const [settings, setSettings] = useState(initial);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MpFormValues>({
    resolver: zodResolver(updateMercadoPagoSettingsSchema),
    defaultValues: {
      mpPublicKey: settings.mpPublicKey ?? "",
      mpAccessToken: "",
      mpWebhookSecret: "",
    },
  });

  async function onSubmit(values: MpFormValues) {
    try {
      const updated = await updateMercadoPagoSettings(values);
      setSettings(updated);
      toast.success("Configuracion de Mercado Pago guardada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la configuracion.");
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label htmlFor="mpPublicKey" className="mb-1 block text-sm font-medium">
              Public key
            </label>
            <input
              id="mpPublicKey"
              {...register("mpPublicKey")}
              placeholder="APP_USR-..."
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            {errors.mpPublicKey && <p className="mt-1 text-xs text-red-600">{errors.mpPublicKey.message}</p>}
          </div>

          <div>
            <label htmlFor="mpAccessToken" className="mb-1 block text-sm font-medium">
              Access token
            </label>
            <input
              id="mpAccessToken"
              type="password"
              autoComplete="new-password"
              {...register("mpAccessToken")}
              placeholder={settings.mpAccessTokenSet ? "Ya hay uno guardado (dejar vacio para no cambiarlo)" : "APP_USR-..."}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <p className="mt-1 text-xs text-neutral-500">
              {settings.mpAccessTokenSet ? (
                <Badge variant="success">Configurado</Badge>
              ) : (
                <Badge variant="neutral">Usando MP_ACCESS_TOKEN del servidor</Badge>
              )}
            </p>
          </div>

          <div>
            <label htmlFor="mpWebhookSecret" className="mb-1 block text-sm font-medium">
              Webhook secret
            </label>
            <input
              id="mpWebhookSecret"
              type="password"
              autoComplete="new-password"
              {...register("mpWebhookSecret")}
              placeholder={
                settings.mpWebhookSecretSet ? "Ya hay uno guardado (dejar vacio para no cambiarlo)" : ""
              }
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <p className="mt-1 text-xs text-neutral-500">
              {settings.mpWebhookSecretSet ? (
                <Badge variant="success">Configurado</Badge>
              ) : (
                <Badge variant="neutral">Usando MP_WEBHOOK_SECRET del servidor</Badge>
              )}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Lo sacas de Mercado Pago → Tus integraciones → Webhooks → Configurar notificacion.
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting} className="self-start">
            {isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SmtpSettingsForm({ initial }: { initial: SmtpSettings }) {
  const [settings, setSettings] = useState(initial);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SmtpFormValues>({
    resolver: zodResolver(updateSmtpSettingsSchema),
    defaultValues: {
      smtpHost: settings.smtpHost ?? "",
      smtpPort: settings.smtpPort ?? undefined,
      smtpUser: settings.smtpUser ?? "",
      smtpPassword: "",
      smtpFromEmail: settings.smtpFromEmail ?? "",
      smtpFromName: settings.smtpFromName ?? "",
      smtpSecure: settings.smtpSecure,
    },
  });

  const isConfigured = Boolean(settings.smtpHost && settings.smtpPasswordSet && settings.smtpFromEmail);

  async function onSubmit(values: SmtpFormValues) {
    try {
      const updated = await updateSmtpSettings(values);
      setSettings(updated);
      toast.success("Configuracion SMTP guardada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la configuracion.");
    }
  }

  async function handleSendTest() {
    setIsSendingTest(true);
    try {
      const result = await sendTestEmail();
      if (result.success) {
        toast.success("Email de prueba enviado.");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el email de prueba.");
    } finally {
      setIsSendingTest(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label htmlFor="smtpHost" className="mb-1 block text-sm font-medium">
                Host
              </label>
              <input
                id="smtpHost"
                {...register("smtpHost")}
                placeholder="smtp.tuproveedor.com"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.smtpHost && <p className="mt-1 text-xs text-red-600">{errors.smtpHost.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="smtpPort" className="mb-1 block text-sm font-medium">
                  Puerto
                </label>
                <input
                  id="smtpPort"
                  type="number"
                  {...register("smtpPort", { valueAsNumber: true })}
                  placeholder="587"
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                {errors.smtpPort && <p className="mt-1 text-xs text-red-600">{errors.smtpPort.message}</p>}
              </div>

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register("smtpSecure")} />
                  Usar TLS/SSL
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="smtpUser" className="mb-1 block text-sm font-medium">
                Usuario
              </label>
              <input
                id="smtpUser"
                {...register("smtpUser")}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>

            <div>
              <label htmlFor="smtpPassword" className="mb-1 block text-sm font-medium">
                Contrasena
              </label>
              <input
                id="smtpPassword"
                type="password"
                autoComplete="new-password"
                {...register("smtpPassword")}
                placeholder={settings.smtpPasswordSet ? "Ya hay una guardada (dejar vacio para no cambiarla)" : ""}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <p className="mt-1 text-xs text-neutral-500">
                {settings.smtpPasswordSet ? (
                  <Badge variant="success">Contrasena guardada</Badge>
                ) : (
                  <Badge variant="neutral">Sin contrasena todavia</Badge>
                )}
              </p>
            </div>

            <div>
              <label htmlFor="smtpFromEmail" className="mb-1 block text-sm font-medium">
                Email remitente
              </label>
              <input
                id="smtpFromEmail"
                type="email"
                {...register("smtpFromEmail")}
                placeholder="notificaciones@tutienda.com"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.smtpFromEmail && <p className="mt-1 text-xs text-red-600">{errors.smtpFromEmail.message}</p>}
            </div>

            <div>
              <label htmlFor="smtpFromName" className="mb-1 block text-sm font-medium">
                Nombre remitente
              </label>
              <input
                id="smtpFromName"
                {...register("smtpFromName")}
                placeholder="Tienda 3D"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="self-start">
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Probar la configuracion</p>
            <p className="text-xs text-neutral-500">
              {isConfigured
                ? `Envia un email de prueba a ${settings.smtpFromEmail}.`
                : "Guarda host, contrasena y email remitente antes de poder probarla."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleSendTest}
            disabled={!isConfigured || isSendingTest}
          >
            {isSendingTest ? "Enviando..." : "Enviar email de prueba"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StoreInfoForm({ initial }: { initial: StoreInfoSettings }) {
  const [settings, setSettings] = useState(initial);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StoreInfoFormValues>({
    resolver: zodResolver(updateStoreInfoSchema),
    defaultValues: {
      legalName: settings.legalName ?? "",
      taxId: settings.taxId ?? "",
      address: settings.address ?? "",
      city: settings.city ?? "",
      department: settings.department ?? "",
      contactPhone: settings.contactPhone ?? "",
      contactEmail: settings.contactEmail ?? "",
      invoicePrefix: settings.invoicePrefix ?? "",
      nextInvoiceNumber: settings.nextInvoiceNumber,
    },
  });

  async function onSubmit(values: StoreInfoFormValues) {
    try {
      const updated = await updateStoreInfo(values);
      setSettings(updated);
      toast.success("Datos de la tienda guardados.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="legalName" className="mb-1 block text-sm font-medium">
                Razon social
              </label>
              <input
                id="legalName"
                {...register("legalName")}
                placeholder="Tienda 3D SRL"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
            <div>
              <label htmlFor="taxId" className="mb-1 block text-sm font-medium">
                RUT
              </label>
              <input
                id="taxId"
                {...register("taxId")}
                placeholder="21XXXXXXXXXX"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="address" className="mb-1 block text-sm font-medium">
              Direccion
            </label>
            <input
              id="address"
              {...register("address")}
              placeholder="Calle 1234"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="city" className="mb-1 block text-sm font-medium">
                Ciudad
              </label>
              <input
                id="city"
                {...register("city")}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
            <div>
              <label htmlFor="department" className="mb-1 block text-sm font-medium">
                Departamento
              </label>
              <input
                id="department"
                {...register("department")}
                placeholder="Montevideo"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contactPhone" className="mb-1 block text-sm font-medium">
                Telefono de contacto
              </label>
              <input
                id="contactPhone"
                {...register("contactPhone")}
                placeholder="+598 00 000 000"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
            <div>
              <label htmlFor="contactEmail" className="mb-1 block text-sm font-medium">
                Email de contacto
              </label>
              <input
                id="contactEmail"
                type="email"
                {...register("contactEmail")}
                placeholder="hola@tutienda.com"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.contactEmail && <p className="mt-1 text-xs text-red-600">{errors.contactEmail.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="invoicePrefix" className="mb-1 block text-sm font-medium">
                Prefijo de comprobante
              </label>
              <input
                id="invoicePrefix"
                {...register("invoicePrefix")}
                placeholder="A"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
            <div>
              <label htmlFor="nextInvoiceNumber" className="mb-1 block text-sm font-medium">
                Proximo numero
              </label>
              <input
                id="nextInvoiceNumber"
                type="number"
                {...register("nextInvoiceNumber", { valueAsNumber: true })}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="self-start">
            {isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function VacationModeForm({ initial }: { initial: { vacationMode: boolean; vacationMessage: string | null } }) {
  const [settings, setSettings] = useState(initial);

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<VacationFormValues>({
    resolver: zodResolver(updateVacationModeSchema),
    defaultValues: {
      vacationMode: settings.vacationMode,
      vacationMessage: settings.vacationMessage ?? "",
    },
  });

  const vacationMode = watch("vacationMode");

  async function onSubmit(values: VacationFormValues) {
    try {
      const updated = await updateVacationMode(values);
      setSettings(updated);
      toast.success(updated.vacationMode ? "Modo vacaciones activado." : "Modo vacaciones desactivado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" {...register("vacationMode")} />
            Activar modo vacaciones
            {settings.vacationMode && <Badge variant="warning">Activo ahora</Badge>}
          </label>

          {vacationMode && (
            <div>
              <label htmlFor="vacationMessage" className="mb-1 block text-sm font-medium">
                Mensaje para mostrar en el sitio
              </label>
              <textarea
                id="vacationMessage"
                rows={2}
                {...register("vacationMessage")}
                placeholder="Estamos de vacaciones del 1 al 15 de enero, volvemos a despachar el 16."
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="self-start">
            {isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ShippingZonesManager({ initialZones }: { initialZones: ShippingZoneRow[] }) {
  const [zones, setZones] = useState(initialZones);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShippingZoneFormValues>({
    resolver: zodResolver(createShippingZoneSchema),
    defaultValues: { name: "", description: "", cost: 0 },
  });

  async function onSubmit(values: ShippingZoneFormValues) {
    try {
      const created = await createShippingZone(values);
      setZones((prev) => [...prev, created]);
      reset({ name: "", description: "", cost: 0 });
      toast.success("Zona de envio agregada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo agregar la zona.");
    }
  }

  async function handleToggleActive(zone: ShippingZoneRow) {
    try {
      const updated = await updateShippingZone(zone.id, { active: !zone.active });
      setZones((prev) => prev.map((z) => (z.id === zone.id ? updated : z)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la zona.");
    }
  }

  async function handleDelete(zone: ShippingZoneRow) {
    try {
      await deleteShippingZone(zone.id);
      setZones((prev) => prev.filter((z) => z.id !== zone.id));
      toast.success("Zona eliminada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la zona.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {zones.length > 0 && (
        <div className="flex flex-col gap-2">
          {zones.map((zone) => (
            <Card key={zone.id}>
              <CardContent className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {zone.name}
                    {zone.active ? (
                      <Badge variant="success">Activa</Badge>
                    ) : (
                      <Badge variant="neutral">Inactiva</Badge>
                    )}
                  </p>
                  {zone.description && (
                    <p className="mt-0.5 text-xs text-neutral-500">{zone.description}</p>
                  )}
                  <p className="mt-0.5 text-xs text-neutral-500">{formatCurrency(Number(zone.cost))}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => handleToggleActive(zone)}>
                    {zone.active ? "Desactivar" : "Activar"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(zone)}>
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
            <p className="text-sm font-medium">Agregar zona</p>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_140px]">
              <div>
                <label htmlFor="zoneName" className="mb-1 block text-sm font-medium">
                  Nombre
                </label>
                <input
                  id="zoneName"
                  {...register("name")}
                  placeholder="Montevideo"
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <label htmlFor="zoneDescription" className="mb-1 block text-sm font-medium">
                  Cobertura (opcional)
                </label>
                <input
                  id="zoneDescription"
                  {...register("description")}
                  placeholder="Capital y area metropolitana"
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </div>
              <div>
                <label htmlFor="zoneCost" className="mb-1 block text-sm font-medium">
                  Costo
                </label>
                <input
                  id="zoneCost"
                  type="number"
                  step="0.01"
                  {...register("cost", { valueAsNumber: true })}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                {errors.cost && <p className="mt-1 text-xs text-red-600">{errors.cost.message}</p>}
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="self-start">
              {isSubmitting ? "Agregando..." : "Agregar zona"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
