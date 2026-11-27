"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, Plus } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { apiFetch } from "@/lib/api-client";
import { formatearFechaHora, formatearMoneda } from "@/lib/format";
import { registrarMovimientoStockSchema } from "@/lib/schemas/stock";

type Movement = {
  id: number;
  tipo: "venta" | "anulacion" | "ingreso" | "egreso";
  cantidad: number;
  existenciaResultante: number;
  motivo: string;
  observacion: string | null;
  fecha: string;
  usuarioNombre: string;
};

type ProductDetail = {
  id: number;
  codigo: string;
  descripcion: string;
  categoriaNombre: string;
  precio: number;
  existencia: number;
  stockMinimo: number;
  activo: boolean;
  movimientos: Movement[];
};

export default function ProductoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const isAdmin = useSession().rol === "admin";
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"ingreso" | "egreso">("ingreso");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState("");

  const refresh = useCallback(async () => {
    setProduct(await apiFetch<ProductDetail>(`/api/productos/${id}`));
  }, [id]);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      refresh()
        .catch((cause: unknown) => {
          if (active) {
            setError(
              cause instanceof Error
                ? cause.message
                : "No se pudo cargar el producto.",
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [refresh]);

  async function registrarMovimiento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;
    setError(null);
    setNotice(null);
    const validation = registrarMovimientoStockSchema.safeParse({
      tipo,
      cantidad: Number(cantidad),
      motivo,
    });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    setBusy(true);
    try {
      await apiFetch(`/api/productos/${product.id}/movimientos`, {
        method: "POST",
        body: JSON.stringify(validation.data),
      });
      setCantidad("1");
      setMotivo("");
      setNotice("Movimiento de stock registrado.");
      await refresh();
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

  if (loading) {
    return <p className="text-sm text-slate-400">Cargando producto...</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/productos"
        className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a repuestos
      </Link>

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {notice}
        </p>
      )}
      {!product && !error && (
        <p className="rounded-xl border border-slate-800 p-8 text-center text-slate-400">
          Producto no encontrado.
        </p>
      )}

      {product && (
        <>
          <header className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
              {product.codigo} · {product.categoriaNombre}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              {product.descripcion}
            </h1>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <p className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
                Precio: <strong className="text-white">{formatearMoneda(product.precio)}</strong>
              </p>
              <p className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
                Existencia: <strong className="text-white">{product.existencia}</strong>
              </p>
              <p className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
                Stock mínimo: <strong className="text-white">{product.stockMinimo}</strong>
              </p>
            </div>
          </header>

          {isAdmin && (
            <form
              onSubmit={registrarMovimiento}
              className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-4"
            >
              <label className="text-sm text-slate-300">
                Movimiento
                <select
                  value={tipo}
                  onChange={(event) =>
                    setTipo(event.target.value as "ingreso" | "egreso")
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                >
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
              </label>
              <label className="text-sm text-slate-300">
                Cantidad
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={cantidad}
                  onChange={(event) => setCantidad(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </label>
              <label className="text-sm text-slate-300 sm:col-span-2">
                Motivo
                <input
                  required
                  minLength={3}
                  maxLength={120}
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                />
              </label>
              <div className="sm:col-span-4 sm:text-right">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {busy ? "Guardando..." : "Registrar movimiento"}
                </button>
              </div>
            </form>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 p-5">
              <h2 className="font-semibold text-white">Historial de stock</h2>
            </div>
            {product.movimientos.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">
                Todavía no hay movimientos de stock.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-950 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Tipo / motivo</th>
                      <th className="px-4 py-3 text-right">Cantidad</th>
                      <th className="px-4 py-3 text-right">Existencia</th>
                      <th className="px-4 py-3">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {product.movimientos.map((movement) => (
                      <tr key={movement.id}>
                        <td className="px-4 py-3 text-slate-300">
                          {formatearFechaHora(movement.fecha)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-white">{movement.tipo}</span>
                          <span className="ml-2 text-slate-400">{movement.motivo}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {movement.cantidad}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {movement.existenciaResultante}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {movement.usuarioNombre}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
