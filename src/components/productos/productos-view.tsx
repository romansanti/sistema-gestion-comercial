"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Archive,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { useSession } from "@/components/session-provider";
import { apiFetch, pesosAcentavos } from "@/lib/api-client";
import {
  centavosAValorInput,
  formatearFechaHora,
  formatearMoneda,
} from "@/lib/format";
import { crearProductoSchema } from "@/lib/schemas/productos";

type Category = { id: number; nombre: string; activa: boolean };
type Product = {
  id: number;
  codigo: string;
  descripcion: string;
  categoriaId: number;
  categoriaNombre: string;
  precio: number;
  existencia: number;
  stockMinimo: number;
  activo: boolean;
  createdAt: string;
};
type ProductList = {
  items: Product[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
type StockMovement = {
  id: number;
  tipo: "venta" | "anulacion" | "ingreso" | "egreso";
  cantidad: number;
  existenciaResultante: number;
  motivo: string;
  observacion: string | null;
  fecha: string;
  usuarioNombre: string;
};
type ProductDetail = Product & { movimientos: StockMovement[] };

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-300";

export default function ProductosPage() {
  const isAdmin = useSession().rol === "admin";
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(
    searchParams.get("bajoMinimo") === "true",
  );
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<ProductList["pagination"]>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [movementType, setMovementType] = useState<"ingreso" | "egreso">(
    "ingreso",
  );
  const [productForm, setProductForm] = useState({
    codigo: "",
    descripcion: "",
    categoriaId: "",
    precio: "",
    existenciaInicial: "0",
    stockMinimo: "0",
  });
  const [categoryName, setCategoryName] = useState("");
  const [movementForm, setMovementForm] = useState({
    cantidad: "1",
    motivo: "",
    observacion: "",
  });

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (categoryFilter) params.set("categoriaId", categoryFilter);
    if (lowStockOnly) params.set("bajoMinimo", "true");
    params.set("page", String(page));
    params.set("pageSize", "20");
    const [productData, categoryData] = await Promise.all([
      apiFetch<ProductList>(`/api/productos?${params.toString()}`),
      apiFetch<Category[]>("/api/categorias"),
    ]);
    setProducts(productData.items);
    setPagination(productData.pagination);
    setCategories(categoryData);
  }, [categoryFilter, lowStockOnly, page, query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refresh()
        .catch((cause: unknown) =>
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo cargar el catálogo.",
          ),
        )
        .finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.activa),
    [categories],
  );

  async function loadDetail(productId: number) {
    setError(null);
    try {
      setDetail(await apiFetch<ProductDetail>(`/api/productos/${productId}`));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo cargar el historial del repuesto.",
      );
    }
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const price = pesosAcentavos(productForm.precio);
    if (price === null || price <= 0) {
      setError("Ingresá un precio válido, mayor que cero.");
      return;
    }
    const validation = crearProductoSchema.safeParse({
      codigo: productForm.codigo,
      descripcion: productForm.descripcion,
      categoriaId: Number(productForm.categoriaId),
      precio: price,
      existenciaInicial: Number(productForm.existenciaInicial),
      stockMinimo: Number(productForm.stockMinimo),
    });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    setBusy(true);
    try {
      await apiFetch<Product>("/api/productos", {
        method: "POST",
        body: JSON.stringify(validation.data),
      });
      setProductModalOpen(false);
      setProductForm({
        codigo: "",
        descripcion: "",
        categoriaId: "",
        precio: "",
        existenciaInicial: "0",
        stockMinimo: "0",
      });
      setNotice("Repuesto creado correctamente.");
      try {
        await refresh();
      } catch {
        setError("Repuesto creado, pero no se pudo actualizar el catálogo.");
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo crear el repuesto.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function editProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget) return;
    setError(null);
    const price = pesosAcentavos(productForm.precio);
    if (price === null || price <= 0) {
      setError("Ingresá un precio válido, mayor que cero.");
      return;
    }

    setBusy(true);
    try {
      await apiFetch<Product>(`/api/productos/${editTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          codigo: productForm.codigo,
          descripcion: productForm.descripcion,
          categoriaId: Number(productForm.categoriaId),
          precio: price,
          stockMinimo: Number(productForm.stockMinimo),
        }),
      });
      setProductModalOpen(false);
      setEditTarget(null);
      setNotice("Repuesto actualizado correctamente.");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo editar el repuesto.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleProduct(product: Product) {
    setError(null);
    try {
      await apiFetch<Product>(`/api/productos/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activo: !product.activo }),
      });
      setNotice(
        `${product.descripcion} ${product.activo ? "archivado" : "reactivado"}.`,
      );
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo cambiar el estado del repuesto.",
      );
    }
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch<Category>("/api/categorias", {
        method: "POST",
        body: JSON.stringify({ nombre: categoryName }),
      });
      setCategoryName("");
      setNotice("Categoría creada correctamente.");
      try {
        await refresh();
      } catch {
        setError("Categoría creada, pero no se pudo actualizar el catálogo.");
      }
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
    try {
      await apiFetch<Category>(`/api/categorias/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activa: !category.activa }),
      });
      setNotice(`Categoría ${category.activa ? "desactivada" : "activada"}.`);
      try {
        await refresh();
      } catch {
        setError(
          "Categoría actualizada, pero no se pudo recargar la lista.",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo actualizar la categoría.",
      );
    }
  }

  async function recordMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/api/productos/${detail.id}/movimientos`, {
        method: "POST",
        body: JSON.stringify({
          tipo: movementType,
          cantidad: Number(movementForm.cantidad),
          motivo: movementForm.motivo,
          observacion: movementForm.observacion || undefined,
        }),
      });
      setMovementForm({ cantidad: "1", motivo: "", observacion: "" });
      setNotice("Movimiento de stock registrado.");
      try {
        await Promise.all([loadDetail(detail.id), refresh()]);
      } catch {
        setError(
          "Movimiento registrado, pero no se pudieron actualizar los datos.",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo registrar el movimiento.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Inventario
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">
            Repuestos y stock
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Buscá por código o descripción y revisá los movimientos de cada artículo.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/productos/categorias"
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Gestionar categorías
            </Link>
            <button
              type="button"
              onClick={() => setCategoryModalOpen(true)}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Categorías
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setProductModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              Nuevo repuesto
            </button>
          </div>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-xs underline"
          >
            Cerrar
          </button>
        </div>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          {notice}
        </p>
      )}

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_220px_auto]">
          <label className="relative">
            <span className="sr-only">Buscar repuesto</span>
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
              placeholder="Buscar por código o descripción..."
              className={`${inputClass} pl-10`}
            />
          </label>
          <select
            value={categoryFilter}
            onChange={(event) => {
              setPage(1);
              setCategoryFilter(event.target.value);
            }}
            aria-label="Filtrar por categoría"
            className={inputClass}
          >
            <option value="">Todas las categorías</option>
            {activeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nombre}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(event) => {
                setPage(1);
                setLowStockOnly(event.target.checked);
              }}
              className="accent-amber-500"
            />
            Solo stock bajo
          </label>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Código / Repuesto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-right">Existencia</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {products.map((product) => {
                const lowStock = product.existencia <= product.stockMinimo;
                return (
                  <tr key={product.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{product.descripcion}</p>
                      <p className="text-xs text-slate-500">{product.codigo}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {product.categoriaNombre}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200">
                      {formatearMoneda(product.precio)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        lowStock ? "text-amber-300" : "text-slate-200"
                      }`}
                    >
                      {product.existencia}
                      <span className="ml-1 text-xs font-normal text-slate-500">
                        / mín. {product.stockMinimo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          !product.activo
                            ? "bg-slate-800 text-slate-400"
                            : lowStock
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        {!product.activo
                          ? "Inactivo"
                          : lowStock
                            ? "Stock bajo"
                            : "Disponible"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/productos/${product.id}`}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                        >
                          Ficha
                        </Link>
                        <button
                          type="button"
                          onClick={() => loadDetail(product.id)}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                        >
                          Movimientos
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              aria-label={`Editar ${product.codigo}`}
                              onClick={() => {
                                setEditTarget(product);
                                setProductForm({
                                  codigo: product.codigo,
                                  descripcion: product.descripcion,
                                  categoriaId: String(product.categoriaId),
                                  precio: centavosAValorInput(product.precio),
                                  existenciaInicial: "0",
                                  stockMinimo: String(product.stockMinimo),
                                });
                                setProductModalOpen(true);
                              }}
                              className="rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleProduct(product)}
                              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                            >
                              {product.activo ? "Archivar" : "Reactivar"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No hay repuestos que coincidan con esos filtros.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    Cargando catálogo...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          <Boxes className="mr-1 inline h-3.5 w-3.5" />
          {pagination.total} repuestos · Página {pagination.page} de{" "}
          {Math.max(pagination.totalPages, 1)}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => current - 1)}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page >= pagination.totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </section>

      <Modal
        open={productModalOpen}
        title={editTarget ? "Editar repuesto" : "Agregar repuesto"}
        onClose={() => {
          setProductModalOpen(false);
          setEditTarget(null);
        }}
      >
        <form
          onSubmit={editTarget ? editProduct : createProduct}
          className="grid gap-4 sm:grid-cols-2"
        >
          <label className="sm:col-span-1">
            <span className={labelClass}>Código</span>
            <input
              required
              minLength={2}
              maxLength={30}
              value={productForm.codigo}
              onChange={(event) =>
                setProductForm({ ...productForm, codigo: event.target.value })
              }
              className={inputClass}
            />
          </label>
          <label className="sm:col-span-1">
            <span className={labelClass}>Categoría</span>
            <select
              required
              value={productForm.categoriaId}
              onChange={(event) =>
                setProductForm({ ...productForm, categoriaId: event.target.value })
              }
              className={inputClass}
            >
              <option value="">Seleccionar...</option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Descripción</span>
            <input
              required
              minLength={3}
              maxLength={150}
              value={productForm.descripcion}
              onChange={(event) =>
                setProductForm({ ...productForm, descripcion: event.target.value })
              }
              className={inputClass}
            />
          </label>
          <label>
            <span className={labelClass}>Precio de venta ($)</span>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={productForm.precio}
              onChange={(event) =>
                setProductForm({ ...productForm, precio: event.target.value })
              }
              className={inputClass}
            />
          </label>
          {!editTarget && (
            <label>
              <span className={labelClass}>Stock inicial</span>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={productForm.existenciaInicial}
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    existenciaInicial: event.target.value,
                  })
                }
                className={inputClass}
              />
            </label>
          )}
          <label>
            <span className={labelClass}>Alerta bajo stock</span>
            <input
              required
              type="number"
              min="0"
              step="1"
              value={productForm.stockMinimo}
              onChange={(event) =>
                setProductForm({ ...productForm, stockMinimo: event.target.value })
              }
              className={inputClass}
            />
          </label>
          <div className="flex items-end justify-end gap-2">
            <button
              type="button"
              onClick={() => setProductModalOpen(false)}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || activeCategories.length === 0}
              className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {busy
                ? "Guardando..."
                : editTarget
                  ? "Guardar cambios"
                  : "Guardar repuesto"}
            </button>
          </div>
          {activeCategories.length === 0 && (
            <p className="text-sm text-amber-300 sm:col-span-2">
              Creá una categoría antes de dar de alta repuestos.
            </p>
          )}
        </form>
      </Modal>

      <Modal
        open={categoryModalOpen}
        title="Administrar categorías"
        onClose={() => setCategoryModalOpen(false)}
      >
        <form onSubmit={createCategory} className="mb-5 flex gap-2">
          <input
            required
            minLength={2}
            maxLength={60}
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Nombre de la nueva categoría"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
          >
            Crear
          </button>
        </form>
        <div className="divide-y divide-slate-800 rounded-xl border border-slate-800">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{category.nombre}</p>
                <p className="text-xs text-slate-500">
                  {category.activa ? "Activa" : "Inactiva"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                {category.activa ? "Desactivar" : "Activar"}
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="p-4 text-sm text-slate-500">Todavía no hay categorías.</p>
          )}
        </div>
      </Modal>

      <Modal
        open={detail !== null}
        title={detail ? `Historial · ${detail.codigo}` : "Historial de stock"}
        onClose={() => setDetail(null)}
        className="max-w-4xl"
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-white">{detail.descripcion}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {detail.categoriaNombre} · {formatearMoneda(detail.precio)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-right">
                <p className="text-xs text-slate-500">Existencia actual</p>
                <p className="text-lg font-bold text-white">{detail.existencia}</p>
              </div>
            </div>

            {isAdmin && (
              <form
                onSubmit={recordMovement}
                className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-5"
              >
                <label>
                  <span className={labelClass}>Movimiento</span>
                  <select
                    value={movementType}
                    onChange={(event) =>
                      setMovementType(event.target.value as "ingreso" | "egreso")
                    }
                    className={inputClass}
                  >
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Cantidad</span>
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={movementForm.cantidad}
                    onChange={(event) =>
                      setMovementForm({
                        ...movementForm,
                        cantidad: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass}>Motivo</span>
                  <input
                    required
                    minLength={3}
                    maxLength={120}
                    value={movementForm.motivo}
                    onChange={(event) =>
                      setMovementForm({
                        ...movementForm,
                        motivo: event.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="Compra, ajuste..."
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex items-end justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {movementType === "ingreso" ? (
                    <ArrowDownToLine className="h-4 w-4" />
                  ) : (
                    <ArrowUpFromLine className="h-4 w-4" />
                  )}
                  {busy ? "Guardando..." : "Registrar"}
                </button>
                <label className="md:col-span-5">
                  <span className={labelClass}>Observación (opcional)</span>
                  <input
                    maxLength={250}
                    value={movementForm.observacion}
                    onChange={(event) =>
                      setMovementForm({
                        ...movementForm,
                        observacion: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </label>
              </form>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-950 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3 text-right">Existencia resultante</th>
                    <th className="px-4 py-3">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {detail.movimientos.map((movement) => (
                    <tr key={movement.id}>
                      <td className="px-4 py-3 text-slate-400">
                        {formatearFechaHora(movement.fecha)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-slate-200">
                          {movement.tipo === "ingreso" ? (
                            <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-400" />
                          ) : movement.tipo === "egreso" ? (
                            <ArrowUpFromLine className="h-3.5 w-3.5 text-amber-400" />
                          ) : (
                            <Archive className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          {movement.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {movement.motivo}
                        {movement.observacion && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {movement.observacion}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-200">
                        {movement.cantidad}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white">
                        {movement.existenciaResultante}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {movement.usuarioNombre}
                      </td>
                    </tr>
                  ))}
                  {detail.movimientos.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Este repuesto todavía no tiene movimientos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
