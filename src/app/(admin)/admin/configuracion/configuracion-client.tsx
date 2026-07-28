"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { updateSmtpSettingsSchema } from "@/lib/settings/schema";
import { sendTestEmail, updateSmtpSettings, type SmtpSettings } from "@/lib/settings/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type FormValues = z.infer<typeof updateSmtpSettingsSchema>;

export function ConfiguracionClient({ initial }: { initial: SmtpSettings }) {
  const [settings, setSettings] = useState(initial);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
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

  async function onSubmit(values: FormValues) {
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
