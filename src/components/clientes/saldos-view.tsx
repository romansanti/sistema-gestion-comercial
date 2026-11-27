"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatearMoneda } from "@/lib/format";

type Customer = {
  id: number;
  tipoDoc: "DNI" | "CUIT";
  nroDoc: string;
  nombre: string;
  limiteCredito: number | null;
  saldoActual: number;
};
type CustomerList = {
  items: Customer[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  totalAdeudado: number;
};

export default function SaldosClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<CustomerList["pagination"] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<CustomerList>(
      `/api/clientes?cuentaCorriente=true&conDeuda=true&ordenar=saldo&page=${page}&pageSize=50`,
    )
      .then((result) => {
        if (!active) return;
        setCustomers(result.items);
        setPagination(result.pagination);
        setTotal(result.totalAdeudado);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar los saldos.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/clientes" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Clientes
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-white">Saldos de cuentas corrientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pagination?.total ?? 0} clientes adeudan {formatearMoneda(total)}
          </p>
        </div>
        <button type="button" onClick={() => window.print()} className="no-print inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
          <Printer className="h-4 w-4" /> Imprimir
        </button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      <section className="print-receipt overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-950 text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3 text-right">Límite</th>
                <th className="px-4 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {customers.map((customer, index) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3 text-slate-500">{(page - 1) * 50 + index + 1}</td>
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/clientes/${customer.id}`} className="text-slate-200 hover:text-amber-400">{customer.nombre}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{customer.tipoDoc} {customer.nroDoc}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{customer.limiteCredito === null ? "Sin límite" : formatearMoneda(customer.limiteCredito)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-300">{formatearMoneda(customer.saldoActual)}</td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Cargando saldos...</td></tr>
              )}
              {!loading && customers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No hay clientes con deuda.</td></tr>
              )}
            </tbody>
            <tfoot className="bg-slate-950">
              <tr>
                <td colSpan={4} className="px-4 py-3 font-semibold text-slate-300">Total adeudado</td>
                <td className="px-4 py-3 text-right font-bold text-slate-100">{formatearMoneda(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="no-print flex items-center justify-between border-t border-slate-800 px-4 py-3 text-sm text-slate-500">
          <span>
            {pagination
              ? `${pagination.total === 0 ? 0 : (page - 1) * 50 + 1}–${Math.min(page * 50, pagination.total)} de ${pagination.total} clientes`
              : " "}
          </span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((current) => current - 1); }} className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 disabled:opacity-40">Anterior</button>
            <button type="button" disabled={!pagination || page >= pagination.totalPages || loading} onClick={() => { setLoading(true); setPage((current) => current + 1); }} className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </section>
    </div>
  );
}
