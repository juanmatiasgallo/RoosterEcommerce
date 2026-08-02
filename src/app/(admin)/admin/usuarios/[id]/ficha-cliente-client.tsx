"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { adminResetUserPassword, adminSetUserActive, type AdminUserDetail } from "@/lib/users/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { UsuarioEditDialog } from "../usuario-edit-dialog";
import { TempPasswordDialog } from "../temp-password-dialog";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  empleado: "Empleado",
  cliente: "Cliente",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mercado_pago: "Mercado Pago",
  transferencia: "Transferencia",
  abitab: "Abitab",
  redpagos: "Red Pagos",
  mi_dinero: "Debito Mi Dinero",
  prex: "Prex",
  contra_entrega: "Pago contra entrega",
};

const ORDER_STATUS_LABELS: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  pendiente_pago: { label: "Pendiente de pago", variant: "neutral" },
  pendiente_confirmacion: { label: "Orden de servicio — sin confirmar", variant: "warning" },
  pagado: { label: "Pagado", variant: "info" },
  en_cola: { label: "En cola", variant: "warning" },
  imprimiendo: { label: "Imprimiendo", variant: "warning" },
  postprocesado: { label: "Postprocesado", variant: "warning" },
  enviado: { label: "Enviado", variant: "accent" },
  entregado: { label: "Entregado", variant: "success" },
  cancelado: { label: "Cancelado", variant: "neutral" },
};

const CUSTOM_ORDER_STATUS_LABELS: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  pendiente: { label: "Pendiente de cotizar", variant: "neutral" },
  cotizado: { label: "Cotizado", variant: "info" },
  vencido: { label: "Presupuesto vencido", variant: "danger" },
  pagado: { label: "Pagado", variant: "success" },
  en_impresion: { label: "En impresion", variant: "warning" },
  listo: { label: "Listo para entregar", variant: "accent" },
  entregado: { label: "Entregado", variant: "success" },
  rechazado: { label: "Rechazado", variant: "danger" },
  cancelado: { label: "Cancelado", variant: "neutral" },
};

// Ficha de solo lectura (task #143) que reusa las mismas Server Actions y
// dialogs de /admin/usuarios (editar, resetear contrasena, desactivar) en
// vez de duplicarlos -- detail.user es un superset del shape que esos
// componentes esperan (AdminUserListItem).
export function FichaClienteClient({ detail }: { detail: AdminUserDetail }) {
  const [user, setUser] = useState(detail.user);
  const [editing, setEditing] = useState(false);
  const [isTogglingActive, startToggleTransition] = useTransition();
  const [isResetting, startResetTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function handleToggleActive() {
    const next = !user.active;
    if (!next) {
      const confirmed = window.confirm(`Desactivar a ${user.name}? No va a poder iniciar sesion hasta que la reactives.`);
      if (!confirmed) return;
    }
    startToggleTransition(async () => {
      try {
        const updated = await adminSetUserActive(user.id, next);
        setUser((prev) => ({ ...prev, active: updated.active }));
        toast.success(next ? "Cuenta reactivada." : "Cuenta desactivada.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar el estado.");
      }
    });
  }

  function handleResetPassword() {
    const confirmed = window.confirm(
      `Resetear la contrasena de ${user.name}? Se le va a generar una temporal y se le va a pedir que la cambie en el proximo login.`,
    );
    if (!confirmed) return;
    startResetTransition(async () => {
      try {
        const { tempPassword: generated } = await adminResetUserPassword(user.id);
        toast.success(`Contrasena reseteada. Se le mando por mail a ${user.email}.`);
        setTempPassword(generated);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo resetear la contrasena.");
      }
    });
  }

  const address = user.defaultShippingAddress;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/usuarios"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a usuarios
        </Link>
      </div>

      <section className="rounded border border-neutral-200 p-5 dark:border-neutral-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{user.name}</h1>
            <p className="text-sm text-neutral-500">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={user.active ? "success" : "neutral"}>{user.active ? "Activo" : "Inactivo"}</Badge>
            <Badge variant="info">{ROLE_LABELS[user.role] ?? user.role}</Badge>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Telefono</dt>
            <dd>{user.phone || "-"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Cliente desde</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Terminos aceptados</dt>
            <dd>{user.termsAcceptedAt ? formatDate(user.termsAcceptedAt) : "-"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Ultimo medio de pago</dt>
            <dd>{user.lastPaymentMethod ? (PAYMENT_METHOD_LABELS[user.lastPaymentMethod] ?? user.lastPaymentMethod) : "-"}</dd>
          </div>
          {address && (
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">Direccion de envio (ultima usada)</dt>
              <dd>
                {address.calle} {address.numero}
                {address.piso ? `, piso ${address.piso}` : ""}, {address.ciudad}, {address.departamento} (CP{" "}
                {address.cp})
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-900">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Editar datos
          </button>
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={isResetting}
            className="text-sm text-neutral-500 hover:underline disabled:opacity-50 dark:text-neutral-400"
          >
            {isResetting ? "Reseteando..." : "Resetear contrasena"}
          </button>
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={isTogglingActive}
            className="text-sm text-neutral-500 hover:underline disabled:opacity-50 dark:text-neutral-400"
          >
            {isTogglingActive ? "Guardando..." : user.active ? "Desactivar" : "Reactivar"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-xs text-neutral-500">Compras</p>
          <p className="text-lg font-semibold">{detail.stats.orderCount}</p>
        </div>
        <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-xs text-neutral-500">Pedidos a medida</p>
          <p className="text-lg font-semibold">{detail.stats.customOrderCount}</p>
        </div>
        <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-xs text-neutral-500">Total gastado</p>
          <p className="text-lg font-semibold">{formatCurrency(detail.stats.totalSpent)}</p>
        </div>
        <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-xs text-neutral-500">Puntos de fidelidad</p>
          <p className="text-lg font-semibold">{detail.loyaltyBalance}</p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Compras</h2>
        {detail.orders.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Todavia no hizo ninguna compra.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {detail.orders.map((order) => {
              const status = ORDER_STATUS_LABELS[order.status] ?? { label: order.status, variant: "neutral" as const };
              return (
                <div
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-neutral-200 p-3 text-sm dark:border-neutral-800"
                >
                  <div>
                    <p className="font-medium">
                      #{order.orderNumber}{" "}
                      <span className="font-normal text-neutral-400">
                        {order.source === "pedido_custom" ? "· pedido a medida" : "· catalogo"}
                      </span>
                    </p>
                    <p className="text-xs text-neutral-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{formatCurrency(Number(order.total))}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Pedidos a medida</h2>
        {detail.customOrders.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Todavia no hizo ningun pedido a medida.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {detail.customOrders.map((order) => {
              const status = CUSTOM_ORDER_STATUS_LABELS[order.status] ?? {
                label: order.status,
                variant: "neutral" as const,
              };
              return (
                <div
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-neutral-200 p-3 text-sm dark:border-neutral-800"
                >
                  <div>
                    <p className="font-medium">{order.fileName}</p>
                    <p className="text-xs text-neutral-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{order.quotedPrice ? formatCurrency(Number(order.quotedPrice)) : "-"}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {editing && <UsuarioEditDialog user={user} onClose={() => setEditing(false)} />}
      {tempPassword && (
        <TempPasswordDialog
          userName={user.name}
          userEmail={user.email}
          tempPassword={tempPassword}
          onClose={() => setTempPassword(null)}
        />
      )}
    </div>
  );
}
