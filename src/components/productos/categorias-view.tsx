"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/lib/api-client";

type Category = { id: number; nombre: string; activa: boolean };

export default function CategoriasPage() {
  const isAdmin = useSession().rol === "admin";
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setCategories(await apiFetch<Category[]>("/api/categorias"));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refresh()
        .catch((cause: unknown) =>
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar las categorías.",
          ),
        )
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch<Category>("/api/categorias", {
        method: "POST",
        body: JSON.stringify({ nombre: name }),
      });
      setName("");
      setNotice("Categoría creada correctamente.");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo crear la categoría.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleCategory(category: Category) {
    setError(null);
    setBusy(true);
    try {
      await apiFetch<Category>(`/api/categorias/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activa: !category.activa }),
      });
      setNotice(`Categoría ${category.activa ? "desactivada" : "activada"}.`);
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo cambiar el estado de la categoría.",
      );
    } finally {
      setBusy(false);
    }

  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget) return;
    setError(null);
    setBusy(true);
    try {
      await apiFetch<Category>(`/api/categorias/${editTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ nombre: editName }),
      });
      setEditTarget(null);
      setNotice("Nombre de categoría actualizado.");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo actualizar la categoría.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href="/productos"
        className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a repuestos
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          Inventario
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Categorías</h1>
        <p className="mt-1 text-sm text-slate-400">
          Administrá las categorías del catálogo. Las categorías con productos no se pueden desactivar.
        </p>
      </header>
      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {notice}
        </p>
      )}
      {isAdmin && (
        <form
          onSubmit={createCategory}
          className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:flex-row"
        >
          <input
            required
            minLength={2}
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de la nueva categoría"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Crear categoría
          </button>
        </form>
      )}
      <section className="divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-400">
            Cargando categorías...
          </p>
        ) : categories.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">
            No hay categorías registradas.
          </p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-medium text-white">{category.nombre}</p>
                <p className="text-xs text-slate-400">
                  {category.activa ? "Activa" : "Inactiva"}
                </p>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditTarget(category);
                      setEditName(category.nombre);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleCategory(category)}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    {category.activa ? "Desactivar" : "Activar"}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </section>
      <Modal
        open={editTarget !== null}
        title="Editar categoría"
        onClose={() => setEditTarget(null)}
        className="max-w-lg"
      >
        <form onSubmit={saveCategory} className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">
            Nombre
            <input
              required
              minLength={2}
              maxLength={60}
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-amber-500"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {busy ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
