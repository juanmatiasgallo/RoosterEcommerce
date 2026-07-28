"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { updateMercadoPagoSettingsSchema, updateSmtpSettingsSchema } from "@/lib/settings/schema";
import {
  sendTestEmail,
  updateMercadoPagoSettings,
  updateSmtpSettings,
  type MercadoPagoSettings,
  type SmtpSettings,
} from "@/lib/settings/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type SmtpFormValues = z.infer<typeof updateSmtpSettingsSchema>;
type MpFormValues = z.infer<typeof updateMercadoPagoSettingsSchema>;

export function ConfiguracionClient({
  initialSmtp,
  initialMp,
}: {
  initialSmtp: SmtpSettings;
  initialMp: MercadoPagoSettings;
}) {
  return (
    <div className="flex flex-col gap-10">
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
