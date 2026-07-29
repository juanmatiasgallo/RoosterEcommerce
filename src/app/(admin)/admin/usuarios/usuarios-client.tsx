"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { AdminUserListItem } from "@/lib/users/actions";
import { adminSetUserActive } from "@/lib/users/actions";
import { UsuarioFormDialog } from "./usuario-form-dialog";
import { UsuarioEditDialog } from "./usuario-edit-dialog";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  empleado: "Empleado",
  cliente: "Cliente",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(date);
}

export function UsuariosClient({ users }: { users: AdminUserListItem[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserListItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Task #22: antes la tabla listaba clientes pero no habia ninguna accion
  // para tocarlos ("no tiene opciones", segun el owner). Desactivar es soft
  // delete (mismo criterio que productos/variantes en CLAUDE.md): preserva
  // el historial de compras y se puede reactivar.
  function handleToggleActive(user: AdminUserListItem) {
    const next = !user.active;
    if (!next) {
      const confirmed = window.confirm(
        `Desactivar a ${user.name}? No va a poder iniciar sesion hasta que la reactives.`,
      );
      if (!confirmed) return;
    }

    setPendingId(user.id);
    startTransition(async () => {
      try {
        await adminSetUserActive(user.id, next);
        toast.success(next ? "Cuenta reactivada." : "Cuenta desactivada.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar el estado.");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Usuarios</h1>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Nuevo usuario
        </button>
      </div>

      <div className="overflow-x-auto">
        {users.length === 0 ? (
          <p className="text-sm text-neutral-500">Todavia no hay usuarios.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800">
                <th className="py-2 pr-4 font-medium">Nombre</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Rol</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 font-medium">Creado</th>
                <th className="py-2 pr-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-neutral-100 transition-colors hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/50"
                >
                  <td className="py-2 pr-4">{user.name}</td>
                  <td className="py-2 pr-4">{user.email}</td>
                  <td className="py-2 pr-4">{ROLE_LABELS[user.role] ?? user.role}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                          : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      }`}
                    >
                      {user.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{formatDate(user.createdAt)}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingUser(user)}
                        className="text-accent hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user)}
                        disabled={isPending && pendingId === user.id}
                        className="text-neutral-500 hover:underline disabled:opacity-50 dark:text-neutral-400"
                      >
                        {isPending && pendingId === user.id
                          ? "Guardando..."
                          : user.active
                            ? "Desactivar"
                            : "Reactivar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialogOpen && <UsuarioFormDialog onClose={() => setDialogOpen(false)} />}
      {editingUser && <UsuarioEditDialog user={editingUser} onClose={() => setEditingUser(null)} />}
    </div>
  );
}
