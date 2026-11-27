"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { apiFetch, pesosAcentavos } from "@/lib/api-client";
import { formatearFechaHora, formatearMoneda } from "@/lib/format";

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
};
type AccountMovement = {
  id: number;
  tipo: "debito" | "credito";
  importe: number;
  fecha: string;
  descripcion: string;
  facturaId: number | null;
  pagoId: number | null;
};
type CustomerDetail = Customer & { movimientos: AccountMovement[] };

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-300";

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [form, setForm] = useState({
    tipoDoc: "CUIT" as "DNI" | "CUIT",
    nroDoc: "",
    nombre: "",
    domicilio: "",
    telefono: "",
    email: "",
    cuentaCorriente: false,
    limiteCredito: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    importe: "",
    medio: "efectivo" as "efectivo" | "transferencia" | "tarjeta_debito",
    observacion: "",
  });

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    const data = await apiFetch<Customer[]>(
      `/api/clientes?${params.toString()}`,
    );
    setCustomers(data);
  }, [query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refresh()
        .catch((cause: unknown) =>
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo cargar el listado de clientes.",
          ),
        )
        .finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  const creditCustomers = customers.filter((customer) => customer.cuentaCorriente);
  const totalDebt = creditCustomers.reduce(
    (sum, customer) => sum + Math.max(customer.saldoActual, 0),
    0,
  );
  const availableCredit = creditCustomers.reduce(
    (sum, customer) =>
      sum + Math.max(0, (customer.limiteCredito ?? 0) - customer.saldoActual),
    0,
  );

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const creditLimit = form.cuentaCorriente
      ? pesosAcentavos(form.limiteCredito)
      : null;
    if (form.cuentaCorriente && (creditLimit === null || creditLimit < 0)) {
      setError("Ingresá un límite de crédito válido.");
      return;
    }

    setBusy(true);
    try {
      await apiFetch<Customer>("/api/clientes", {
        method: "POST",
        body: JSON.stringify({
          tipoDoc: form.tipoDoc,
          nroDoc: form.nroDoc,
          nombre: form.nombre,
          domicilio: form.domicilio || null,
          telefono: form.telefono || null,
          email: form.email || null,
          cuentaCorriente: form.cuentaCorriente,
          limiteCredito: creditLimit,
        }),
      });
      setCreateOpen(false);
      setForm({
        tipoDoc: "CUIT",
        nroDoc: "",
        nombre: "",
        domicilio: "",
        telefono: "",
        email: "",
        cuentaCorriente: false,
        limiteCredito: "",
      });
      setNotice("Cliente creado correctamente.");
      try {
        await refresh();
      } catch {
        setError("Cliente creado, pero no se pudo actualizar el listado.");
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo crear el cliente.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function openStatement(customer: Customer) {
    setError(null);
    try {
      setDetail(
        await apiFetch<CustomerDetail>(`/api/clientes/${customer.id}`),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo cargar el estado de cuenta.",
      );
    }
  }

  async function registerPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentCustomer) return;
    setError(null);
    const amount = pesosAcentavos(paymentForm.importe);
    if (amount === null || amount <= 0) {
      setError("Ingresá un importe válido mayor a cero.");
      return;
    }
    if (amount > paymentCustomer.saldoActual) {
      setError("El importe supera la deuda actual del cliente.");
      return;
    }

    setBusy(true);
    try {
      const result = await apiFetch<{
        pago: { numeroRecibo: string; importe: number };
        nuevoSaldo: number;
      }>("/api/pagos", {
        method: "POST",
        body: JSON.stringify({
          clienteId: paymentCustomer.id,
          importe: amount,
          medio: paymentForm.medio,
          observacion: paymentForm.observacion || undefined,
        }),
      });
      setPaymentCustomer(null);
      setPaymentForm({
        importe: "",
        medio: "efectivo",
        observacion: "",
      });
      setNotice(
        `Pago registrado. Recibo ${result.pago.numeroRecibo}; saldo actualizado: ${formatearMoneda(result.nuevoSaldo)}.`,
      );
      try {
        await refresh();
      } catch {
        setError("Pago registrado, pero no se pudo actualizar el listado.");
      }
      if (detail?.id === paymentCustomer.id) {
        await openStatement(paymentCustomer);
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo registrar el pago.",
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
            Gestión comercial
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">
            Clientes y cuenta corriente
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Revisá deuda, crédito disponible, recibos y movimientos de cuenta.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setCreateOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          Nuevo cliente
        </button>
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

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Clientes registrados</p>
          <p className="mt-2 text-2xl font-bold text-white">{customers.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Deuda en cuenta corriente</p>
          <p className="mt-2 text-2xl font-bold text-amber-300">
            {formatearMoneda(totalDebt)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Crédito disponible total</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">
            {formatearMoneda(availableCredit)}
          </p>
        </article>
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <label className="relative block max-w-xl">
          <span className="sr-only">Buscar cliente</span>
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o documento..."
            className={`${inputClass} pl-10`}
          />
        </label>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Documento / Contacto</th>
                <th className="px-4 py-3">Modalidad</th>
                <th className="px-4 py-3 text-right">Deuda</th>
                <th className="px-4 py-3 text-right">Límite</th>
                <th className="px-4 py-3 text-right">Disponible</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {customers.map((customer) => {
                const balance = customer.saldoActual;
                const limit = customer.limiteCredito ?? 0;
                return (
                  <tr key={customer.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{customer.nombre}</p>
                      {!customer.activo && (
                        <span className="text-xs text-slate-500">Inactivo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <p>{customer.tipoDoc}: {customer.nroDoc}</p>
                      <p className="text-xs text-slate-500">
                        {customer.telefono || customer.email || "Sin contacto"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                        {customer.cuentaCorriente ? "Cuenta corriente" : "Contado"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-amber-300">
                      {formatearMoneda(balance)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {customer.cuentaCorriente ? formatearMoneda(limit) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-300">
                      {customer.cuentaCorriente
                        ? formatearMoneda(Math.max(0, limit - balance))
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {customer.cuentaCorriente && (
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              setPaymentCustomer(customer);
                            }}
                            disabled={balance <= 0 || !customer.activo}
                            className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Registrar pago
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openStatement(customer)}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                        >
                          Estado de cuenta
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Cargando clientes...
                  </td>
                </tr>
              )}
              {!loading && customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={createOpen}
        title="Alta de cliente"
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={createCustomer} className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Tipo de documento</span>
            <select
              value={form.tipoDoc}
              onChange={(event) =>
                setForm({ ...form, tipoDoc: event.target.value as "DNI" | "CUIT" })
              }
              className={inputClass}
            >
              <option value="CUIT">CUIT</option>
              <option value="DNI">DNI</option>
            </select>
          </label>
          <label>
            <span className={labelClass}>Número de documento</span>
            <input
              required
              minLength={7}
              maxLength={15}
              value={form.nroDoc}
              onChange={(event) => setForm({ ...form, nroDoc: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Nombre / Razón social</span>
            <input
              required
              minLength={3}
              maxLength={120}
              value={form.nombre}
              onChange={(event) => setForm({ ...form, nombre: event.target.value })}
              className={inputClass}
            />
          </label>
          <label>
            <span className={labelClass}>Teléfono</span>
            <input
              maxLength={30}
              value={form.telefono}
              onChange={(event) => setForm({ ...form, telefono: event.target.value })}
              className={inputClass}
            />
          </label>
          <label>
            <span className={labelClass}>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Domicilio</span>
            <input
              maxLength={150}
              value={form.domicilio}
              onChange={(event) => setForm({ ...form, domicilio: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.cuentaCorriente}
              onChange={(event) =>
                setForm({ ...form, cuentaCorriente: event.target.checked })
              }
              className="accent-amber-500"
            />
            Habilitar cuenta corriente
          </label>
          {form.cuentaCorriente && (
            <label className="sm:col-span-2">
              <span className={labelClass}>Límite de crédito ($)</span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.limiteCredito}
                onChange={(event) =>
                  setForm({ ...form, limiteCredito: event.target.value })
                }
                className={inputClass}
              />
            </label>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {busy ? "Guardando..." : "Crear cliente"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={paymentCustomer !== null}
        title={paymentCustomer ? `Registrar pago · ${paymentCustomer.nombre}` : "Registrar pago"}
        onClose={() => setPaymentCustomer(null)}
        className="max-w-xl"
      >
        {paymentCustomer && (
          <form onSubmit={registerPayment} className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950 p-4">
              <span className="flex items-center gap-2 text-sm text-slate-400">
                <Wallet className="h-4 w-4" />
                Deuda actual
              </span>
              <strong className="text-lg text-amber-300">
                {formatearMoneda(paymentCustomer.saldoActual)}
              </strong>
            </div>
            <label className="block">
              <span className={labelClass}>Importe del pago ($)</span>
              <input
                required
                type="number"
                min="0.01"
                max={paymentCustomer.saldoActual / 100}
                step="0.01"
                value={paymentForm.importe}
                onChange={(event) =>
                  setPaymentForm({ ...paymentForm, importe: event.target.value })
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Medio de pago</span>
              <select
                value={paymentForm.medio}
                onChange={(event) =>
                  setPaymentForm({
                    ...paymentForm,
                    medio: event.target.value as typeof paymentForm.medio,
                  })
                }
                className={inputClass}
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta_debito">Tarjeta de débito</option>
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Observación (opcional)</span>
              <textarea
                maxLength={200}
                rows={2}
                value={paymentForm.observacion}
                onChange={(event) =>
                  setPaymentForm({ ...paymentForm, observacion: event.target.value })
                }
                className={inputClass}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentCustomer(null)}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {busy ? "Registrando..." : "Emitir recibo"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={detail !== null}
        title={detail ? `Estado de cuenta · ${detail.nombre}` : "Estado de cuenta"}
        onClose={() => setDetail(null)}
        className="max-w-4xl"
      >
        {detail && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-500">Documento</p>
                <p className="mt-1 font-medium text-white">
                  {detail.tipoDoc} · {detail.nroDoc}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-500">Límite de crédito</p>
                <p className="mt-1 font-medium text-white">
                  {detail.cuentaCorriente
                    ? formatearMoneda(detail.limiteCredito ?? 0)
                    : "No habilitada"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-500">Saldo actual</p>
                <p className="mt-1 font-semibold text-amber-300">
                  {formatearMoneda(detail.saldoActual)}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-950 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Movimiento</th>
                    <th className="px-4 py-3">Referencia</th>
                    <th className="px-4 py-3 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {detail.movimientos.map((movement) => (
                    <tr key={movement.id}>
                      <td className="px-4 py-3 text-slate-400">
                        {formatearFechaHora(movement.fecha)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 ${
                            movement.tipo === "debito"
                              ? "text-amber-300"
                              : "text-emerald-300"
                          }`}
                        >
                          {movement.tipo === "debito" ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownLeft className="h-4 w-4" />
                          )}
                          {movement.tipo === "debito" ? "Débito" : "Crédito"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {movement.descripcion}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white">
                        {formatearMoneda(movement.importe)}
                      </td>
                    </tr>
                  ))}
                  {detail.movimientos.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                        Sin movimientos registrados.
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
