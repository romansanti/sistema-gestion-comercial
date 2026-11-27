"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Package,
  Users,
  Wallet,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatearMoneda } from "@/lib/format";

type Report = {
  periodo: { desde: string; hasta: string };
  resumen: {
    cantidadVentas: number;
    totalVentas: number;
    ticketPromedio: number;
    deudaTotal: number;
  };
  ventasPorMedio: Array<{
    medio: "contado" | "tarjeta" | "cuenta_corriente";
    cantidad: number;
    total: number;
  }>;
  productosMasVendidos: Array<{
    productoId: number;
    codigo: string;
    descripcion: string;
    cantidad: number;
    total: number;
  }>;
  stockCritico: Array<{
    id: number;
    codigo: string;
    descripcion: string;
    existencia: number;
    stockMinimo: number;
    categoria: string;
  }>;
  deudores: Array<{
    id: number;
    nombre: string;
    documento: string;
    limiteCredito: number | null;
    saldoActual: number;
  }>;
};

const MEDIO_LABEL: Record<Report["ventasPorMedio"][number]["medio"], string> = {
  contado: "Efectivo",
  tarjeta: "Tarjeta",
  cuenta_corriente: "Cuenta corriente",
};

export default function ReportesPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    setReport(await apiFetch<Report>(`/api/reportes/ventas?${params}`));
  }, [desde, hasta]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refresh()
        .catch((cause: unknown) =>
          setError(
            cause instanceof Error ? cause.message : "No se pudo cargar el reporte.",
          ),
        )
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  async function applyPeriod(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo cargar el reporte.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          Gestión comercial
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Reportes</h1>
        <p className="mt-1 text-sm text-slate-400">
          Ventas, productos más vendidos, stock crítico y cuentas por cobrar.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <form
        onSubmit={applyPeriod}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5"
      >
        <label className="space-y-1 text-sm text-slate-300">
          <span>Desde</span>
          <input
            type="date"
            value={desde}
            onChange={(event) => setDesde(event.target.value)}
            className="block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <label className="space-y-1 text-sm text-slate-300">
          <span>Hasta</span>
          <input
            type="date"
            value={hasta}
            onChange={(event) => setHasta(event.target.value)}
            className="block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? "Cargando..." : "Aplicar período"}
        </button>
        {report && (
          <p className="ml-auto text-xs text-slate-500">
            Período: {report.periodo.desde} a {report.periodo.hasta}
          </p>
        )}
      </form>

      {report && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Ventas emitidas",
                value: String(report.resumen.cantidadVentas),
                icon: BarChart3,
                color: "text-sky-300",
              },
              {
                label: "Facturación",
                value: formatearMoneda(report.resumen.totalVentas),
                icon: Wallet,
                color: "text-emerald-300",
              },
              {
                label: "Ticket promedio",
                value: formatearMoneda(report.resumen.ticketPromedio),
                icon: Package,
                color: "text-amber-300",
              },
              {
                label: "Saldo deudor",
                value: formatearMoneda(report.resumen.deudaTotal),
                icon: Users,
                color: "text-rose-300",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.label}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">{item.label}</p>
                    <Icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <p className={`mt-2 text-2xl font-bold ${item.color}`}>
                    {item.value}
                  </p>
                </article>
              );
            })}
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold text-white">Ventas por medio de pago</h2>
              <div className="mt-4 space-y-4">
                {report.ventasPorMedio.map((item) => (
                  <div key={item.medio}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-300">{MEDIO_LABEL[item.medio]}</span>
                      <span className="text-slate-400">
                        {item.cantidad} · {formatearMoneda(item.total)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-amber-500"
                        style={{
                          width: `${report.resumen.totalVentas ? (item.total / report.resumen.totalVentas) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
                {report.ventasPorMedio.length === 0 && (
                  <p className="text-sm text-slate-500">Sin ventas en este período.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold text-white">Más vendidos</h2>
              <div className="mt-4 divide-y divide-slate-800">
                {report.productosMasVendidos.map((product) => (
                  <div
                    key={product.productoId}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-amber-400">
                        {product.codigo}
                      </p>
                      <p className="truncate text-sm text-slate-200">
                        {product.descripcion}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-white">{product.cantidad} u.</p>
                      <p className="text-xs text-slate-400">
                        {formatearMoneda(product.total)}
                      </p>
                    </div>
                  </div>
                ))}
                {report.productosMasVendidos.length === 0 && (
                  <p className="py-3 text-sm text-slate-500">
                    Sin ventas en este período.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold text-white">Stock crítico</h2>
              <div className="mt-4 divide-y divide-slate-800">
                {report.stockCritico.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-amber-400">
                        {product.codigo}
                      </p>
                      <p className="truncate text-sm text-slate-200">
                        {product.descripcion}
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-sm text-rose-300">
                      {product.existencia} / {product.stockMinimo} u.
                    </p>
                  </div>
                ))}
                {report.stockCritico.length === 0 && (
                  <p className="py-3 text-sm text-slate-500">
                    No hay productos bajo el mínimo.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold text-white">Mayores saldos deudores</h2>
              <div className="mt-4 divide-y divide-slate-800">
                {report.deudores.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {customer.nombre}
                      </p>
                      <p className="text-xs text-slate-500">{customer.documento}</p>
                    </div>
                    <p className="shrink-0 font-semibold text-amber-300">
                      {formatearMoneda(customer.saldoActual)}
                    </p>
                  </div>
                ))}
                {report.deudores.length === 0 && (
                  <p className="py-3 text-sm text-slate-500">
                    No hay saldos deudores activos.
                  </p>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
