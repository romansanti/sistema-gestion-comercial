"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CircleAlert,
  FileText,
  Package,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { SalesCharts } from "@/components/tablero/sales-charts";
import {
  formatearFechaHora,
  formatearMoneda,
  formatearNumeroFactura,
} from "@/lib/format";

type DashboardData = {
  fecha: string;
  ventasHoy: { cantidad: number; total: number };
  ventasMes: { cantidad: number; total: number };
  deudaTotal: number;
  clientesConSaldo: number;
  stockCriticoCantidad: number;
  ventasPorDia: Array<{ fecha: string; total: number }>;
  ventasPorFormaPago: Array<{
    formaPago: "contado" | "tarjeta" | "cuenta_corriente";
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
  }>;
  ultimasFacturas: Array<{
    id: number;
    puntoVenta: number;
    numero: number;
    fecha: string;
    clienteNombre: string | null;
    total: number;
  }>;
  deudores: Array<{
    id: number;
    nombre: string;
    documento: string;
    saldoActual: number;
  }>;
};

export default function TableroView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<DashboardData>("/api/tablero")
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo cargar el resumen del negocio.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Resumen del negocio</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
            Inicio
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Actividad de ventas, stock y cuentas corrientes.
          </p>
        </div>
        <Link
          href="/ventas/nueva"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          <ShoppingCart className="h-4 w-4" />
          Nueva venta
        </Link>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <CircleAlert className="h-4 w-4" />
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Ventas de hoy",
            value: formatearMoneda(data?.ventasHoy.total ?? 0),
            note: `${data?.ventasHoy.cantidad ?? 0} comprobantes`,
            icon: ShoppingCart,
          },
          {
            label: "Facturación del mes",
            value: formatearMoneda(data?.ventasMes.total ?? 0),
            note: `${data?.ventasMes.cantidad ?? 0} comprobantes emitidos`,
            icon: FileText,
          },
          {
            label: "Cuentas por cobrar",
            value: formatearMoneda(data?.deudaTotal ?? 0),
            note: `${data?.clientesConSaldo ?? 0} clientes con saldo`,
            icon: Wallet,
          },
          {
            label: "Stock crítico",
            value: String(data?.stockCriticoCantidad ?? 0),
            note: "repuestos en o bajo el mínimo",
            icon: Package,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">{item.label}</p>
                <span className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-4 text-2xl font-bold tracking-tight text-white">
                {loading ? "—" : item.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{item.note}</p>
            </article>
          );
        })}
      </section>

      <SalesCharts
        salesByDay={data?.ventasPorDia ?? []}
        salesByPayment={data?.ventasPorFormaPago ?? []}
        loading={loading}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 p-5">
            <div>
              <h2 className="font-semibold text-white">Stock por reponer</h2>
              <p className="mt-1 text-sm text-slate-500">Productos bajo el mínimo configurado</p>
            </div>
            <Link
              href="/productos?bajoMinimo=true"
              className="text-sm font-medium text-amber-500 hover:text-amber-600"
            >
              Ver productos
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {(data?.stockCritico ?? []).map((product) => (
              <Link
                key={product.id}
                href="/productos"
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-800"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-200">
                    {product.descripcion}
                  </span>
                  <span className="font-mono text-xs text-slate-500">{product.codigo}</span>
                </span>
                <span className="shrink-0 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300">
                  {product.existencia} / {product.stockMinimo}
                </span>
              </Link>
            ))}
            {!loading && !data?.stockCritico.length && (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                No hay productos bajo el mínimo.
              </p>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
          <div className="border-b border-slate-800 p-5">
            <h2 className="font-semibold text-white">Top 5 repuestos vendidos</h2>
            <p className="mt-1 text-sm text-slate-400">Unidades en los últimos 30 días</p>
          </div>
          <div className="divide-y divide-slate-800">
            {(data?.productosMasVendidos ?? []).map((product, index) => (
              <Link
                key={product.productoId}
                href={`/productos/${product.productoId}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-800"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-semibold text-amber-400">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-200">
                      {product.descripcion}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      {product.codigo}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-white">
                  {product.cantidad} un.
                </span>
              </Link>
            ))}
            {!loading && !data?.productosMasVendidos.length && (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                Todavía no hay ventas en el período.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 p-5">
            <div>
              <h2 className="font-semibold text-white">Últimas ventas</h2>
              <p className="mt-1 text-sm text-slate-500">Comprobantes emitidos recientemente</p>
            </div>
            <Link
              href="/ventas"
              className="inline-flex items-center gap-1 text-sm font-medium text-amber-500 hover:text-amber-600"
            >
              Ver todas <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {(data?.ultimasFacturas ?? []).map((invoice) => (
              <Link
                key={invoice.id}
                href={`/ventas/${invoice.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-slate-800"
              >
                <span>
                  <span className="block font-mono text-sm font-medium text-slate-200">
                    {formatearNumeroFactura(invoice.puntoVenta, invoice.numero)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {invoice.clienteNombre ?? "Consumidor final"} · {formatearFechaHora(invoice.fecha)}
                  </span>
                </span>
                <span className="text-sm font-semibold text-slate-200">
                  {formatearMoneda(invoice.total)}
                </span>
              </Link>
            ))}
            {!loading && !data?.ultimasFacturas.length && (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                Todavía no hay ventas emitidas.
              </p>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 p-5">
            <div>
              <h2 className="font-semibold text-white">Saldos pendientes</h2>
              <p className="mt-1 text-sm text-slate-500">Clientes con cuenta corriente</p>
            </div>
            <Link
              href="/clientes/saldos"
              className="text-sm font-medium text-amber-500 hover:text-amber-600"
            >
              Ver saldos
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {(data?.deudores ?? []).map((customer) => (
              <Link
                key={customer.id}
                href={`/clientes/${customer.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-800"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-200">{customer.nombre}</span>
                  <span className="text-xs text-slate-500">{customer.documento}</span>
                </span>
                <span className="shrink-0 font-semibold text-red-300">{formatearMoneda(customer.saldoActual)}</span>
              </Link>
            ))}
            {!loading && !data?.deudores.length && (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                No hay saldos pendientes.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
