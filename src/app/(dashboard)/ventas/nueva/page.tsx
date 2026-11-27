"use client";

import Link from "next/link";
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, EmptyState, ErrorBanner, Field, Loading, PageHeader, Panel, SelectInput, TextInput } from "@/components/app-ui";
import { api, errorText, formatMoney, moneyToCents } from "@/components/data-client";
import { notifyToast } from "@/components/toast";

type Product = { id: number; codigo: string; descripcion: string; precio: number; existencia: number; activo: boolean };
type Customer = { id: number; nombre: string; nroDoc: string; cuentaCorriente: boolean; activo: boolean };
type CartLine = { product: Product; quantity: number };

export default function NewSalePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [payment, setPayment] = useState("contado");
  const [received, setReceived] = useState("");
  const [cardType, setCardType] = useState("debito");
  const [cardBrand, setCardBrand] = useState("");
  const [lastFour, setLastFour] = useState("");
  useEffect(() => {
    Promise.all([api<Product[]>("/api/productos?estado=activos"), api<Customer[]>("/api/clientes?estado=activos")])
      .then(([productRows, customerRows]) => { setProducts(productRows); setCustomers(customerRows); })
      .catch((reason) => setError(errorText(reason)))
      .finally(() => setLoading(false));
  }, []);

  const total = useMemo(() => cart.reduce((sum, line) => sum + line.product.precio * line.quantity, 0), [cart]);
  const availableProducts = products.filter((product) => product.activo && product.existencia > 0 && `${product.descripcion} ${product.codigo}`.toLowerCase().includes(query.toLowerCase()));
  const selectedCustomer = customers.find((customer) => String(customer.id) === customerId);

  function addProduct(product: Product) {
    setCart((lines) => {
      const existing = lines.find((line) => line.product.id === product.id);
      if (existing) return lines.map((line) => line.product.id === product.id ? { ...line, quantity: Math.min(line.quantity + 1, product.existencia) } : line);
      return [...lines, { product, quantity: 1 }];
    });
  }
  function quantityFor(productId: number, step: number) {
    setCart((lines) => lines.flatMap((line) => {
      if (line.product.id !== productId) return [line];
      const quantity = line.quantity + step;
      return quantity <= 0 ? [] : [{ ...line, quantity: Math.min(quantity, line.product.existencia) }];
    }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!cart.length) { setError("Agregá al menos un producto a la venta."); return; }
    if (payment === "cuenta_corriente" && !customerId) { setError("Seleccioná un cliente para cargar la venta en cuenta corriente."); return; }
    const body: Record<string, unknown> = {
      clienteId: customerId ? Number(customerId) : null,
      formaPago: payment,
      items: cart.map((line) => ({ productoId: line.product.id, cantidad: line.quantity })),
    };
    if (payment === "contado") body.montoRecibido = received ? moneyToCents(received) : total;
    if (payment === "tarjeta") {
      body.tarjetaTipo = cardType;
      body.tarjetaMarca = cardBrand.trim();
      body.tarjetaUltimos4 = lastFour;
    }
    setSaving(true);
    try {
      const invoice = await api<{ numero?: number }>("/api/facturas", { method: "POST", body: JSON.stringify(body) });
      notifyToast(`Venta registrada${invoice.numero ? ` · Comprobante #${invoice.numero}` : ""}.`);
      setCart([]);
      setCustomerId("");
      setPayment("contado");
      setReceived("");
    } catch (reason) {
      const message = errorText(reason);
      setError(message);
      notifyToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader eyebrow="VENTAS" title="Nueva venta" description="Seleccioná productos, revisá el total y registrá el pago." action={<Link href="/ventas" className="button button-secondary"><ArrowLeft size={16} /> Volver a ventas</Link>} />
      {error && <ErrorBanner message={error} />}
      {loading ? <Loading label="Cargando catálogo..." /> : (
        <form className="sale-layout" onSubmit={submit}>
          <div className="sale-products">
            <Panel title="Catálogo" detail={`${products.filter((product) => product.activo).length} productos disponibles`}>
              <div className="search-field sale-search"><ShoppingCart size={17} /><TextInput placeholder="Buscar por nombre o código..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
              <div className="product-picker">
                {availableProducts.length === 0 ? <EmptyState title="No encontramos productos" detail="Revisá la búsqueda o el stock disponible." /> : availableProducts.map((product) => <button key={product.id} type="button" className="picker-product" onClick={() => addProduct(product)}><span className="picker-product-icon">{product.descripcion.slice(0, 1)}</span><span className="picker-product-main"><strong>{product.descripcion}</strong><small>{product.codigo} · Stock: {product.existencia}</small></span><span className="picker-product-price">{formatMoney(product.precio)}</span><Plus size={16} /></button>)}
              </div>
            </Panel>
          </div>
          <div className="sale-summary-column">
            <Panel title="Detalle de venta" detail={`${cart.reduce((sum, line) => sum + line.quantity, 0)} unidades`}>
              {cart.length === 0 ? <div className="cart-empty"><ShoppingCart size={24} /><span>Tu venta está vacía</span><small>Elegí productos del catálogo para empezar.</small></div> : <div className="cart-lines">{cart.map(({ product, quantity }) => <div className="cart-line" key={product.id}><div className="cart-line-title"><strong>{product.descripcion}</strong><small>{formatMoney(product.precio)} c/u</small></div><div className="quantity-control"><button type="button" aria-label="Restar cantidad" onClick={() => quantityFor(product.id, -1)}><Minus size={13} /></button><span>{quantity}</span><button type="button" aria-label="Sumar cantidad" disabled={quantity >= product.existencia} onClick={() => quantityFor(product.id, 1)}><Plus size={13} /></button></div><strong className="cart-line-total">{formatMoney(product.precio * quantity)}</strong><button type="button" className="icon-button cart-remove" aria-label={`Quitar ${product.descripcion}`} onClick={() => setCart((lines) => lines.filter((line) => line.product.id !== product.id))}><Trash2 size={15} /></button></div>)}</div>}
              <div className="cart-total"><span>Total a pagar</span><strong>{formatMoney(total)}</strong></div>
              <div className="sale-form-fields">
                <Field label="Cliente (opcional)"><SelectInput value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Consumidor final</option>{customers.filter((customer) => customer.activo).map((customer) => <option value={customer.id} key={customer.id}>{customer.nombre} · {customer.nroDoc}</option>)}</SelectInput></Field>
                <Field label="Forma de pago"><SelectInput value={payment} onChange={(event) => setPayment(event.target.value)}><option value="contado">Efectivo / contado</option><option value="tarjeta">Tarjeta</option>{selectedCustomer?.cuentaCorriente && <option value="cuenta_corriente">Cuenta corriente</option>}</SelectInput></Field>
                {payment === "contado" && <Field label="Monto recibido ($)" hint="Si queda vacío, se considera el importe exacto."><TextInput type="number" min={0} step="0.01" value={received} onChange={(event) => setReceived(event.target.value)} placeholder={(total / 100).toFixed(2)} /></Field>}
                {payment === "tarjeta" && <div className="card-payment-fields"><Field label="Tipo"><SelectInput value={cardType} onChange={(event) => setCardType(event.target.value)}><option value="debito">Débito</option><option value="credito">Crédito</option></SelectInput></Field><Field label="Marca"><TextInput required maxLength={40} value={cardBrand} onChange={(event) => setCardBrand(event.target.value)} placeholder="Visa, Mastercard..." /></Field><Field label="Últimos 4 dígitos"><TextInput required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={lastFour} onChange={(event) => setLastFour(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="0000" /></Field></div>}
              </div>
              <Button type="submit" className="complete-sale-button" disabled={saving || !cart.length}>{saving ? "Registrando venta..." : "Confirmar venta"}</Button>
            </Panel>
          </div>
        </form>
      )}
    </div>
  );
}
