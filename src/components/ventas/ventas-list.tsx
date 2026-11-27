"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  FileText,
  Printer,
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
type InvoiceList = {
  items: Invoice[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};
type CustomerOption = { id: number; nombre: string };

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
  const [paymentFilter, setPaymentFilter] = useState<
    "todas" | Invoice["formaPago"]
  >("todas");
  const [customerFilter, setCustomerFilter] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<InvoiceList["pagination"]>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [canceling, setCanceling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (statusFilter !== "todas") params.set("estado", statusFilter);
      if (paymentFilter !== "todas") params.set("formaPago", paymentFilter);
      if (customerFilter) params.set("clienteId", customerFilter);
      if (desde) params.set("desde", desde);
      if (hasta) params.set("hasta", hasta);
      if (search.trim()) params.set("q", search.trim());
      const data = await apiFetch<InvoiceList>(
        `/api/facturas?${params.toString()}`,
      );
      setInvoices(data.items);
      setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }, [customerFilter, desde, hasta, page, paymentFilter, search, statusFilter]);

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
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  useEffect(() => {
    let active = true;
    apiFetch<{ items: CustomerOption[] }>("/api/clientes?activos=true&pageSize=100")
      .then((data) => {
        if (active) setCustomers(data.items);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar los clientes para filtrar.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredInvoices = invoices;

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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Comprobantes</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Ventas</h1>
          <p className="mt-1 text-sm text-slate-400">
            Buscá, filtrá e imprimí facturas emitidas o anuladas.
          </p>
        </div>
        <Link
          href="/ventas/nueva"
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
        >
          Nueva venta
        </Link>
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="relative min-w-[240px] flex-1">
            <span className="sr-only">Buscar factura</span>
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Buscar por número o cliente..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-amber-500"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(
                event.target.value as "todas" | "emitida" | "anulada",
              );
            }}
            aria-label="Filtrar por estado"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500"
          >
            <option value="todas">Todos los estados</option>
            <option value="emitida">Emitidas</option>
            <option value="anulada">Anuladas</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(event) => {
              setPage(1);
              setPaymentFilter(event.target.value as typeof paymentFilter);
            }}
            aria-label="Filtrar por forma de pago"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500"
          >
            <option value="todas">Todas las formas de pago</option>
            <option value="contado">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="cuenta_corriente">Cuenta corriente</option>
          </select>
          <select
            value={customerFilter}
            onChange={(event) => {
              setPage(1);
              setCustomerFilter(event.target.value);
            }}
            aria-label="Filtrar por cliente"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500"
          >
            <option value="">Todos los clientes</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.nombre}</option>
            ))}
          </select>
          <label className="text-xs font-medium text-slate-500">
            Desde
            <input
              type="date"
              value={desde}
              onChange={(event) => {
                setPage(1);
                setDesde(event.target.value);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Hasta
            <input
              type="date"
              value={hasta}
              onChange={(event) => {
                setPage(1);
                setHasta(event.target.value);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </label>
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
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/ventas/${invoice.id}`}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                      >
                        Abrir
                      </Link>
                      <button
                        type="button"
                        onClick={() => openDetail(invoice.id)}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                      >
                        Vista rápida
                      </button>
                    </div>
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
        <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
          <span>
            {pagination.total === 0
              ? "0 ventas"
              : `${(page - 1) * pagination.pageSize + 1}–${Math.min(
                  page * pagination.pageSize,
                  pagination.total,
                )} de ${pagination.total} ventas`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
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
            <section className="print-receipt space-y-5">
              <header className="border-b border-slate-700 pb-4">
                <p className="text-sm font-semibold uppercase tracking-widest text-slate-300">
                  Casa de Repuestos
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Factura{" "}
                  {formatearNumeroFactura(detail.puntoVenta, detail.numero)}
                </h2>
                {detail.estado === "anulada" && (
                  <p className="mt-1 text-sm font-semibold text-red-300">
                    ANULADA
                  </p>
                )}
              </header>
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
            </section>

            {detail.estado === "emitida" && rol === "admin" && (
              <form
                onSubmit={cancelInvoice}
                className="no-print rounded-xl border border-red-500/20 bg-red-500/5 p-4"
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
            <div className="no-print flex justify-end">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
              >
                <Printer className="h-4 w-4" />
                Imprimir factura
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
