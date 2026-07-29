"use client";

import { useState } from "react";
import type { AdminUserListItem } from "@/lib/users/actions";
import { UsuarioFormDialog } from "./usuario-form-dialog";

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
                <th className="py-2 pr-4 font-medium">Creado</th>
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
                  <td className="py-2 pr-4">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialogOpen && <UsuarioFormDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}
