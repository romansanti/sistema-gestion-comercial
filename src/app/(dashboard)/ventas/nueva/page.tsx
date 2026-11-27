"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatearMoneda, formatearNumeroFactura } from "@/lib/format";

type Product = {
  id: number;
  codigo: string;
  descripcion: string;
  categoriaNombre: string;
  precio: number;
  existencia: number;
};

type Customer = {
  id: number;
  nombre: string;
  nroDoc: string;
  cuentaCorriente: boolean;
  limiteCredito: number | null;
  saldoActual: number;
};

type CartLine = { product: Product; quantity: number };
type PaymentMethod = "contado" | "tarjeta" | "cuenta_corriente";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500";

export default function NuevaVentaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("contado");
  const [customerId, setCustomerId] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [cardType, setCardType] = useState<"debito" | "credito">("debito");
  const [cardBrand, setCardBrand] = useState("");
  const [cardLastFour, setCardLastFour] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const refreshData = useCallback(async () => {
    const [productData, customerData] = await Promise.all([
      apiFetch<Product[]>("/api/productos?activos=true"),
      apiFetch<Customer[]>("/api/clientes?activos=true"),
    ]);
    setProducts(productData);
    setCustomers(customerData);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refreshData()
        .catch((cause: unknown) => {
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar los datos del mostrador.",
          );
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refreshData]);

  useEffect(() => {
    function focusProductSearch(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }

    window.addEventListener("keydown", focusProductSearch);
    return () => window.removeEventListener("keydown", focusProductSearch);
  }, []);

  const searchResults = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return products
      .filter(
        (product) =>
          !term ||
          product.codigo.toLocaleLowerCase().includes(term) ||
          product.descripcion.toLocaleLowerCase().includes(term),
      )
      ;
  }, [products, search]);

  const activeSearchIndex = Math.min(
    highlightedIndex,
    Math.max(searchResults.length - 1, 0),
  );

  const total = cart.reduce(
    (sum, line) => sum + line.product.precio * line.quantity,
    0,
  );
  const selectedCustomer = customers.find(
    (customer) => customer.id === Number(customerId),
  );
  const creditLimit = selectedCustomer?.limiteCredito ?? 0;
  const creditAvailable = Math.max(
    0,
    creditLimit - (selectedCustomer?.saldoActual ?? 0),
  );
  const cashAmount = cashReceived.trim()
    ? Number(cashReceived.replace(",", "."))
    : null;
  const cashAmountCents =
    cashAmount !== null && Number.isFinite(cashAmount)
      ? Math.round(cashAmount * 100)
      : null;
  const cashChange =
    cashAmountCents !== null ? cashAmountCents - total : null;

  function addProduct(product: Product) {
    setError(null);
    setNotice(null);
    const existing = cart.find((line) => line.product.id === product.id);
    if ((existing?.quantity ?? 0) >= product.existencia) {
      setError(`No hay más stock disponible de ${product.codigo}.`);
      return;
    }
    setCart((current) => {
      const line = current.find((item) => item.product.id === product.id);
      if (line) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...current, { product, quantity: 1 }];
    });
    setSearch("");
    setHighlightedIndex(0);
    searchRef.current?.focus();
  }

  function setQuantity(productId: number, quantity: number) {
    const line = cart.find((item) => item.product.id === productId);
    if (!line) return;
    if (quantity <= 0) {
      setCart((current) =>
        current.filter((item) => item.product.id !== productId),
      );
      return;
    }
    if (quantity > line.product.existencia) {
      setError(`El stock disponible es ${line.product.existencia}.`);
      return;
    }
    setError(null);
    setCart((current) =>
      current.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item,
      ),
    );
  }

  async function submitSale() {
    setError(null);
    setNotice(null);
    if (cart.length === 0) {
      setError("Agregá al menos un repuesto a la venta.");
      return;
    }
    if (paymentMethod === "cuenta_corriente" && !selectedCustomer) {
      setError("Seleccioná un cliente con cuenta corriente.");
      return;
    }
    if (
      paymentMethod === "cuenta_corriente" &&
      selectedCustomer &&
      total > creditAvailable
    ) {
      setError("El total supera el crédito disponible de este cliente.");
      return;
    }
    if (
      paymentMethod === "contado" &&
      cashReceived.trim() !== "" &&
      (cashAmountCents === null || cashAmountCents < total)
    ) {
      setError("El efectivo recibido debe cubrir el total de la venta.");
      return;
    }
    if (paymentMethod === "tarjeta" && !/^\d{4}$/.test(cardLastFour)) {
      setError("Ingresá los últimos 4 dígitos del cupón.");
      return;
    }
    if (paymentMethod === "tarjeta" && cardBrand.trim().length < 2) {
      setError("Ingresá la marca de la tarjeta.");
      return;
    }

    setSubmitting(true);
    try {
      const invoice = await apiFetch<{
        puntoVenta: number;
        numero: number;
      }>("/api/facturas", {
        method: "POST",
        body: JSON.stringify({
          formaPago: paymentMethod,
          clienteId: customerId ? Number(customerId) : null,
          items: cart.map(({ product, quantity }) => ({
            productoId: product.id,
            cantidad: quantity,
          })),
          ...(paymentMethod === "contado" && cashAmountCents !== null
            ? { montoRecibido: cashAmountCents }
            : {}),
          ...(paymentMethod === "tarjeta"
            ? {
                tarjetaTipo: cardType,
                tarjetaMarca: cardBrand.trim(),
                tarjetaUltimos4: cardLastFour,
              }
            : {}),
        }),
      });

      setCart([]);
      setCustomerId("");
      setCashReceived("");
      setCardBrand("");
      setCardLastFour("");
      setNotice(
        `Venta registrada: ${formatearNumeroFactura(invoice.puntoVenta, invoice.numero)}.`,
      );
      try {
        await refreshData();
      } catch {
        setNotice(
          `Venta registrada: ${formatearNumeroFactura(invoice.puntoVenta, invoice.numero)}. Recargá el catálogo para ver el stock actualizado.`,
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo registrar la venta.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Punto de venta
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">Nueva venta</h1>
          <p className="mt-1 text-sm text-slate-400">
            Buscá por código o descripción. Atajo de teclado: F2.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
          <ShoppingCart className="h-4 w-4 text-amber-400" />
          {cart.reduce((sum, line) => sum + line.quantity, 0)} unidades
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.9fr)]">
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              ref={searchRef}
              autoFocus
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && searchResults.length > 0) {
                  event.preventDefault();
                  setHighlightedIndex(
                    Math.min(activeSearchIndex + 1, searchResults.length - 1),
                  );
                } else if (event.key === "ArrowUp" && searchResults.length > 0) {
                  event.preventDefault();
                  setHighlightedIndex(Math.max(activeSearchIndex - 1, 0));
                } else if (event.key === "Enter" && searchResults.length > 0) {
                  event.preventDefault();
                  addProduct(searchResults[activeSearchIndex]);
                }
              }}
              placeholder="Buscar repuesto por código o descripción..."
              aria-label="Buscar repuesto"
              className={`${inputClass} pl-10`}
            />
            <div className="mt-3 max-h-[460px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
              {loading ? (
                <p className="px-3 py-8 text-center text-sm text-slate-400">
                  Cargando catálogo de repuestos...
                </p>
              ) : searchResults.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-slate-400">
                  No se encontraron repuestos que coincidan con “{search}”.
                </p>
              ) : (
                searchResults.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    disabled={product.existencia <= 0}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => addProduct(product)}
                    className={`flex w-full items-center justify-between gap-4 border-b border-slate-800 px-3 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-40 ${
                      activeSearchIndex === index
                        ? "border-l-4 border-l-amber-500 bg-amber-500/15 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="rounded bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-bold text-amber-400">
                          {product.codigo}
                        </span>
                        <span className="text-xs text-slate-500">
                          {product.categoriaNombre}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-sm font-medium">
                        {product.descripcion}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold text-white">
                        {formatearMoneda(product.precio)}
                      </span>
                      <span
                        className={`text-xs ${
                          product.existencia <= 0
                            ? "text-red-400"
                            : "text-slate-500"
                        }`}
                      >
                        Stock: {product.existencia} u.
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Detalle de factura
            </h2>
            <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
              {cart.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-amber-400">
                      {product.codigo}
                    </p>
                    <p className="truncate text-xs text-slate-200">
                      {product.descripcion}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatearMoneda(product.precio)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Quitar una unidad de ${product.descripcion}`}
                      onClick={() => setQuantity(product.id, quantity - 1)}
                      className="rounded bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Agregar una unidad de ${product.descripcion}`}
                      onClick={() => setQuantity(product.id, quantity + 1)}
                      className="rounded bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Eliminar ${product.descripcion}`}
                      onClick={() =>
                        setCart((current) =>
                          current.filter((item) => item.product.id !== product.id),
                        )
                      }
                      className="ml-1 rounded p-1.5 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  El carrito está vacío. Seleccioná repuestos de la izquierda.
                </p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-200">Cobro</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(
                [
                  ["contado", "Efectivo"],
                  ["tarjeta", "Tarjeta"],
                  ["cuenta_corriente", "Cuenta cte."],
                ] as const
              ).map(([method, label]) => (
                <button
                  key={method}
                  type="button"
                  disabled={
                    method === "cuenta_corriente" &&
                    !selectedCustomer?.cuentaCorriente
                  }
                  onClick={() => {
                    setPaymentMethod(method);
                    setError(null);
                  }}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                    paymentMethod === method
                      ? "border-amber-400 bg-amber-500 text-slate-950"
                      : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "contado" && (
            <div>
              <label className="mb-1.5 block text-sm text-slate-300">
                Efectivo recibido <span className="text-slate-500">(opcional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashReceived}
                onChange={(event) => setCashReceived(event.target.value)}
                placeholder="Dejar vacío para importe exacto"
                className={inputClass}
              />
              {cashChange !== null && cashChange >= 0 && (
                <p className="mt-2 text-sm text-slate-400">
                  Vuelto:{" "}
                  <span className="font-semibold text-emerald-300">
                    {formatearMoneda(cashChange)}
                  </span>
                </p>
              )}
            </div>
          )}

          {paymentMethod === "tarjeta" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-300">
                Tipo
                <select
                  value={cardType}
                  onChange={(event) =>
                    setCardType(event.target.value as "debito" | "credito")
                  }
                  className={`${inputClass} mt-1.5`}
                >
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                </select>
              </label>
              <label className="text-sm text-slate-300">
                Marca
                <input
                  value={cardBrand}
                  onChange={(event) => setCardBrand(event.target.value)}
                  placeholder="Visa, Mastercard..."
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              <label className="text-sm text-slate-300 sm:col-span-2">
                Últimos 4 dígitos del cupón
                <input
                  inputMode="numeric"
                  maxLength={4}
                  value={cardLastFour}
                  onChange={(event) =>
                    setCardLastFour(event.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="1234"
                  className={`${inputClass} mt-1.5`}
                />
                <span className="mt-1 block text-xs text-slate-500">
                  No ingreses el número completo de la tarjeta ni el CVV.
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm text-slate-300">
              Cliente{" "}
              {paymentMethod !== "cuenta_corriente" && (
                <span className="text-slate-500">(opcional)</span>
              )}
            </label>
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className={inputClass}
            >
              <option value="">
                {paymentMethod === "cuenta_corriente"
                  ? "Seleccionar taller..."
                  : "Consumidor final"}
              </option>
              {customers
                .filter(
                  (customer) =>
                    paymentMethod !== "cuenta_corriente" ||
                    customer.cuentaCorriente,
                )
                .map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.nombre} · {customer.nroDoc}
                  </option>
                ))}
            </select>
          </div>

          {paymentMethod === "cuenta_corriente" && selectedCustomer && (
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-700 bg-slate-950 p-3 text-center">
              <div>
                <p className="text-[11px] text-slate-500">Límite</p>
                <p className="mt-1 text-xs font-semibold text-white">
                  {formatearMoneda(creditLimit)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Deuda</p>
                <p className="mt-1 text-xs font-semibold text-amber-300">
                  {formatearMoneda(selectedCustomer.saldoActual)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Disponible</p>
                <p className="mt-1 text-xs font-semibold text-emerald-300">
                  {formatearMoneda(creditAvailable)}
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-end justify-between">
              <span className="text-sm text-slate-400">Total de la venta</span>
              <span className="text-3xl font-bold text-white">
                {formatearMoneda(total)}
              </span>
            </div>
            <button
              type="button"
              onClick={submitSale}
              disabled={submitting || loading || cart.length === 0}
              className="mt-4 w-full rounded-lg bg-amber-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Registrando venta..." : "Confirmar venta"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
