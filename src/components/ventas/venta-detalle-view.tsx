"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Ban, Printer, ShieldAlert } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/lib/api-client";
import {
  formatearFechaHora,
  formatearMoneda,
  formatearNumeroFactura,
} from "@/lib/format";

type InvoiceDetail = {
  id: number;
  puntoVenta: number;
  numero: number;
  fecha: string;
  clienteNombre: string | null;
  clienteDoc: string | null;
  vendedorNombre: string;
  total: number;
  formaPago: "contado" | "tarjeta" | "cuenta_corriente";
  montoRecibido: number | null;
  tarjetaTipo: "debito" | "credito" | null;
  tarjetaMarca: string | null;
  tarjetaUltimos4: string | null;
  estado: "emitida" | "anulada";
  motivoAnulacion: string | null;
  fechaAnulacion: string | null;
  items: Array<{
    id: number;
    codigo: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
};

const paymentLabel: Record<InvoiceDetail["formaPago"], string> = {
  contado: "Efectivo",
  tarjeta: "Tarjeta",
  cuenta_corriente: "Cuenta corriente",
};

export default function VentaDetallePage() {
  const params = useParams<{ id: string }>();
  const { rol } = useSession();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<InvoiceDetail>(`/api/facturas/${params.id}`)
      .then((result) => {
        if (active) setInvoice(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar la factura.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  async function cancelInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invoice) return;
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/api/facturas/${invoice.id}/anular`, {
        method: "POST",
        body: JSON.stringify({ motivoAnulacion: reason }),
      });
      setInvoice(
        await apiFetch<InvoiceDetail>(`/api/facturas/${invoice.id}`),
      );
      setCancelOpen(false);
      setReason("");
      setNotice("La factura fue anulada y el stock quedó restituido.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo anular la factura.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/ventas"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Ventas
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              {invoice
                ? `Factura ${formatearNumeroFactura(invoice.puntoVenta, invoice.numero)}`
                : "Detalle de factura"}
            </h1>
            {invoice && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  invoice.estado === "emitida"
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-red-500/10 text-red-300"
                }`}
              >
                {invoice.estado === "emitida" ? "Emitida" : "Anulada"}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {invoice?.estado === "emitida" && rol === "admin" && (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20"
            >
              <Ban className="h-4 w-4" />
              Anular
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!invoice}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </p>
      )}

      {loading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
          Cargando factura...
        </div>
      )}

      {invoice && (
        <article className="print-receipt mx-auto max-w-4xl rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-sm max-sm:p-5">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <p className="text-lg font-bold text-white">Casa de Repuestos</p>
              <p className="mt-1 text-sm text-slate-500">Motos y Autos · San Miguel de Tucumán</p>
              <p className="text-sm text-slate-500">Comprobante interno sin validez fiscal</p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
                Factura
              </span>
              <p className="mt-2 font-mono text-lg font-bold text-white">
                N.º {formatearNumeroFactura(invoice.puntoVenta, invoice.numero)}
              </p>
              <p className="text-sm text-slate-500">{formatearFechaHora(invoice.fecha)}</p>
            </div>
          </header>

          <div className="grid gap-5 border-b border-slate-800 py-5 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Cliente</p>
              <p className="mt-1 font-semibold text-white">
                {invoice.clienteNombre ?? "Consumidor final"}
              </p>
              {invoice.clienteDoc && <p className="text-sm text-slate-500">{invoice.clienteDoc}</p>}
            </div>
            <div>
              <p className="text-xs text-slate-500">Vendedor</p>
              <p className="mt-1 font-semibold text-white">{invoice.vendedorNombre}</p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-950 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3 text-right">Cant.</th>
                  <th className="px-4 py-3 text-right">Precio unit.</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.codigo}</td>
                    <td className="px-4 py-3 text-slate-200">{item.descripcion}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{item.cantidad}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{formatearMoneda(item.precioUnitario)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-200">{formatearMoneda(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">Forma de pago</p>
              <p className="mt-1 font-medium text-slate-200">{paymentLabel[invoice.formaPago]}</p>
              {invoice.formaPago === "tarjeta" && (
                <p className="text-sm text-slate-500">
                  {invoice.tarjetaMarca} · {invoice.tarjetaTipo} ·•••• {invoice.tarjetaUltimos4}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-3xl font-bold tracking-tight text-white">
                {formatearMoneda(invoice.total)}
              </p>
            </div>
          </div>

          {invoice.estado === "anulada" && (
            <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <p className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4" /> Factura anulada
              </p>
              <p className="mt-1">Motivo: {invoice.motivoAnulacion || "No informado"}</p>
              {invoice.fechaAnulacion && <p className="mt-1">{formatearFechaHora(invoice.fechaAnulacion)}</p>}
            </div>
          )}

          <footer className="mt-7 border-t border-slate-800 pt-4 text-center text-xs text-slate-500">
            Precios finales con impuestos incluidos · Comprobante interno sin validez fiscal
          </footer>
        </article>
      )}

      <Modal
        open={cancelOpen}
        title="Anular factura"
        onClose={() => setCancelOpen(false)}
        className="max-w-lg"
      >
        <form onSubmit={cancelInvoice} className="space-y-4">
          <p className="text-sm text-slate-500">
            Esta acción restituirá las existencias de los productos vendidos.
          </p>
          <label className="block text-sm font-medium text-slate-300">
            Motivo de anulación
            <textarea
              required
              minLength={5}
              maxLength={200}
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCancelOpen(false)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={busy || reason.trim().length < 5}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {busy ? "Anulando..." : "Confirmar anulación"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
