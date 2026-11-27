"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  HandCoins,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { apiFetch, pesosAcentavos } from "@/lib/api-client";
import {
  centavosAValorInput,
  formatearFechaHora,
  formatearMoneda,
  formatearNumeroFactura,
} from "@/lib/format";

type Customer = {
  id: number;
  tipoDoc: "DNI" | "CUIT";
  nroDoc: string;
  nombre: string;
  domicilio: string | null;
  telefono: string | null;
  email: string | null;
  cuentaCorriente: boolean;
  limiteCredito: number | null;
  activo: boolean;
  saldoActual: number;
  ultimasFacturas: Array<{
    id: number;
    puntoVenta: number;
    numero: number;
    fecha: string;
    total: number;
    formaPago: string;
    estado: string;
  }>;
};

type Movement = {
  id: number;
  tipo: "debito" | "credito";
  importe: number;
  fecha: string;
  descripcion: string;
  facturaId: number | null;
  pagoId: number | null;
  saldoAcumulado: number;
};

const methodLabels = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta_debito: "Tarjeta de débito",
} as const;

export default function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [saldoActual, setSaldoActual] = useState(0);
  const [tab, setTab] = useState<"datos" | "cuenta">("datos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<keyof typeof methodLabels>("efectivo");
  const [observation, setObservation] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    Promise.all([
      apiFetch<Customer>(`/api/clientes/${id}`),
      apiFetch<{ saldoActual: number; movimientos: Movement[] }>(
        `/api/clientes/${id}/cuenta?${params.toString()}`,
      ),
    ])
      .then(([customerData, account]) => {
        if (!active) return;
        setCustomer(customerData);
        setMovements(account.movimientos);
        setSaldoActual(account.saldoActual);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el cliente.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [desde, hasta, id]);

  async function registerPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer) return;
    setError(null);
    const amountCentavos = pesosAcentavos(amount);
    if (amountCentavos === null || amountCentavos <= 0) {
      setError("Ingresá un importe válido mayor a cero.");
      return;
    }
    if (amountCentavos > saldoActual) {
      setError("El importe supera la deuda actual del cliente.");
      return;
    }
    setBusy(true);
    try {
      const result = await apiFetch<{ pago: { id: number } }>(
        `/api/clientes/${customer.id}/cuenta`,
        {
          method: "POST",
          body: JSON.stringify({
            importe: amountCentavos,
            medio: method,
            observacion: observation || undefined,
          }),
        },
      );
      router.push(`/clientes/recibos/${result.pago.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo registrar el pago.",
      );
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-slate-500">Cargando ficha...</p>;
  }
  if (!customer) {
    return (
      <div className="space-y-4">
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error ?? "No se encontró el cliente."}
        </p>
        <Link href="/clientes" className="text-sm font-medium text-amber-500">Volver a clientes</Link>
      </div>
    );
  }

  const limite = customer.limiteCredito ?? 0;
  const disponible = Math.max(0, limite - saldoActual);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/clientes" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Clientes
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-white">{customer.nombre}</h1>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
              {customer.cuentaCorriente ? "Cuenta corriente" : "Contado"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{customer.tipoDoc} {customer.nroDoc}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {customer.cuentaCorriente && (
            <button
              type="button"
              onClick={() => setPaymentOpen(true)}
              disabled={saldoActual <= 0 || !customer.activo}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              <HandCoins className="h-4 w-4" /> Registrar pago
            </button>
          )}
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Saldo actual", value: formatearMoneda(saldoActual), danger: saldoActual > 0 },
          { label: "Límite de crédito", value: customer.cuentaCorriente && limite ? formatearMoneda(limite) : "Sin límite" },
          { label: "Disponible", value: customer.cuentaCorriente ? formatearMoneda(disponible) : "—" },
        ].map((item) => (
          <article key={item.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className={`mt-2 text-2xl font-bold ${item.danger ? "text-red-300" : "text-white"}`}>{item.value}</p>
          </article>
        ))}
      </section>

      <div className="flex gap-6 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setTab("datos")}
          className={`border-b-2 px-1 pb-3 text-sm font-medium ${tab === "datos" ? "border-amber-500 text-white" : "border-transparent text-slate-400"}`}
        >
          Datos y facturas
        </button>
        <button
          type="button"
          onClick={() => setTab("cuenta")}
          className={`border-b-2 px-1 pb-3 text-sm font-medium ${tab === "cuenta" ? "border-amber-500 text-white" : "border-transparent text-slate-400"}`}
        >
          Cuenta corriente
        </button>
      </div>

      {tab === "datos" ? (
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-semibold text-white">Datos del cliente</h2>
            <dl className="mt-4 space-y-4 text-sm">
              {[
                ["Documento", `${customer.tipoDoc} ${customer.nroDoc}`],
                ["Domicilio", customer.domicilio || "No informado"],
                ["Teléfono", customer.telefono || "No informado"],
                ["Email", customer.email || "No informado"],
                ["Cuenta corriente", customer.cuentaCorriente ? "Habilitada" : "No habilitada"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-right font-medium text-slate-200">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <h2 className="font-semibold text-white">Últimas facturas</h2>
              <Link href="/ventas" className="text-sm font-medium text-amber-500">Ver todas</Link>
            </div>
            <div className="divide-y divide-slate-800">
              {customer.ultimasFacturas.map((invoice) => (
                <Link key={invoice.id} href={`/ventas/${invoice.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-slate-800">
                  <span>
                    <span className="block font-mono text-sm text-slate-200">{formatearNumeroFactura(invoice.puntoVenta, invoice.numero)}</span>
                    <span className="text-xs text-slate-500">{formatearFechaHora(invoice.fecha)}</span>
                  </span>
                  <span className="font-semibold text-slate-200">{formatearMoneda(invoice.total)}</span>
                </Link>
              ))}
              {customer.ultimasFacturas.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-slate-500">Todavía no hay facturas.</p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-800 p-4">
            <label className="text-sm text-slate-500">
              Desde
              <input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
            </label>
            <label className="text-sm text-slate-500">
              Hasta
              <input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
            </label>
            <p className="ml-auto text-sm text-slate-400">Saldo actual <strong className="ml-2 text-slate-200">{formatearMoneda(saldoActual)}</strong></p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3 text-right">Débito</th>
                  <th className="px-4 py-3 text-right">Crédito</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {movements.map((movement) => {
                  const href = movement.facturaId
                    ? `/ventas/${movement.facturaId}`
                    : movement.pagoId
                      ? `/clientes/recibos/${movement.pagoId}`
                      : null;
                  return (
                    <tr key={movement.id}>
                      <td className="px-4 py-3 text-slate-500">{formatearFechaHora(movement.fecha)}</td>
                      <td className="px-4 py-3">
                        {href ? <Link href={href} className="font-medium text-amber-400 hover:underline">{movement.descripcion}</Link> : <span className="text-slate-200">{movement.descripcion}</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-200">{movement.tipo === "debito" ? formatearMoneda(movement.importe) : "—"}</td>
                      <td className="px-4 py-3 text-right text-emerald-300">{movement.tipo === "credito" ? formatearMoneda(movement.importe) : "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-200">{formatearMoneda(movement.saldoAcumulado)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-950">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-semibold text-slate-400">Saldo al cierre</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-200">{formatearMoneda(saldoActual)}</td>
                </tr>
              </tfoot>
            </table>
            {movements.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No hay movimientos en el período seleccionado.</p>
            )}
          </div>
        </section>
      )}

      <Modal open={paymentOpen} title="Registrar pago" onClose={() => setPaymentOpen(false)} className="max-w-xl">
        <form onSubmit={registerPayment} className="space-y-4">
          <p className="text-sm text-slate-500">{customer.nombre} · saldo adeudado {formatearMoneda(saldoActual)}</p>
          <label className="block text-sm font-medium text-slate-300">
            Importe
            <input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 focus:border-amber-500 focus:outline-none" />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAmount(centavosAValorInput(saldoActual))} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300">Saldo total</button>
            <button type="button" onClick={() => setAmount(centavosAValorInput(Math.trunc(saldoActual / 2)))} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300">La mitad</button>
          </div>
          <label className="block text-sm font-medium text-slate-300">
            Medio de pago
            <select value={method} onChange={(event) => setMethod(event.target.value as keyof typeof methodLabels)} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100">
              {Object.entries(methodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Observación (opcional)
            <input value={observation} onChange={(event) => setObservation(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100" />
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <button type="button" onClick={() => setPaymentOpen(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancelar</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
              {busy ? "Registrando..." : "Registrar pago"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
