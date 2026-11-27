"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatearFechaHora, formatearMoneda } from "@/lib/format";

type Receipt = {
  id: number;
  numeroRecibo: string;
  fecha: string;
  importe: number;
  medio: "efectivo" | "transferencia" | "tarjeta_debito";
  observacion: string | null;
  clienteId: number;
  clienteNombre: string;
  clienteTipoDoc: "DNI" | "CUIT";
  clienteNroDoc: string;
  usuarioNombre: string;
};
type Account = {
  movimientos: Array<{ pagoId: number | null; saldoAcumulado: number }>;
};

const paymentLabels: Record<Receipt["medio"], string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta_debito: "Tarjeta de débito",
};

export default function ReciboDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [balanceAfterPayment, setBalanceAfterPayment] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadReceipt() {
      try {
        const detail = await apiFetch<Receipt>(`/api/pagos/${id}`);
        const account = await apiFetch<Account>(
          `/api/clientes/${detail.clienteId}/cuenta`,
        );
        if (!active) return;
        setReceipt(detail);
        setBalanceAfterPayment(
          account.movimientos.find((movement) => movement.pagoId === detail.id)
            ?.saldoAcumulado ?? null,
        );
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el recibo.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadReceipt();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/clientes" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Clientes
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-white">
            {receipt ? `Recibo ${receipt.numeroRecibo}` : "Recibo de pago"}
          </h1>
        </div>
        <button type="button" disabled={!receipt} onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">
          <Printer className="h-4 w-4" /> Imprimir
        </button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      {loading && <p className="py-10 text-center text-sm text-slate-500">Cargando recibo...</p>}

      {receipt && (
        <article className="print-receipt mx-auto max-w-4xl rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-sm max-sm:p-5">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <p className="text-lg font-bold text-white">Casa de Repuestos</p>
              <p className="mt-1 text-sm text-slate-500">Motos y Autos · San Miguel de Tucumán</p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">Recibo</span>
              <p className="mt-2 font-mono text-lg font-bold text-white">{receipt.numeroRecibo}</p>
              <p className="text-sm text-slate-500">{formatearFechaHora(receipt.fecha)}</p>
            </div>
          </header>

          <div className="grid gap-5 border-b border-slate-800 py-5 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Recibimos de</p>
              <p className="mt-1 font-semibold text-slate-200">{receipt.clienteNombre}</p>
              <p className="text-sm text-slate-500">{receipt.clienteTipoDoc} {receipt.clienteNroDoc}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Atendió</p>
              <p className="mt-1 font-semibold text-slate-200">{receipt.usuarioNombre}</p>
            </div>
          </div>

          <dl className="mt-5 space-y-4 rounded-lg bg-slate-950 p-5">
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-slate-500">Concepto</dt>
              <dd className="text-right text-slate-200">Pago a cuenta corriente</dd>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-slate-500">Medio</dt>
              <dd className="text-right text-slate-200">{paymentLabels[receipt.medio]}</dd>
            </div>
            {receipt.observacion && (
              <div className="flex justify-between gap-4 text-sm">
                <dt className="text-slate-500">Observación</dt>
                <dd className="text-right text-slate-200">{receipt.observacion}</dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 border-t border-slate-700 pt-4">
              <dt className="font-semibold text-slate-200">Importe recibido</dt>
              <dd className="text-2xl font-bold text-slate-100">{formatearMoneda(receipt.importe)}</dd>
            </div>
          </dl>

          {balanceAfterPayment !== null && (
            <p className="mt-5 text-right text-sm text-slate-500">
              Saldo de la cuenta después de este pago:{" "}
              <strong className="text-slate-200">{formatearMoneda(balanceAfterPayment)}</strong>
            </p>
          )}

          <footer className="mt-7 border-t border-slate-800 pt-4 text-center text-xs text-slate-500">
            Comprobante interno sin validez fiscal
          </footer>
        </article>
      )}
    </div>
  );
}
