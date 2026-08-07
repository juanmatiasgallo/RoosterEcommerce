"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import {
  STORE_ICON_ALLOWED_EXTENSIONS,
  updateListmonkSettingsSchema,
  updateLoyaltySettingsSchema,
  updateMercadoPagoSettingsSchema,
  updateN8nSettingsSchema,
  updatePaymentInstructionsSchema,
  updateSmtpSettingsSchema,
  updateStoreInfoSchema,
  updateUmamiSettingsSchema,
  updateVacationModeSchema,
} from "@/lib/settings/schema";
import {
  removeStoreIcon,
  sendTestEmail,
  sendTestErrorToGlitchTip,
  sendTestListmonkConnection,
  sendTestN8nWebhook,
  updateListmonkSettings,
  updateLoyaltySettings,
  updateMercadoPagoSettings,
  updateN8nSettings,
  updatePaymentInstructions,
  updateSmtpSettings,
  updateStoreInfo,
  updateUmamiSettings,
  updateVacationMode,
  uploadStoreIcon,
  type ListmonkSettings,
  type LoyaltySettings,
  type MercadoPagoSettings,
  type N8nSettings,
  type PaymentInstructionsSettings,
  type SmtpSettings,
  type StoreInfoSettings,
  type UmamiSettings,
} from "@/lib/settings/actions";
import { renderObjToIconPng } from "@/lib/obj-snapshot";
import { formatCurrency } from "@/lib/format";
import { createShippingZoneSchema } from "@/lib/shipping/schema";
import {
  createShippingZone,
  deleteShippingZone,
  updateShippingZone,
  type ShippingZoneRow,
} from "@/lib/shipping/actions";
import { updateTelegramSettingsSchema } from "@/lib/telegram/schema";
import {
  sendTestTelegramMessage,
  updateTelegramSettings,
  updateTelegramTemplate,
  type TelegramSettings,
} from "@/lib/telegram/actions";
import { TELEGRAM_PLACEHOLDER_HELP } from "@/lib/telegram/event-types";
import { updateEmailTemplate, resetEmailTemplateToDefault, type EmailTemplatesList } from "@/lib/email-templates/actions";
import { EMAIL_PLACEHOLDER_HELP } from "@/lib/email-templates/event-types";
import { migrateUploadsToMinioAction } from "@/lib/storage/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";

type SmtpFormValues = z.infer<typeof updateSmtpSettingsSchema>;
type MpFormValues = z.infer<typeof updateMercadoPagoSettingsSchema>;
type PaymentInstructionsFormValues = z.infer<typeof updatePaymentInstructionsSchema>;
type StoreInfoFormValues = z.infer<typeof updateStoreInfoSchema>;
type VacationFormValues = z.infer<typeof updateVacationModeSchema>;
type ShippingZoneFormValues = z.infer<typeof createShippingZoneSchema>;
type LoyaltyFormValues = z.infer<typeof updateLoyaltySettingsSchema>;
type UmamiFormValues = z.infer<typeof updateUmamiSettingsSchema>;
type TelegramFormValues = z.infer<typeof updateTelegramSettingsSchema>;
type N8nFormValues = z.infer<typeof updateN8nSettingsSchema>;
type ListmonkFormValues = z.infer<typeof updateListmonkSettingsSchema>;

