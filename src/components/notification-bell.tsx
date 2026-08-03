"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications/actions";
import type { notifications } from "@/lib/db/schema";

type NotificationRow = typeof notifications.$inferSelect;

function formatRelative(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "recien";
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

// Sin tiempo real: la lista/contador vienen del server en cada navegacion
// (el layout que envuelve esto ya hace la query fresca en cada request) —
// mismo criterio de simplicidad que el resto del proyecto.
export function NotificationBell({
  initialItems,
  initialUnreadCount,
  positionClassName = "right-0",
}: {
  initialItems: NotificationRow[];
  initialUnreadCount: number;
  // "right-0" (default) ancla el borde derecho del dropdown al icono --
  // anda bien en site-header.tsx, donde la campana siempre esta cerca del
  // borde derecho del header y el dropdown se abre hacia la izquierda sin
  // salirse. admin-sidebar.tsx pasa clases distintas por breakpoint (task
  // #144, bug reportado con captura: el dropdown se disparaba hacia la
  // izquierda y quedaba cortado contra el borde de la ventana) -- ese
  // sidebar cambia de layout el mismo breakpoint (barra horizontal en
  // mobile, columna angosta a la izquierda en sm+), asi que la alineacion
  // del dropdown tiene que cambiar junto con eso, no un valor fijo.
  positionClassName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isPending, startTransition] = useTransition();

  function handleItemClick(item: NotificationRow) {
    if (!item.readAt) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date() } : n)));
      setUnreadCount((count) => Math.max(0, count - 1));
      startTransition(async () => {
        await markNotificationRead(item.id);
        router.refresh();
      });
    }
    setOpen(false);
  }

  function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    setUnreadCount(0);
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notificaciones"
        className="relative flex items-center text-neutral-600 hover:text-accent dark:text-neutral-300"
      >
        <Bell size={20} className={unreadCount > 0 ? "animate-[wiggle_0.5s_ease-in-out]" : undefined} />
        {unreadCount > 0 && (
          <span className="animate-in zoom-in-50 absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-foreground duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Overlay para cerrar al clickear afuera, sin agregar una lib de
              click-outside solo para esto. */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          {/* w-[min(20rem,90vw)] en vez de w-80 fijo: evita que el ancho fijo
              de 320px se pase del viewport en pantallas chicas. El lado por
              el que se abre lo decide `positionClassName` -- ver comentario
              en la firma del componente. */}
          <div
            className={`animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 absolute top-full z-20 mt-2 flex max-h-96 w-[min(20rem,90vw)] flex-col overflow-y-auto rounded border border-neutral-200 bg-white shadow-lg duration-150 dark:border-neutral-800 dark:bg-neutral-900 ${positionClassName}`}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
              <p className="text-sm font-medium">Notificaciones</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  className="text-xs text-accent underline disabled:opacity-50"
                >
                  Marcar todas leidas
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="p-4 text-center text-sm text-neutral-500">No hay notificaciones todavia.</p>
            ) : (
              items.map((item) => {
                const content = (
                  <div
                    className={`flex flex-col gap-0.5 border-b border-neutral-100 px-3 py-2 text-sm last:border-b-0 dark:border-neutral-800 ${
                      item.readAt ? "" : "bg-accent/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 break-words font-medium">{item.title}</p>
                      {!item.readAt && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                    </div>
                    {item.body && <p className="min-w-0 break-words text-neutral-500">{item.body}</p>}
                    <p className="text-xs text-neutral-400">{formatRelative(item.createdAt)}</p>
                  </div>
                );

                return item.link ? (
                  <Link key={item.id} href={item.link} onClick={() => handleItemClick(item)} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    {content}
                  </Link>
                ) : (
                  <button key={item.id} type="button" onClick={() => handleItemClick(item)} className="w-full text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
