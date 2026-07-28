"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { reorderCategories } from "@/lib/catalog/actions";
import type { CategoryTreeNode } from "@/lib/catalog/queries";
import { CategoriaFormDialog } from "./categoria-form-dialog";

type DialogState =
  | { mode: "create"; parentId: string | null }
  | { mode: "edit"; category: CategoryTreeNode }
  | null;

function flattenTree(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

export function CategoriasClient({ categoryTree }: { categoryTree: CategoryTreeNode[] }) {
  const [isPending, startTransition] = useTransition();
  const [dialogState, setDialogState] = useState<DialogState>(null);

  const allCategories = flattenTree(categoryTree);

  // Reordenar = intercambiar la posicion de dos hermanos (mismo parentId) y
  // pisarla via reorderCategories. Se eligio esto en vez de drag-and-drop
  // para no sumar una dependencia nueva solo para este sub-paso.
  function moveSibling(siblings: CategoryTreeNode[], index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const current = siblings[index];
    const target = siblings[targetIndex];

    startTransition(async () => {
      try {
        await reorderCategories([
          { id: current.id, position: target.position },
          { id: target.id, position: current.position },
        ]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo reordenar.");
      }
    });
  }

  function renderNode(node: CategoryTreeNode, siblings: CategoryTreeNode[], index: number, depth: number) {
    return (
      <li key={node.id} className="flex flex-col gap-1">
        <div
          className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <span className="text-sm">{node.name}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => moveSibling(siblings, index, -1)}
              disabled={index === 0 || isPending}
              aria-label="Subir"
              className="rounded p-1 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-700"
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              onClick={() => moveSibling(siblings, index, 1)}
              disabled={index === siblings.length - 1 || isPending}
              aria-label="Bajar"
              className="rounded p-1 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-700"
            >
              <ChevronDown size={16} />
            </button>
            <button
              type="button"
              onClick={() => setDialogState({ mode: "create", parentId: node.id })}
              aria-label="Agregar subcategoria"
              className="rounded p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              onClick={() => setDialogState({ mode: "edit", category: node })}
              aria-label="Editar"
              className="rounded p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            >
              <Pencil size={16} />
            </button>
          </div>
        </div>
        {node.children.length > 0 && (
          <ul>{node.children.map((child, childIndex) => renderNode(child, node.children, childIndex, depth + 1))}</ul>
        )}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categorias</h1>
        <button
          type="button"
          onClick={() => setDialogState({ mode: "create", parentId: null })}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Nueva categoria
        </button>
      </div>

      {categoryTree.length === 0 ? (
        <p className="text-sm text-neutral-500">Todavia no hay categorias creadas.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {categoryTree.map((node, index) => renderNode(node, categoryTree, index, 0))}
        </ul>
      )}

      {dialogState?.mode === "edit" && (
        <CategoriaFormDialog
          key={dialogState.category.id}
          mode="edit"
          category={dialogState.category}
          allCategories={allCategories}
          onClose={() => setDialogState(null)}
        />
      )}
      {dialogState?.mode === "create" && (
        <CategoriaFormDialog
          key={`create-${dialogState.parentId}`}
          mode="create"
          defaultParentId={dialogState.parentId}
          allCategories={allCategories}
          onClose={() => setDialogState(null)}
        />
      )}
    </div>
  );
}
