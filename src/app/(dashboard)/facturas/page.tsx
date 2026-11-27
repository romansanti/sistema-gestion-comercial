"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  FileText,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useSession } from "@/components/session-provider";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/lib/api-client";
import {
  formatearFechaHora,
  formatearMoneda,
  formatearNumeroFactura,
} from "@/lib/format";

type Invoice = {
  id: number;
  puntoVenta: number;
  numero: number;
  fecha: string;
  clienteId: number | null;
  clienteNombre: string | null;
  usuarioId: number;
  vendedorNombre: string;
  total: number;
  formaPago: "contado" | "tarjeta" | "cuenta_corriente";
  estado: "emitida" | "anulada";
};
type InvoiceDetail = Invoice & {
  clienteDoc: string | null;
  montoRecibido: number | null;
  tarjetaTipo: "debito" | "credito" | null;
  tarjetaMarca: string | null;
  tarjetaUltimos4: string | null;
  motivoAnulacion: string | null;
  fechaAnulacion: string | null;
  items: Array<{
    id: number;
    productoId: number;
    codigo: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
};

const paymentLabel: Record<Invoice["formaPago"], string> = {
  contado: "Efectivo",
  tarjeta: "Tarjeta",
  cuenta_corriente: "Cuenta corriente",
};

export default function FacturasPage() {
  const { rol } = useSession();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    "todas" | "emitida" | "anulada"
  >("todas");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [canceling, setCanceling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await apiFetch<Invoice[]>("/api/facturas");
    setInvoices(data);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refresh()
        .catch((cause: unknown) =>
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar las facturas.",
          ),
        )
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesStatus =
      statusFilter === "todas" || invoice.estado === statusFilter;
    const term = search.trim().toLocaleLowerCase();
    const matchesSearch =
      !term ||
      formatearNumeroFactura(invoice.puntoVenta, invoice.numero)
        .toLocaleLowerCase()
        .includes(term) ||
      (invoice.clienteNombre ?? "consumidor final")
        .toLocaleLowerCase()
        .includes(term);
    return matchesStatus && matchesSearch;
  });

  async function openDetail(invoiceId: number) {
    setError(null);
    setCancelReason("");
    try {
      setDetail(await apiFetch<InvoiceDetail>(`/api/facturas/${invoiceId}`));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo cargar el detalle de la factura.",
      );
    }
  }

  async function cancelInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setError(null);
    setCanceling(true);
    try {
      await apiFetch(`/api/facturas/${detail.id}/anular`, {
        method: "POST",
        body: JSON.stringify({ motivoAnulacion: cancelReason }),
      });
      setNotice(
        `Factura ${formatearNumeroFactura(detail.puntoVenta, detail.numero)} anulada. Se restituyó el stock.`,
      );
      await openDetail(detail.id);
      try {
        await refresh();
      } catch {
        setError("Factura anulada, pero no se pudo actualizar el listado.");
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo anular la factura.",
      );
    } finally {
      setCanceling(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          Comprobantes
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Facturas emitidas</h1>
        <p className="mt-1 text-sm text-slate-400">
          Consultá el detalle de los comprobantes y su historial de anulación.
        </p>
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
        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-[240px] flex-1">
            <span className="sr-only">Buscar factura</span>
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por número o cliente..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-amber-500"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "todas" | "emitida" | "anulada",
              )
            }
            aria-label="Filtrar por estado"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500"
          >
            <option value="todas">Todos los estados</option>
            <option value="emitida">Emitidas</option>
            <option value="anulada">Anuladas</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Comprobante</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Forma de pago</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-semibold text-white">
                    {formatearNumeroFactura(invoice.puntoVenta, invoice.numero)}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatearFechaHora(invoice.fecha)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {invoice.clienteNombre || "Consumidor final"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {paymentLabel[invoice.formaPago]}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-white">
                    {formatearMoneda(invoice.total)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        invoice.estado === "emitida"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-red-500/10 text-red-300"
                      }`}
                    >
                      {invoice.estado === "emitida" ? "Emitida" : "Anulada"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openDetail(invoice.id)}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                    >
                      Ver factura
                    </button>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Cargando comprobantes...
                  </td>
                </tr>
              )}
              {!loading && filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    No hay facturas que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={detail !== null}
        title={
          detail
            ? `Factura ${formatearNumeroFactura(detail.puntoVenta, detail.numero)}`
            : "Detalle de factura"
        }
        onClose={() => setDetail(null)}
        className="max-w-4xl"
      >
        {detail && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs text-slate-500">Fecha</p>
                <p className="mt-1 text-sm text-white">
                  {formatearFechaHora(detail.fecha)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs text-slate-500">Cliente</p>
                <p className="mt-1 text-sm text-white">
                  {detail.clienteNombre || "Consumidor final"}
                </p>
                {detail.clienteDoc && (
                  <p className="text-xs text-slate-500">{detail.clienteDoc}</p>
                )}
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs text-slate-500">Vendedor</p>
                <p className="mt-1 text-sm text-white">{detail.vendedorNombre}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs text-slate-500">Pago</p>
                <p className="mt-1 text-sm text-white">
                  {paymentLabel[detail.formaPago]}
                </p>
                {detail.formaPago === "tarjeta" && (
                  <p className="text-xs text-slate-400">
                    {detail.tarjetaMarca} · {detail.tarjetaTipo} · ••••{" "}
                    {detail.tarjetaUltimos4}
                  </p>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-slate-950 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Código / Descripción</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3 text-right">Precio unitario</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {detail.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="text-white">{item.descripcion}</p>
                        <p className="text-xs text-slate-500">{item.codigo}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {item.cantidad}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {formatearMoneda(item.precioUnitario)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white">
                        {formatearMoneda(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-950">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-3 text-right font-semibold text-slate-300"
                    >
                      Total
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-white">
                      {formatearMoneda(detail.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {detail.estado === "anulada" && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="flex items-center gap-2 font-semibold text-red-200">
                  <ShieldAlert className="h-4 w-4" />
                  Factura anulada
                </p>
                <p className="mt-1 text-sm text-red-100/80">
                  Motivo: {detail.motivoAnulacion || "No informado"}
                </p>
                {detail.fechaAnulacion && (
                  <p className="mt-1 text-xs text-red-100/60">
                    {formatearFechaHora(detail.fechaAnulacion)}
                  </p>
                )}
              </div>
            )}

            {detail.estado === "emitida" && rol === "admin" && (
              <form
                onSubmit={cancelInvoice}
                className="rounded-xl border border-red-500/20 bg-red-500/5 p-4"
              >
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-red-200">
                    Motivo de anulación
                  </span>
                  <textarea
                    required
                    minLength={5}
                    maxLength={200}
                    rows={2}
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    placeholder="Indicá el motivo (mínimo 5 caracteres)"
                    className="w-full rounded-lg border border-red-500/20 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-red-400"
                  />
                </label>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">
                    La anulación restituye el stock de los productos.
                  </p>
                  <button
                    type="submit"
                    disabled={canceling || cancelReason.trim().length < 5}
                    className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <FileText className="h-4 w-4" />
                    {canceling ? "Anulando..." : "Anular factura"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
