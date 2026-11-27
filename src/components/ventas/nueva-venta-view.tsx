"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { apiFetch, pesosAcentavos } from "@/lib/api-client";
import { formatearMoneda, formatearNumeroFactura } from "@/lib/format";
import { crearClienteSchema } from "@/lib/schemas/clientes";

type Product = {
  id: number;
  codigo: string;
  descripcion: string;
  categoriaNombre: string;
  precio: number;
  existencia: number;
};
type ProductList = {
  items: Product[];
};

type Customer = {
  id: number;
  nombre: string;
  nroDoc: string;
  cuentaCorriente: boolean;
  limiteCredito: number | null;
  saldoActual: number;
};
type CustomerList = { items: Customer[] };

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
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    tipoDoc: "DNI" as "DNI" | "CUIT",
    nroDoc: "",
    nombre: "",
    domicilio: "",
    telefono: "",
    email: "",
    cuentaCorriente: false,
    limiteCredito: "",
  });
  const searchRef = useRef<HTMLInputElement>(null);
  const customerSelectRef = useRef<HTMLSelectElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  const submitSaleRef = useRef<() => Promise<void>>(async () => {});

  const refreshData = useCallback(async () => {
    const [productData, customerData] = await Promise.all([
      apiFetch<ProductList>("/api/productos?activos=true"),
      apiFetch<CustomerList>("/api/clientes?activos=true&pageSize=100"),
    ]);
    setProducts(productData.items);
    setCustomers(customerData.items);
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
    function handleShortcuts(event: KeyboardEvent) {
      if (customerModalOpen) return;
      if (event.key === "F2") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (event.key === "F4") {
        event.preventDefault();
        customerSelectRef.current?.focus();
        customerSelectRef.current?.click();
      } else if (event.key === "F8") {
        event.preventDefault();
        paymentRef.current?.focus();
      } else if (event.key === "F9") {
        event.preventDefault();
        void submitSaleRef.current();
      }
    }

    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [customerModalOpen]);

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
  const cashAmountCents = cashReceived.trim()
    ? pesosAcentavos(cashReceived)
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
    if (submitting) return;
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

  useEffect(() => {
    submitSaleRef.current = submitSale;
  });

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const limiteCredito = customerForm.cuentaCorriente
      ? pesosAcentavos(customerForm.limiteCredito)
      : null;
    if (
      customerForm.cuentaCorriente &&
      (limiteCredito === null || limiteCredito < 0)
    ) {
      setError("Ingresá un límite de crédito válido para la cuenta corriente.");
      return;
    }

    const validation = crearClienteSchema.safeParse({
      tipoDoc: customerForm.tipoDoc,
      nroDoc: customerForm.nroDoc,
      nombre: customerForm.nombre,
      domicilio: customerForm.domicilio || null,
      telefono: customerForm.telefono || null,
      email: customerForm.email || null,
      cuentaCorriente: customerForm.cuentaCorriente,
      limiteCredito,
    });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Revisá los datos del cliente.");
      return;
    }

    setCreatingCustomer(true);
    try {
      const created = await apiFetch<Customer>("/api/clientes", {
        method: "POST",
        body: JSON.stringify(validation.data),
      });
      await refreshData();
      setCustomerId(String(created.id));
      setCustomerForm({
        tipoDoc: "DNI",
        nroDoc: "",
        nombre: "",
        domicilio: "",
        telefono: "",
        email: "",
        cuentaCorriente: false,
        limiteCredito: "",
      });
      setCustomerModalOpen(false);
      setNotice("Cliente creado y seleccionado. La venta actual se conservó.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo crear el cliente.",
      );
    } finally {
      setCreatingCustomer(false);
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
            Atajos: F2 producto · F4 cliente · F8 pago · F9 confirmar.
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
            <div
              ref={paymentRef}
              tabIndex={-1}
              aria-label="Forma de pago"
              className="mt-3 grid grid-cols-3 gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
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
            <div className="flex gap-2">
              <select
                ref={customerSelectRef}
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
                className={inputClass}
              >
                <option value="">
                  {paymentMethod === "cuenta_corriente"
                    ? "Seleccionar cliente..."
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
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setCustomerModalOpen(true);
                }}
                className="shrink-0 rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                + Cliente
              </button>
            </div>
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
            <p className="mt-2 text-center text-xs text-slate-500">
              Al confirmar se valida el stock y se asigna el número de factura. F9
            </p>
          </div>
        </section>
      </div>

      <Modal
        open={customerModalOpen}
        title="Nuevo cliente"
        onClose={() => setCustomerModalOpen(false)}
        className="max-w-2xl"
      >
        <form onSubmit={createCustomer} className="space-y-4">
          <p className="text-sm text-slate-500">
            Crear el cliente no descarta ni modifica los productos de la venta actual.
          </p>
          <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
            <label className="text-sm font-medium text-slate-300">
              Tipo
              <select
                value={customerForm.tipoDoc}
                onChange={(event) =>
                  setCustomerForm({
                    ...customerForm,
                    tipoDoc: event.target.value as "DNI" | "CUIT",
                  })
                }
                className={`${inputClass} mt-1.5`}
              >
                <option value="DNI">DNI</option>
                <option value="CUIT">CUIT</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-300">
              Número de documento
              <input
                required
                value={customerForm.nroDoc}
                onChange={(event) =>
                  setCustomerForm({ ...customerForm, nroDoc: event.target.value })
                }
                className={`${inputClass} mt-1.5`}
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-300">
            Nombre o razón social
            <input
              required
              value={customerForm.nombre}
              onChange={(event) =>
                setCustomerForm({ ...customerForm, nombre: event.target.value })
              }
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Domicilio (opcional)
            <input
              value={customerForm.domicilio}
              onChange={(event) =>
                setCustomerForm({ ...customerForm, domicilio: event.target.value })
              }
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-300">
              Teléfono (opcional)
              <input
                value={customerForm.telefono}
                onChange={(event) =>
                  setCustomerForm({ ...customerForm, telefono: event.target.value })
                }
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <label className="text-sm font-medium text-slate-300">
              Email (opcional)
              <input
                type="email"
                value={customerForm.email}
                onChange={(event) =>
                  setCustomerForm({ ...customerForm, email: event.target.value })
                }
                className={`${inputClass} mt-1.5`}
              />
            </label>
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-slate-700 p-3 text-sm">
            <input
              type="checkbox"
              checked={customerForm.cuentaCorriente}
              onChange={(event) =>
                setCustomerForm({
                  ...customerForm,
                  cuentaCorriente: event.target.checked,
                  limiteCredito: event.target.checked
                    ? customerForm.limiteCredito
                    : "",
                })
              }
              className="mt-1 accent-amber-500"
            />
            <span>
              <span className="block font-medium text-slate-200">
                Habilitar cuenta corriente
              </span>
              <span className="text-xs text-slate-500">
                Permite realizar ventas a crédito.
              </span>
            </span>
          </label>
          {customerForm.cuentaCorriente && (
            <label className="block text-sm font-medium text-slate-300">
              Límite de crédito
              <input
                required
                inputMode="decimal"
                value={customerForm.limiteCredito}
                onChange={(event) =>
                  setCustomerForm({
                    ...customerForm,
                    limiteCredito: event.target.value,
                  })
                }
                placeholder="0,00"
                className={`${inputClass} mt-1.5`}
              />
            </label>
          )}
          {error && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setCustomerModalOpen(false)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creatingCustomer}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {creatingCustomer ? "Creando..." : "Crear cliente"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