export function ConfiguracionClient({
  initialSmtp,
  initialMp,
  initialPaymentInstructions,
  initialStoreInfo,
  initialVacation,
  initialShippingZones,
  initialLoyalty,
  initialUmami,
  initialTelegram,
  initialN8n,
  initialListmonk,
  initialEmailTemplates,
}: {
  initialSmtp: SmtpSettings;
  initialMp: MercadoPagoSettings;
  initialPaymentInstructions: PaymentInstructionsSettings;
  initialStoreInfo: StoreInfoSettings;
  initialVacation: { vacationMode: boolean; vacationMessage: string | null };
  initialShippingZones: ShippingZoneRow[];
  initialLoyalty: LoyaltySettings;
  initialUmami: UmamiSettings;
  initialTelegram: TelegramSettings;
  initialN8n: N8nSettings;
  initialListmonk: ListmonkSettings;
  initialEmailTemplates: EmailTemplatesList;
}) {
  return (
    <Tabs defaultValue="tienda">
      <TabsList>
        <TabsTab value="tienda">Tienda</TabsTab>
        <TabsTab value="ventas">Ventas</TabsTab>
        <TabsTab value="notificaciones">Notificaciones</TabsTab>
        <TabsTab value="analytics">Analytics y monitoreo</TabsTab>
        <TabsIndicator />
      </TabsList>

      <TabsPanel value="tienda">
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
          <h2 className="text-lg font-semibold">Icono de la tienda</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Reemplaza el texto "Tienda 3D" del header (sitio y admin) y se usa como icono de la pestana del
            navegador. Acepta SVG, PNG, JPG, WEBP -- o un .obj (se convierte a imagen automaticamente al subirlo).
          </p>
          <div className="mt-4">
            <StoreIconForm initialHasIcon={initialStoreInfo.hasIcon} />
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
      </TabsPanel>

      <TabsPanel value="ventas">
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
          <h2 className="text-lg font-semibold">Puntos y recompensas</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Cuantos puntos gana un cliente por cada compra confirmada, y cuanto vale 1 punto al canjearlo por un
            cupon de descuento. En 0 el sistema queda apagado (no se otorgan puntos nuevos).
          </p>
          <div className="mt-4">
            <LoyaltySettingsForm initial={initialLoyalty} />
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
      </TabsPanel>

      <TabsPanel value="notificaciones">
        <section>
          <h2 className="text-lg font-semibold">SMTP</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Se usa para enviar notificaciones por email.
          </p>
          <div className="mt-4">
            <SmtpSettingsForm initial={initialSmtp} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Mails de compra</h2>
          <p className="mt-1 text-sm text-neutral-500">
            El HTML completo de cada mail que le llega al cliente durante el proceso de compra (pago confirmado,
            cambio de estado, entregado, codigo de seguimiento, instrucciones de pago, cotizacion lista, respuesta a
            una pregunta) -- usa el mismo SMTP de arriba. Podes editarlo libremente, siempre que la etiqueta{" "}
            <code>&lt;/html&gt;</code> quede al final; los <code>{"{{placeholder}}"}</code> se reemplazan por los
            datos reales al mandarlo.
          </p>
          <div className="mt-4">
            <EmailTemplatesEditor templates={initialEmailTemplates} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Telegram</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Avisos de negocio (pedido nuevo, comprobante subido, pedido a medida, preguntas de clientes) por un bot
            propio de Telegram. Usa un bot separado del que ya tengas para alertas de infraestructura (Uptime
            Kuma/GlitchTip) -- creado con{" "}
            <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">
              @BotFather
            </a>
            . Cada evento tiene su propio mensaje editable mas abajo, con el mismo HTML que ya usas.
          </p>
          <div className="mt-4">
            <TelegramSettingsForm initial={initialTelegram} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Webhook (n8n / automatizaciones)</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Manda un POST con los mismos eventos de negocio que Telegram (pedido nuevo, comprobante subido, etc.) a
            una URL propia -- pensado para conectar con n8n u otra automatizacion externa sin instalar nada nuevo en
            este servidor. El secret es opcional, se manda como header <code>X-Webhook-Secret</code> para que el otro
            lado pueda validar que el POST vino de aca.
          </p>
          <div className="mt-4">
            <N8nSettingsForm initial={initialN8n} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Newsletter (Listmonk)</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Cada alta en el formulario de newsletter del sitio se sincroniza automaticamente con una lista de tu
            instancia de Listmonk (self-hosted). Usuario y token de API se crean en Listmonk desde Settings → Users
            (tipo API), con un rol que solo tenga permisos de suscriptores.
          </p>
          <div className="mt-4">
            <ListmonkSettingsForm initial={initialListmonk} />
          </div>
        </section>
      </TabsPanel>

      <TabsPanel value="analytics">
        <section>
          <h2 className="text-lg font-semibold">Analytics (Umami)</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Website ID y URL del script de tu instancia de Umami (self-hosted). Si dejas esto vacio, se usan las
            variables de entorno NEXT_PUBLIC_UMAMI_WEBSITE_ID / NEXT_PUBLIC_UMAMI_SRC configuradas en el servidor.
            Cargarlo aca en vez de por env var permite cambiarlo sin rebuild -- pensado para poder reusar este mismo
            panel en otra implementacion/cliente sin tocar codigo, solo con los datos de su propia instancia.
          </p>
          <div className="mt-4">
            <UmamiSettingsForm initial={initialUmami} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Monitoreo de errores (GlitchTip)</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Se configura por variables de entorno del servidor (GLITCHTIP_DSN / NEXT_PUBLIC_GLITCHTIP_DSN), no desde
            este panel. Este boton manda una excepcion de prueba directo a tu instancia de GlitchTip, para confirmar
            que la conexion esta funcionando sin tener que esperar a que ocurra un error real.
          </p>
          <div className="mt-4">
            <GlitchTipTestCard />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Storage (MinIO)</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Migra a MinIO los comprobantes y archivos STL/OBJ que todavia estan en el volumen local viejo
            (/uploads). Se puede correr las veces que haga falta -- solo toca lo que no fue migrado todavia.
          </p>
          <div className="mt-4">
            <MigrateUploadsCard />
          </div>
        </section>
      </TabsPanel>
    </Tabs>
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
      paymentInstructionsContraentrega: settings.paymentInstructionsContraentrega ?? "",
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

          <div>
            <label htmlFor="paymentInstructionsContraentrega" className="mb-1 flex items-center gap-2 text-sm font-medium">
              Pago contra entrega
              {settings.paymentInstructionsContraentrega ? (
                <Badge variant="success">Activo</Badge>
              ) : (
                <Badge variant="neutral">No se ofrece</Badge>
              )}
            </label>
            <textarea
              id="paymentInstructionsContraentrega"
              rows={3}
              {...register("paymentInstructionsContraentrega")}
              placeholder="Ej: Pagas en efectivo o con tarjeta (debito/credito) al momento de que te entreguemos el pedido..."
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

function LoyaltySettingsForm({ initial }: { initial: LoyaltySettings }) {
  const [settings, setSettings] = useState(initial);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoyaltyFormValues>({
    resolver: zodResolver(updateLoyaltySettingsSchema),
    defaultValues: {
      loyaltyPointsPer100: settings.loyaltyPointsPer100,
      loyaltyPointValue: settings.loyaltyPointValue,
    },
  });

  const isActive = settings.loyaltyPointsPer100 > 0;

  async function onSubmit(values: LoyaltyFormValues) {
    try {
      const updated = await updateLoyaltySettings(values);
      setSettings(updated);
      toast.success("Configuracion de puntos guardada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            {isActive ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Apagado</Badge>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="loyaltyPointsPer100" className="mb-1 block text-sm font-medium">
                Puntos por cada $100 gastados
              </label>
              <input
                id="loyaltyPointsPer100"
                type="number"
                min={0}
                {...register("loyaltyPointsPer100", { valueAsNumber: true })}
                placeholder="0"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.loyaltyPointsPer100 && (
                <p className="mt-1 text-xs text-red-600">{errors.loyaltyPointsPer100.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="loyaltyPointValue" className="mb-1 block text-sm font-medium">
                Valor de 1 punto al canjear ($)
              </label>
              <input
                id="loyaltyPointValue"
                type="number"
                min={0}
                step="0.01"
                {...register("loyaltyPointValue", { valueAsNumber: true })}
                placeholder="0.00"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.loyaltyPointValue && (
                <p className="mt-1 text-xs text-red-600">{errors.loyaltyPointValue.message}</p>
              )}
            </div>
          </div>

          <p className="-mt-2 text-xs text-neutral-500">
            Los puntos se otorgan cuando una orden pasa a pagado, con la tasa vigente en ese momento — cambiar la
            tasa despues no afecta puntos ya otorgados.
          </p>

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

function UmamiSettingsForm({ initial }: { initial: UmamiSettings }) {
  const [settings, setSettings] = useState(initial);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UmamiFormValues>({
    resolver: zodResolver(updateUmamiSettingsSchema),
    defaultValues: {
      umamiWebsiteId: settings.umamiWebsiteId ?? "",
      umamiScriptUrl: settings.umamiScriptUrl ?? "",
    },
  });

  async function onSubmit(values: UmamiFormValues) {
    try {
      const updated = await updateUmamiSettings(values);
      setSettings(updated);
      toast.success("Configuracion de Umami guardada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la configuracion.");
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label htmlFor="umamiWebsiteId" className="mb-1 block text-sm font-medium">
              Website ID
            </label>
            <input
              id="umamiWebsiteId"
              {...register("umamiWebsiteId")}
              placeholder="d7c80746-f229-410a-8371-35dace0eb179"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm font-mono dark:border-neutral-700 dark:bg-neutral-900"
            />
            {errors.umamiWebsiteId && <p className="mt-1 text-xs text-red-600">{errors.umamiWebsiteId.message}</p>}
          </div>

          <div>
            <label htmlFor="umamiScriptUrl" className="mb-1 block text-sm font-medium">
              URL del script
            </label>
            <input
              id="umamiScriptUrl"
              {...register("umamiScriptUrl")}
              placeholder="https://analytics.tudominio.com/script.js"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm font-mono dark:border-neutral-700 dark:bg-neutral-900"
            />
            {errors.umamiScriptUrl && <p className="mt-1 text-xs text-red-600">{errors.umamiScriptUrl.message}</p>}
            <p className="mt-1 text-xs text-neutral-500">
              {settings.umamiWebsiteId && settings.umamiScriptUrl ? (
                <Badge variant="success">Configurado desde el panel</Badge>
              ) : (
                <Badge variant="neutral">Usando NEXT_PUBLIC_UMAMI_* del servidor (si estan seteadas)</Badge>
              )}
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
      instagramUrl: settings.instagramUrl ?? "",
      facebookUrl: settings.facebookUrl ?? "",
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
              <label htmlFor="instagramUrl" className="mb-1 block text-sm font-medium">
                Instagram
              </label>
              <input
                id="instagramUrl"
                {...register("instagramUrl")}
                placeholder="https://instagram.com/tutienda"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.instagramUrl && <p className="mt-1 text-xs text-red-600">{errors.instagramUrl.message}</p>}
            </div>
            <div>
              <label htmlFor="facebookUrl" className="mb-1 block text-sm font-medium">
                Facebook
              </label>
              <input
                id="facebookUrl"
                {...register("facebookUrl")}
                placeholder="https://facebook.com/tutienda"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.facebookUrl && <p className="mt-1 text-xs text-red-600">{errors.facebookUrl.message}</p>}
            </div>
          </div>
          <p className="-mt-2 text-xs text-neutral-500">
            El icono de WhatsApp del footer usa el telefono de contacto de arriba, no hace falta cargarlo aparte.
          </p>

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

// Icono de marca (task #192/#201): svg/png/jpg/webp se suben tal cual; un
// .obj se convierte a PNG en el navegador (renderObjToIconPng, tres.js ya
// es dependencia del proyecto) antes de llamar a uploadStoreIcon -- la
// Server Action nunca recibe un .obj crudo, ver comentario en
// settings/actions.ts. iconVersion fuerza a que el <img> de preview vuelva
// a pedir /api/branding/icon despues de subir/quitar (esa ruta tiene
// Cache-Control largo pensado para visitantes del sitio, no para esta
// pantalla de admin donde el owner quiere ver el resultado al toque).
function StoreIconForm({ initialHasIcon }: { initialHasIcon: boolean }) {
  const [hasIcon, setHasIcon] = useState(initialHasIcon);
  const [iconVersion, setIconVersion] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite volver a elegir el mismo archivo despues
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isObj = ext === "obj";
    if (!isObj && !STORE_ICON_ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`Extension no permitida. Usa: ${STORE_ICON_ALLOWED_EXTENSIONS.join(", ")} o .obj.`);
      return;
    }

    setIsUploading(true);
    try {
      const toUpload = isObj ? await renderObjToIconPng(file) : file;
      await uploadStoreIcon(toUpload);
      setHasIcon(true);
      setIconVersion((v) => v + 1);
      toast.success(isObj ? "Icono generado a partir del .obj y guardado." : "Icono guardado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir el icono.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove() {
    setIsRemoving(true);
    try {
      await removeStoreIcon();
      setHasIcon(false);
      toast.success("Icono quitado, el header vuelve a mostrar el texto.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo quitar el icono.");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900">
            {hasIcon ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview de un archivo recien subido, no vale la pena el pipeline de optimizacion de next/image para esto.
              <img
                key={iconVersion}
                src={`/api/branding/icon?v=${iconVersion}`}
                alt="Icono actual de la tienda"
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              <span className="text-xs text-neutral-400">Sin icono</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={isUploading} onClick={() => inputRef.current?.click()}>
                {isUploading ? "Procesando..." : hasIcon ? "Reemplazar icono" : "Subir icono"}
              </Button>
              {hasIcon && (
                <Button type="button" variant="outline" disabled={isRemoving} onClick={handleRemove}>
                  {isRemoving ? "Quitando..." : "Quitar icono"}
                </Button>
              )}
            </div>
            <p className="text-xs text-neutral-500">Maximo 2MB. Un .obj se renderiza y convierte a imagen antes de guardarse.</p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".svg,.png,.jpg,.jpeg,.webp,.obj"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
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

function N8nSettingsForm({ initial }: { initial: N8nSettings }) {
  const [settings, setSettings] = useState(initial);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<N8nFormValues>({
    resolver: zodResolver(updateN8nSettingsSchema),
    defaultValues: {
      n8nWebhookUrl: settings.n8nWebhookUrl ?? "",
      n8nWebhookSecret: "",
    },
  });

  async function onSubmit(values: N8nFormValues) {
    try {
      const updated = await updateN8nSettings(values);
      setSettings(updated);
      toast.success("Configuracion del webhook guardada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la configuracion.");
    }
  }

  async function handleSendTest() {
    setIsSendingTest(true);
    try {
      const result = await sendTestN8nWebhook();
      if (result.success) {
        toast.success("Webhook de prueba enviado.");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el webhook de prueba.");
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
              <label htmlFor="n8nWebhookUrl" className="mb-1 block text-sm font-medium">
                URL del webhook
              </label>
              <input
                id="n8nWebhookUrl"
                {...register("n8nWebhookUrl")}
                placeholder="https://tu-n8n.tudominio.com/webhook/xxxxx"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm font-mono dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.n8nWebhookUrl && <p className="mt-1 text-xs text-red-600">{errors.n8nWebhookUrl.message}</p>}
            </div>

            <div>
              <label htmlFor="n8nWebhookSecret" className="mb-1 block text-sm font-medium">
                Secret (opcional)
              </label>
              <input
                id="n8nWebhookSecret"
                type="password"
                autoComplete="new-password"
                {...register("n8nWebhookSecret")}
                placeholder={
                  settings.n8nWebhookSecretSet ? "Ya hay uno guardado (dejar vacio para no cambiarlo)" : ""
                }
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <p className="mt-1 text-xs text-neutral-500">
                {settings.n8nWebhookSecretSet ? (
                  <Badge variant="success">Configurado</Badge>
                ) : (
                  <Badge variant="neutral">Sin secret (el webhook igual funciona)</Badge>
                )}
              </p>
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
            <p className="text-sm font-medium">Probar la conexion</p>
            <p className="text-xs text-neutral-500">
              {settings.n8nWebhookUrl
                ? "Manda un POST de prueba a la URL configurada."
                : "Guarda la URL antes de poder probarla."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleSendTest}
            disabled={!settings.n8nWebhookUrl || isSendingTest}
          >
            {isSendingTest ? "Enviando..." : "Enviar webhook de prueba"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ListmonkSettingsForm({ initial }: { initial: ListmonkSettings }) {
  const [settings, setSettings] = useState(initial);
  const [isTesting, setIsTesting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ListmonkFormValues>({
    resolver: zodResolver(updateListmonkSettingsSchema),
    defaultValues: {
      listmonkUrl: settings.listmonkUrl ?? "",
      listmonkApiUser: settings.listmonkApiUser ?? "",
      listmonkApiToken: "",
      listmonkListId: settings.listmonkListId ?? "",
    },
  });

  async function onSubmit(values: ListmonkFormValues) {
    try {
      const updated = await updateListmonkSettings(values);
      setSettings(updated);
      toast.success("Configuracion de Listmonk guardada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la configuracion.");
    }
  }

  async function handleTest() {
    setIsTesting(true);
    try {
      const result = await sendTestListmonkConnection();
      if (result.success) {
        toast.success(`Conexion OK. Lista: "${result.listName}".`);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo probar la conexion.");
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label htmlFor="listmonkUrl" className="mb-1 block text-sm font-medium">
                URL de Listmonk
              </label>
              <input
                id="listmonkUrl"
                {...register("listmonkUrl")}
                placeholder="https://newsletter.tudominio.com"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm font-mono dark:border-neutral-700 dark:bg-neutral-900"
              />
              {errors.listmonkUrl && <p className="mt-1 text-xs text-red-600">{errors.listmonkUrl.message}</p>}
            </div>

            <div>
              <label htmlFor="listmonkApiUser" className="mb-1 block text-sm font-medium">
                Usuario de API
              </label>
              <input
                id="listmonkApiUser"
                {...register("listmonkApiUser")}
                placeholder="tienda3d-sync"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm font-mono dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>

            <div>
              <label htmlFor="listmonkApiToken" className="mb-1 block text-sm font-medium">
                Token de API
              </label>
              <input
                id="listmonkApiToken"
                type="password"
                autoComplete="new-password"
                {...register("listmonkApiToken")}
                placeholder={settings.listmonkApiTokenSet ? "Ya hay uno guardado (dejar vacio para no cambiarlo)" : ""}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <p className="mt-1 text-xs text-neutral-500">
                {settings.listmonkApiTokenSet ? (
                  <Badge variant="success">Configurado</Badge>
                ) : (
                  <Badge variant="neutral">Sin token</Badge>
                )}
              </p>
            </div>

            <div>
              <label htmlFor="listmonkListId" className="mb-1 block text-sm font-medium">
                ID de la lista
              </label>
              <input
                id="listmonkListId"
                {...register("listmonkListId")}
                placeholder="1"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm font-mono dark:border-neutral-700 dark:bg-neutral-900"
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
            <p className="text-sm font-medium">Probar la conexion</p>
            <p className="text-xs text-neutral-500">
              {settings.listmonkUrl && settings.listmonkApiTokenSet && settings.listmonkListId
                ? "Confirma que la URL, credenciales y lista son correctas (no toca suscriptores)."
                : "Guarda la configuracion completa antes de poder probarla."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={!settings.listmonkUrl || !settings.listmonkApiTokenSet || !settings.listmonkListId || isTesting}
          >
            {isTesting ? "Probando..." : "Probar conexion"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function GlitchTipTestCard() {
  const [isSending, setIsSending] = useState(false);

  async function handleSendTestError() {
    setIsSending(true);
    try {
      const result = await sendTestErrorToGlitchTip();
      toast.success(`Excepcion de prueba enviada (event id: ${result.eventId.slice(0, 8)}...). Deberia aparecer en GlitchTip en unos segundos.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar la prueba.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Probar la conexion</p>
          <p className="text-xs text-neutral-500">
            Manda una excepcion de prueba a GlitchTip. Si no aparece nada alla en un minuto, revisa GLITCHTIP_DSN en
            las variables de entorno de EasyPanel.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={handleSendTestError} disabled={isSending}>
          {isSending ? "Enviando..." : "Probar notificacion de error"}
        </Button>
      </CardContent>
    </Card>
  );
}

function MigrateUploadsCard() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof migrateUploadsToMinioAction>> | null>(null);

  async function handleMigrate() {
    setIsMigrating(true);
    setResult(null);
    try {
      const summary = await migrateUploadsToMinioAction();
      setResult(summary);
      const total = summary.receipts.ok + summary.customOrderFiles.ok;
      const failed = summary.receipts.failed + summary.customOrderFiles.failed;
      if (failed === 0) {
        toast.success(`${total} archivo(s) migrado(s) a MinIO.`);
      } else {
        toast.error(`${total} migrado(s), ${failed} con error. Ver detalle abajo.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo migrar.");
    } finally {
      setIsMigrating(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Migrar archivos legacy a MinIO</p>
            <p className="text-xs text-neutral-500">
              Sube a MinIO lo que todavia esta en /uploads y actualiza los registros en la base.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={handleMigrate} disabled={isMigrating}>
            {isMigrating ? "Migrando..." : "Migrar ahora"}
          </Button>
        </div>

        {result && (
          <div className="rounded border border-neutral-200 p-3 text-xs dark:border-neutral-800">
            <p>
              Comprobantes: {result.receipts.ok} migrados, {result.receipts.failed} con error.
            </p>
            <p>
              Pedidos a medida: {result.customOrderFiles.ok} migrados, {result.customOrderFiles.failed} con error.
            </p>
            {[...result.receipts.errors, ...result.customOrderFiles.errors].map((err) => (
              <p key={err} className="mt-1 text-red-600">
                {err}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TelegramSettingsForm({ initial }: { initial: TelegramSettings }) {
  const [settings, setSettings] = useState(initial);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<TelegramFormValues>({
    resolver: zodResolver(updateTelegramSettingsSchema),
    defaultValues: {
      telegramChatId: settings.telegramChatId ?? "",
      telegramBotToken: "",
    },
  });

  const isConfigured = Boolean(settings.telegramBotTokenSet && settings.telegramChatId);

  async function onSubmit(values: TelegramFormValues) {
    try {
      const updated = await updateTelegramSettings(values);
      setSettings((prev) => ({ ...prev, ...updated }));
      toast.success("Configuracion de Telegram guardada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la configuracion.");
    }
  }

  async function handleSendTest() {
    setIsSendingTest(true);
    try {
      const result = await sendTestTelegramMessage();
      if (result.success) {
        toast.success("Mensaje de prueba enviado.");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el mensaje de prueba.");
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
              <label htmlFor="telegramBotToken" className="mb-1 block text-sm font-medium">
                Bot Token
              </label>
              <input
                id="telegramBotToken"
                type="password"
                autoComplete="new-password"
                {...register("telegramBotToken")}
                placeholder={
                  settings.telegramBotTokenSet ? "Ya hay uno guardado (dejar vacio para no cambiarlo)" : "123456:ABC-DEF..."
                }
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <p className="mt-1 text-xs text-neutral-500">
                {settings.telegramBotTokenSet ? (
                  <Badge variant="success">Configurado</Badge>
                ) : (
                  <Badge variant="neutral">Sin bot conectado todavia</Badge>
                )}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Lo obtenes hablando con{" "}
                <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">
                  @BotFather
                </a>{" "}
                en Telegram, comando /newbot.
              </p>
            </div>

            <div>
              <label htmlFor="telegramChatId" className="mb-1 block text-sm font-medium">
                ID de Chat
              </label>
              <input
                id="telegramChatId"
                {...register("telegramChatId")}
                placeholder="123456789"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm font-mono dark:border-neutral-700 dark:bg-neutral-900"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Numerico, no el nombre de usuario. Mandale un mensaje al bot y consulta
                https://api.telegram.org/bot&lt;token&gt;/getUpdates para verlo.
              </p>
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
            <p className="text-sm font-medium">Probar la conexion</p>
            <p className="text-xs text-neutral-500">
              {isConfigured
                ? "Manda un mensaje de prueba al chat configurado."
                : "Guarda el bot token y el ID de chat antes de poder probarla."}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={handleSendTest} disabled={!isConfigured || isSendingTest}>
            {isSendingTest ? "Enviando..." : "Enviar mensaje de prueba"}
          </Button>
        </CardContent>
      </Card>

      <TelegramTemplatesEditor
        templates={settings.templates}
        onTemplateChange={(eventType, next) =>
          setSettings((prev) => ({
            ...prev,
            templates: prev.templates.map((t) => (t.eventType === eventType ? { ...t, ...next } : t)),
          }))
        }
      />
    </div>
  );
}

function TelegramTemplatesEditor({
  templates,
  onTemplateChange,
}: {
  templates: TelegramSettings["templates"];
  onTemplateChange: (eventType: string, next: { enabled: boolean; template: string }) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium">Mensajes por evento</p>
        <p className="mt-1 text-xs text-neutral-500">{TELEGRAM_PLACEHOLDER_HELP}</p>
      </div>
      {templates.map((tpl) => (
        <TelegramTemplateCard
          key={tpl.eventType}
          template={tpl}
          onSaved={(next) => onTemplateChange(tpl.eventType, next)}
        />
      ))}
    </div>
  );
}

function TelegramTemplateCard({
  template,
  onSaved,
}: {
  template: TelegramSettings["templates"][number];
  onSaved: (next: { enabled: boolean; template: string }) => void;
}) {
  const [enabled, setEnabled] = useState(template.enabled);
  const [text, setText] = useState(template.template);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = enabled !== template.enabled || text !== template.template;

  async function handleSave() {
    setIsSaving(true);
    try {
      const updated = await updateTelegramTemplate({ eventType: template.eventType, enabled, template: text });
      onSaved({ enabled: updated.enabled, template: updated.template });
      toast.success(`Mensaje de "${template.label}" guardado.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el mensaje.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setText(template.defaultTemplate);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              {template.label}
              {enabled ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Apagado</Badge>}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">{template.description}</p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Enviar
          </label>
        </div>

        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded border border-neutral-300 px-3 py-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
        />

        <div className="flex items-center gap-2 self-start">
          <Button type="button" size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={handleReset} disabled={text === template.defaultTemplate}>
            Restaurar por defecto
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Mismo patron exacto que TelegramTemplatesEditor/TelegramTemplateCard de
// arriba, pero editando HTML completo (no un mensaje corto) -- pedido
// explicito del owner: "quiero poder mandar plantillas html como la otra"
// (la otra = el template armado a mano en Listmonk). Subject separado del
// HTML para no obligar a editarlo adentro del markup.
function EmailTemplatesEditor({ templates }: { templates: EmailTemplatesList }) {
  const [items, setItems] = useState(templates);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium">Plantillas por evento</p>
        <p className="mt-1 text-xs text-neutral-500">{EMAIL_PLACEHOLDER_HELP}</p>
      </div>
      {items.map((tpl) => (
        <EmailTemplateCard
          key={tpl.eventType}
          template={tpl}
          onSaved={(next) =>
            setItems((prev) => prev.map((t) => (t.eventType === tpl.eventType ? { ...t, ...next } : t)))
          }
        />
      ))}
    </div>
  );
}

function EmailTemplateCard({
  template,
  onSaved,
}: {
  template: EmailTemplatesList[number];
  onSaved: (next: { enabled: boolean; subject: string; html: string }) => void;
}) {
  const [enabled, setEnabled] = useState(template.enabled);
  const [subject, setSubject] = useState(template.subject);
  const [html, setHtml] = useState(template.html);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const isDirty = enabled !== template.enabled || subject !== template.subject || html !== template.html;
  const isDefault = subject === template.defaultSubject && html === template.defaultHtml;

  async function handleSave() {
    setIsSaving(true);
    try {
      const updated = await updateEmailTemplate({ eventType: template.eventType, enabled, subject, html });
      onSaved({ enabled: updated.enabled, subject: updated.subject, html: updated.html });
      toast.success(`Plantilla de "${template.label}" guardada.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la plantilla.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    setIsResetting(true);
    try {
      const updated = await resetEmailTemplateToDefault(template.eventType);
      setEnabled(updated.enabled);
      setSubject(updated.subject);
      setHtml(updated.html);
      onSaved({ enabled: updated.enabled, subject: updated.subject, html: updated.html });
      toast.success(`Plantilla de "${template.label}" restaurada.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo restaurar la plantilla.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              {template.label}
              {enabled ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Apagado</Badge>}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">{template.description}</p>
            <p className="mt-1 text-xs text-neutral-400">
              Variables: {template.placeholders.map((p) => `{{${p}}}`).join(", ")}
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Enviar
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Asunto
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          HTML del mail
          <textarea
            rows={14}
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            spellCheck={false}
            className="w-full rounded border border-neutral-300 px-3 py-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <div className="flex items-center gap-2 self-start">
          <Button type="button" size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={handleReset} disabled={isDefault || isResetting}>
            {isResetting ? "Restaurando..." : "Restaurar por defecto"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
